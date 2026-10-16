'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppShell({ children }: { children: React.ReactNode }) {
  // isPinned determines if the sidebar is in permanent solid mode (taking lg:pl-64)
  const [isPinned, setIsPinned] = useState(true);
  // isHovered determines if the sidebar is temporarily peeking open on hover
  const [isHovered, setIsHovered] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Default unpinned on small screens (< 1024px)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsPinned(false);
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

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (!isPinned) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 250);
  };

  const handleTogglePin = () => {
    setIsPinned((prev) => !prev);
    setIsHovered(false);
  };

  const handleClose = () => {
    setIsPinned(false);
    setIsHovered(false);
  };

  // The sidebar is visible if either pinned (solid) or hovered (peek)
  const isOpen = isPinned || isHovered;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Left Edge Hover Trigger Strip (when unpinned, hover far left to peek) */}
      {!isPinned && (
        <div
          className="fixed top-0 bottom-0 left-0 w-3.5 z-30 pointer-events-auto"
          onMouseEnter={handleMouseEnter}
        />
      )}

      {/* Left Sidebar with Hover Peek & Pin Support */}
      <Sidebar
        isOpen={isOpen}
        isPinned={isPinned}
        onClose={handleClose}
        onTogglePin={handleTogglePin}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        overdueCount={overdueCount}
      />

      {/* Main Content Area: in solid pinned mode takes lg:pl-64, when unpinned gives 100% width */}
      <div
        className={`flex flex-col flex-1 min-w-0 transition-[padding] duration-200 ease-in-out ${
          isPinned ? 'lg:pl-64' : 'lg:pl-0'
        }`}
      >
        <Header
          sidebarOpen={isOpen}
          isPinned={isPinned}
          onToggleSidebar={handleTogglePin}
          onMouseEnterSidebar={handleMouseEnter}
        />
        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
