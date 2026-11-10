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

    const verifyAuthAndStats = async () => {
      try {
        const authRes = await fetch('/api/auth');
        if (authRes.ok) {
          const authJson = await authRes.json();
          if (!authJson.user) {
            router.replace('/login');
            return;
          }

          const user: ActiveUser = authJson.user;
          setCurrentUser(user);

          // Proteksi rute khusus Super Admin (Manajemen Akun Pengguna)
          if (pathname === '/users' && user.role !== 'SUPER_ADMIN') {
            router.replace('/');
            return;
          }

          setAuthChecked(true);
        } else {
          router.replace('/login');
          return;
        }

        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const json = await res.json();
          if (json.kpi && typeof json.kpi.overdueLoansCount === 'number') {
            setOverdueCount(json.kpi.overdueLoansCount);
          }
        }
      } catch {
        setAuthChecked(true);
      }
    };

    verifyAuthAndStats();
  }, [pathname, router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <span className="text-xs font-medium text-slate-500">Memuat sesi akses sistem...</span>
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
