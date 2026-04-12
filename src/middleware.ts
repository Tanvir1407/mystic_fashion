import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // If the user is trying to access an /admin route (excluding /admin/login)
  if (request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin/login')) {
    const authCookie = request.cookies.get('admin-auth');
    if (authCookie?.value !== 'true') {
      // Redirect to the login page if not authenticated
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // If the user is already logged in and tries to access /admin/login, redirect to /admin/products
  if (request.nextUrl.pathname.startsWith('/admin/login')) {
    const authCookie = request.cookies.get('admin-auth');
    if (authCookie?.value === 'true') {
      return NextResponse.redirect(new URL('/admin/products', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
