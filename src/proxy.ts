import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'ypti_erp_session';

const OPERATOR_ALLOWED_API_PREFIXES = [
  '/api/auth',
  '/api/operator',
  '/api/loan-requests',
  '/api/handovers',
  '/api/tools',
  '/api/inventories',
  '/api/employees',
  '/api/categories',
  '/api/tool-units',
];

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

  let parsedRole: string | null = null;
  if (sessionCookie) {
    try {
      const parsed = JSON.parse(sessionCookie);
      parsedRole = parsed?.role || null;
    } catch {
      parsedRole = null;
    }
  }

  // 2. Jika sudah login dan mencoba mengakses halaman login, alihkan sesuai peran
  if (pathname === '/login') {
    if (sessionCookie && parsedRole) {
      const dest = parsedRole === 'OPERATOR' ? '/operator' : '/';
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  // 3. Jika belum login dan mengakses halaman privat atau API mutasi privat
  if (!sessionCookie || !parsedRole) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Akses ditolak. Sesi autentikasi tidak ditemukan.' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 4. Isolasi portal khusus peran OPERATOR
  if (parsedRole === 'OPERATOR') {
    if (pathname.startsWith('/api/')) {
      const allowed = OPERATOR_ALLOWED_API_PREFIXES.some((prefix) =>
        pathname.startsWith(prefix)
      );
      if (!allowed) {
        return NextResponse.json(
          { error: 'Akses ditolak. Endpoint ini khusus petugas Admin Tool Room.' },
          { status: 403 }
        );
      }
      return NextResponse.next();
    }

    const isAllowedPage =
      pathname === '/operator' ||
      pathname.startsWith('/operator/') ||
      pathname === '/help';

    if (!isAllowedPage) {
      return NextResponse.redirect(new URL('/operator', request.url));
    }
    return NextResponse.next();
  }

  // 5. Pembatasan akses khusus Super Admin (Manajemen Akun Pengguna)
  if (pathname.startsWith('/users') || pathname.startsWith('/api/users')) {
    if (parsedRole !== 'SUPER_ADMIN') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Akses ditolak. Hanya Super Admin yang berhak mengelola akun pengguna.' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
