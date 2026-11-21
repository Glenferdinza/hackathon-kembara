'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNavbar } from './BottomNavbar';

export interface ActiveUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  employeeId?: string | null;
  employeeNik?: string | null;
}

const isOperatorAllowedRoute = (path: string) =>
  path === '/operator' ||
  path.startsWith('/operator/') ||
  path === '/help' ||
  path === '/download';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [overdueCount, setOverdueCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [operatorPendingCount, setOperatorPendingCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<ActiveUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }

  useEffect(() => {
    let active = true;

    const verifyAuthAndStats = async () => {
      // 1. Cek cache session client untuk loading instan
      let hasLocalSession = false;
      if (typeof window !== 'undefined') {
        try {
          const cached = sessionStorage.getItem('ypti_erp_active_user');
          if (cached) {
            const parsed = JSON.parse(cached) as ActiveUser;
            if (parsed?.id) {
              if (parsed.role === 'OPERATOR' && !isOperatorAllowedRoute(pathname)) {
                router.replace('/operator');
                return;
              }
              if (pathname === '/users' && parsed.role !== 'SUPER_ADMIN') {
                router.replace(parsed.role === 'OPERATOR' ? '/operator' : '/');
                return;
              }
              if (active) {
                setCurrentUser(parsed);
                setAuthChecked(true);
              }
              hasLocalSession = true;
            }
          }
        } catch {
          // ignore
        }
      }

      try {
        const authRes = await fetch('/api/auth');
        if (!active) return;
        if (authRes.ok) {
          const authJson = await authRes.json();
          if (!active) return;
          if (!authJson.user) {
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('ypti_erp_active_user');
            }
            router.replace('/login');
            return;
          }

          const user: ActiveUser = authJson.user;
          setCurrentUser(user);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('ypti_erp_active_user', JSON.stringify(user));
          }

          // Proteksi rute portal Operator
          if (user.role === 'OPERATOR' && !isOperatorAllowedRoute(pathname)) {
            router.replace('/operator');
            return;
          }

          // Proteksi rute khusus Super Admin (Manajemen Akun Pengguna)
          if (pathname === '/users' && user.role !== 'SUPER_ADMIN') {
            router.replace(user.role === 'OPERATOR' ? '/operator' : '/');
            return;
          }

          setAuthChecked(true);

          if (user.role === 'OPERATOR') {
            fetch('/api/operator/summary?countOnly=true')
              .then((res) => (res.ok ? res.json() : null))
              .then((json) => {
                if (active && typeof json?.pendingActionCount === 'number') {
                  setOperatorPendingCount(json.pendingActionCount);
                }
              })
              .catch(() => {});
          } else {
            // Ambil notifikasi keterlambatan & antrean request secara non-blocking di latar belakang
            fetch('/api/dashboard')
              .then((res) => (res.ok ? res.json() : null))
              .then((json) => {
                if (active && json?.kpi && typeof json.kpi.overdueLoansCount === 'number') {
                  setOverdueCount(json.kpi.overdueLoansCount);
                }
              })
              .catch(() => {});

            fetch('/api/loan-requests?countOnly=true')
              .then((res) => (res.ok ? res.json() : null))
              .then((json) => {
                if (active && typeof json?.waitingAdminCount === 'number') {
                  setPendingRequestsCount(json.waitingAdminCount);
                }
              })
              .catch(() => {});
          }
        } else {
          if (!hasLocalSession) {
            router.replace('/login');
            return;
          }
        }
      } catch {
        if (active) setAuthChecked(true);
      }
    };

    const timer = window.setTimeout(() => {
      if (active) void verifyAuthAndStats();
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [pathname, router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 gap-3">
        <svg
          className="animate-spin h-6 w-6 text-[#1E40AF]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-20"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-90"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-xs font-medium text-slate-500 tracking-tight">
          Memuat sesi akses sistem...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col overflow-x-clip">
      <Sidebar
        isOpen={desktopSidebarOpen}
        isMobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        overdueCount={overdueCount}
        pendingRequestsCount={pendingRequestsCount}
        operatorPendingCount={operatorPendingCount}
        userRole={currentUser?.role || 'SUPER_ADMIN'}
      />

      <div
        className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out ${
          desktopSidebarOpen ? 'lg:pl-64' : 'lg:pl-0'
        }`}
        style={{
          transition: 'padding-left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Header
          onToggleSidebar={() => setDesktopSidebarOpen((prev) => !prev)}
          userName={currentUser?.name}
          userRole={currentUser?.role}
        />
        <main className="flex-1 min-w-0 px-3 sm:px-6 lg:px-8 pt-4 sm:pt-5 pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      <BottomNavbar
        userRole={currentUser?.role || 'SUPER_ADMIN'}
        pendingRequestsCount={pendingRequestsCount}
        operatorPendingCount={operatorPendingCount}
        isMenuOpen={mobileMenuOpen}
        onToggleMenu={() => setMobileMenuOpen((prev) => !prev)}
      />
    </div>
  );
}
