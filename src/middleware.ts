import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-mystic-secret-key-123';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  // If the user is trying to access an /admin route (excluding /admin/login)
  if (request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin/login')) {
    const sessionCookie = request.cookies.get('admin-session');
    
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      await jwtVerify(sessionCookie.value, encodedSecret, { algorithms: ['HS256'] });
    } catch (error) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // If the user is already logged in and tries to access /admin/login, redirect to /admin/products
  if (request.nextUrl.pathname.startsWith('/admin/login')) {
    const sessionCookie = request.cookies.get('admin-session');
    if (sessionCookie) {
      try {
        await jwtVerify(sessionCookie.value, encodedSecret, { algorithms: ['HS256'] });
        return NextResponse.redirect(new URL('/admin/products', request.url));
      } catch (error) {
        // Invalid token, let them access login
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
