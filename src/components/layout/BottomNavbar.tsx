'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeftRight,
  ClipboardList,
  FilePlus2,
  Home,
  LayoutDashboard,
  RotateCcw,
  ScanBarcode,
  type LucideIcon,
} from 'lucide-react';

interface BottomNavbarProps {
  userRole: string;
  pendingRequestsCount?: number;
  operatorPendingCount?: number;
}

interface NavTabItem {
  key: string;
  label: string;
  href: string;
  count?: number;
  icon: LucideIcon;
}

function isRouteMatch(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/operator') return pathname === '/operator';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNavbar({
  userRole,
  pendingRequestsCount = 0,
  operatorPendingCount = 0,
}: BottomNavbarProps) {
  const pathname = usePathname();
  const isOperator = userRole === 'OPERATOR';

  const tabs: NavTabItem[] = isOperator
    ? [
        {
          key: 'operator-dashboard',
          label: 'Dasbor',
          href: '/operator',
          count: operatorPendingCount,
          icon: LayoutDashboard,
        },
        {
          key: 'operator-request',
          label: 'Request',
          href: '/operator/request',
          icon: FilePlus2,
        },
        {
          key: 'operator-handover',
          label: 'Oper Shift',
          href: '/operator/handover',
          icon: ArrowLeftRight,
        },
      ]
    : [
        {
          key: 'admin-home',
          label: 'Beranda',
          href: '/',
          icon: Home,
        },
        {
          key: 'admin-scan',
          label: 'Scan',
          href: '/scan-tool',
          icon: ScanBarcode,
        },
        {
          key: 'admin-requests',
          label: 'Request',
          href: '/requests',
          count: pendingRequestsCount,
          icon: ClipboardList,
        },
        {
          key: 'admin-returns',
          label: 'Kembali',
          href: '/returns',
          icon: RotateCcw,
        },
      ];

  return (
    <nav
      aria-label="Navigasi Utama Mobile"
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden print:hidden bg-white border-t border-[#E2E8F0] shadow-[0_-2px_10px_rgba(11,19,43,0.04)]"
      style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
    >
      <div className="max-w-[680px] md:max-w-[760px] mx-auto w-full flex items-stretch min-h-[54px] md:min-h-[60px] px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = isRouteMatch(pathname, tab.href);

          const countSuffix =
            typeof tab.count === 'number' && tab.count > 0
              ? ` (${tab.count > 99 ? '99+' : tab.count})`
              : '';

          const accessibleLabel =
            typeof tab.count === 'number' && tab.count > 0
              ? `${tab.label}, ${tab.count} menunggu`
              : tab.label;

          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-label={accessibleLabel}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex-1 min-w-0 flex flex-col items-center justify-center pt-2 pb-1 gap-0.5 transition-opacity active:opacity-70 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1E40AF]"
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-9 h-[2.5px] bg-[#1E40AF]"
                />
              )}
              <Icon
                aria-hidden="true"
                strokeWidth={isActive ? 2.2 : 1.75}
                className={`w-[21px] h-[21px] md:w-6 md:h-6 shrink-0 transition-colors ${
                  isActive ? 'text-[#1E40AF]' : 'text-slate-500'
                }`}
              />
              <span
                className={`text-[11px] md:text-xs leading-[14px] tracking-[0.01em] whitespace-nowrap truncate max-w-full text-center tabular-nums ${
                  isActive
                    ? 'text-[#1E40AF] font-semibold'
                    : 'text-slate-500 font-medium'
                }`}
              >
                {tab.label}
                {countSuffix}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
