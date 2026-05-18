import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getRedirectUrlForSession } from './lib/permissions';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-mystic-secret-key-123';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  console.log(`[Middleware] Request Path: ${pathname}`);

  // If the user is trying to access an /admin route (excluding /admin/login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const sessionCookie = request.cookies.get('admin-session');
    console.log(`[Middleware] Admin Route Check. Cookie exists: ${!!sessionCookie}`);
    
    if (!sessionCookie) {
      console.log(`[Middleware] Redirecting to login (no cookie found)`);
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      await jwtVerify(sessionCookie.value, encodedSecret, { algorithms: ['HS256'] });
      console.log(`[Middleware] JWT verified successfully`);
    } catch (error) {
      console.error(`[Middleware] JWT verification failed:`, error);
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // If the user is already logged in and tries to access /admin/login, redirect to their permitted page
  if (pathname.startsWith('/admin/login')) {
    const sessionCookie = request.cookies.get('admin-session');
    if (sessionCookie) {
      console.log(`[Middleware] Login Page Check. Cookie exists: ${!!sessionCookie}`);
      try {
        const { payload } = await jwtVerify(sessionCookie.value, encodedSecret, { algorithms: ['HS256'] });
        const redirectUrl = getRedirectUrlForSession(payload);
        console.log(`[Middleware] Already logged in. Redirecting to ${redirectUrl}`);
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      } catch (error) {
        console.error(`[Middleware] Login Page JWT verification failed:`, error);
        // Invalid token, let them access login
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
