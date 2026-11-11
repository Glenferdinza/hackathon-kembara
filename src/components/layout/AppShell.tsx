'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export interface ActiveUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [overdueCount, setOverdueCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<ActiveUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }

    // 1. Cek cache session client untuk loading instan (0ms)
    let hasLocalSession = false;
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('ypti_erp_active_user');
        if (cached) {
          const parsed = JSON.parse(cached) as ActiveUser;
          if (parsed?.id) {
            setCurrentUser(parsed);
            setAuthChecked(true);
            hasLocalSession = true;

            // Proteksi rute khusus Super Admin
            if (pathname === '/users' && parsed.role !== 'SUPER_ADMIN') {
              router.replace('/');
              return;
            }
          }
        }
      } catch {
        // ignore
      }
    }

    const verifyAuthAndStats = async () => {
      try {
        const authRes = await fetch('/api/auth');
        if (authRes.ok) {
          const authJson = await authRes.json();
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

          // Proteksi rute khusus Super Admin (Manajemen Akun Pengguna)
          if (pathname === '/users' && user.role !== 'SUPER_ADMIN') {
            router.replace('/');
            return;
          }

          setAuthChecked(true);
        } else {
          if (!hasLocalSession) {
            router.replace('/login');
            return;
          }
        }

        // Ambil notifikasi keterlambatan secara non-blocking di latar belakang
        fetch('/api/dashboard')
          .then((res) => (res.ok ? res.json() : null))
          .then((json) => {
            if (json?.kpi && typeof json.kpi.overdueLoansCount === 'number') {
              setOverdueCount(json.kpi.overdueLoansCount);
            }
          })
          .catch(() => {});
      } catch {
        setAuthChecked(true);
      }
    };

    verifyAuthAndStats();
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        overdueCount={overdueCount}
        userRole={currentUser?.role || 'SUPER_ADMIN'}
      />

      <div
        className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'
        }`}
        style={{
          transition: 'padding-left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          userName={currentUser?.name}
          userRole={currentUser?.role}
        />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
