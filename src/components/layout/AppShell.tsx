'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    // Default closed on small screens (< 1024px)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }

    // Quick poll for overdue count to display in badge
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const json = await res.json();
          if (json.kpi && typeof json.kpi.overdueLoansCount === 'number') {
            setOverdueCount(json.kpi.overdueLoansCount);
          }
        }
      } catch {
        // silent
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Left Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        overdueCount={overdueCount}
      />

      {/* Main Content Area: expands smoothly to 100% width when sidebar is collapsed */}
      <div
        className={`flex flex-col flex-1 min-w-0 transition-[padding] duration-200 ease-in-out ${
          sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'
        }`}
      >
        <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
