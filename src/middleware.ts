import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getRedirectUrlForSession } from './lib/permissions';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-mystic-secret-key-123';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ── Admin routes ──────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const sessionCookie = request.cookies.get('admin-session');
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    try {
      await jwtVerify(sessionCookie.value, encodedSecret, { algorithms: ['HS256'] });
    } catch {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  if (pathname.startsWith('/admin/login')) {
    const sessionCookie = request.cookies.get('admin-session');
    if (sessionCookie) {
      try {
        const { payload } = await jwtVerify(sessionCookie.value, encodedSecret, { algorithms: ['HS256'] });
        const redirectUrl = getRedirectUrlForSession(payload);
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      } catch {
        // invalid token — let them access login
      }
    }
  }

  // ── Customer portal routes ────────────────────────────────────────────────
  if (pathname.startsWith('/account')) {
    const sessionCookie = request.cookies.get('customer-session');
    if (!sessionCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    try {
      await jwtVerify(sessionCookie.value, encodedSecret, { algorithms: ['HS256'] });
    } catch {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Staff portal routes ───────────────────────────────────────────────────
  if (pathname.startsWith('/staff') && !pathname.startsWith('/staff/login')) {
    const sessionCookie = request.cookies.get('staff-session');
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/staff/login', request.url));
    }
    try {
      await jwtVerify(sessionCookie.value, encodedSecret, { algorithms: ['HS256'] });
    } catch {
      return NextResponse.redirect(new URL('/staff/login', request.url));
    }
  }

  if (pathname.startsWith('/staff/login')) {
    const sessionCookie = request.cookies.get('staff-session');
    if (sessionCookie) {
      try {
        await jwtVerify(sessionCookie.value, encodedSecret, { algorithms: ['HS256'] });
        return NextResponse.redirect(new URL('/staff/dashboard', request.url));
      } catch {
        // invalid token — let them access login
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/staff/:path*', '/account/:path*'],
};
