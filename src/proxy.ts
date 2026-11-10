import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'ypti_erp_session';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;

  // 1. Abaikan berkas statis, favicon, logo, manifest, dan API publik auth
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json' ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.txt') ||
    pathname.endsWith('.webmanifest')
  ) {
    return NextResponse.next();
  }

  // 2. Jika sudah login dan mencoba mengakses halaman login, alihkan ke beranda
  if (pathname === '/login') {
    if (sessionCookie) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 3. Jika belum login dan mengakses halaman privat atau API mutasi privat
  if (!sessionCookie) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Akses ditolak. Sesi autentikasi tidak ditemukan.' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Cocokkan semua rute halaman aplikasi kecuali file publik
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
