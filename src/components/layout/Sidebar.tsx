'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HelpCircle, Download } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  overdueCount?: number;
  pendingRequestsCount?: number;
  operatorPendingCount?: number;
  isOpen?: boolean;
  isMobileOpen?: boolean;
  onClose?: () => void;
  userRole?: string;
}

interface NavItem {
  label: string;
  href: string;
  badge?: string;
  badgeColor?: string;
  allowedRoles: string[];
}

export function Sidebar({
  overdueCount = 0,
  pendingRequestsCount = 0,
  operatorPendingCount = 0,
  isOpen = true,
  isMobileOpen = false,
  onClose,
  userRole = 'SUPER_ADMIN',
}: SidebarProps) {
  const pathname = usePathname();

  const navGroups: { group: string; items: NavItem[] }[] = [
    {
      group: 'PORTAL OPERATOR',
      items: [
        {
          label: 'Dasbor Operator',
          href: '/operator',
          badge: operatorPendingCount > 0 ? `${operatorPendingCount}` : undefined,
          allowedRoles: ['OPERATOR'],
        },
        {
          label: 'Request Pinjam Tool',
          href: '/operator/request',
          allowedRoles: ['OPERATOR'],
        },
        {
          label: 'Pengalihan Shift',
          href: '/operator/handover',
          allowedRoles: ['OPERATOR'],
        },
      ],
    },
    {
      group: 'MENU UTAMA',
      items: [
        {
          label: 'Beranda',
          href: '/',
          allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
        },
        {
          label: 'Cek Barcode & Umur Tool',
          href: '/scan-tool',
          allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
        },
      ],
    },
    {
      group: 'DATA MASTER',
      items: [
        {
          label: 'Data Tool',
          href: '/master-tool',
          allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
        },
        {
          label: 'Data Inventaris',
          href: '/master-inventory',
          allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
        },
        {
          label: 'Data Karyawan',
          href: '/employees',
          allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
        },
      ],
    },
    {
      group: 'TRANSAKSI & OPERASIONAL',
      items: [
        {
          label: 'Antrean Request Pinjam',
          href: '/requests',
          badge: pendingRequestsCount > 0 ? `${pendingRequestsCount}` : undefined,
          allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
        },
        {
          label: 'Peminjaman',
          href: '/loans',
          allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
        },
        {
          label: 'Pengembalian',
          href: '/returns',
          allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
        },
      ],
    },
    {
      group: 'KONTROL & AUDIT',
      items: [
        {
          label: 'Monitoring Keterlambatan',
          href: '/monitoring',
          badge: overdueCount > 0 ? `${overdueCount}` : undefined,
          badgeColor: 'bg-slate-100 text-slate-800 border border-slate-200',
          allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
        },
        {
          label: 'Riwayat & Laporan',
          href: '/history',
          allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
        },
        {
          label: 'Manajemen Akun',
          href: '/users',
          allowedRoles: ['SUPER_ADMIN'],
        },
      ],
    },
  ];

  const visibleGroups = navGroups
    .map((grp) => ({
      ...grp,
      items: grp.items.filter((item) => item.allowedRoles.includes(userRole)),
    }))
    .filter((grp) => grp.items.length > 0);

  const closeMobileDrawer = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && onClose) {
      onClose();
    }
  };

  useEffect(() => {
    if (!isMobileOpen || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onClose]);

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-[35] lg:hidden print:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        id="mobile-navigation-drawer"
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-[#E2E8F0] flex flex-col print:hidden transition-transform duration-300 ease-in-out ${
          isMobileOpen
            ? 'translate-x-0 pointer-events-auto visible'
            : '-translate-x-full pointer-events-none invisible'
        } ${
          isOpen
            ? 'lg:translate-x-0 lg:pointer-events-auto lg:visible'
            : 'lg:-translate-x-full lg:pointer-events-none lg:invisible'
        }`}
      >
        <div className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-[#E2E8F0] bg-white shrink-0">
          <Link
            href={userRole === 'OPERATOR' ? '/operator' : '/'}
            onClick={closeMobileDrawer}
            className="flex items-center"
          >
            <Image
              src="/ypti-logo.png"
              alt="PT YPTI Logo"
              width={168}
              height={36}
              priority
              className="h-9 w-auto max-w-[168px] object-contain"
            />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu navigasi"
            className="lg:hidden px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded cursor-pointer"
          >
            Tutup
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {visibleGroups.map((grp) => (
            <div key={grp.group} className="space-y-1">
              <div className="px-3 text-[10px] font-heading font-bold tracking-wider text-slate-500 uppercase">
                {grp.group}
              </div>
              <div className="space-y-0.5">
                {grp.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobileDrawer}
                      className={`flex items-center justify-between px-3 py-2 rounded text-xs font-heading transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-[#1E40AF] font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className="text-[11px] font-bold text-slate-700 tabular-nums">
                          ({item.badge})
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div
          className="px-3 pt-2.5 border-t border-[#E2E8F0] bg-slate-50 lg:pb-3"
          style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
        >
          <div className="grid grid-cols-2 gap-1.5 lg:flex lg:items-center lg:justify-between">
            <div className="contents lg:flex lg:items-center lg:gap-1.5">
              <Link
                href="/help"
                onClick={closeMobileDrawer}
                aria-label="Panduan & Bantuan"
                className={`group relative flex items-center justify-center gap-1.5 min-h-[44px] lg:min-h-0 lg:w-9 lg:h-9 rounded border transition-colors ${
                  pathname === '/help'
                    ? 'bg-blue-50 text-[#1E40AF] border-blue-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <HelpCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="text-xs font-medium lg:hidden">Bantuan</span>
                <span className="hidden lg:block pointer-events-none absolute bottom-full left-0 mb-2 px-2 py-1 rounded bg-slate-900 text-white text-xs font-medium whitespace-nowrap shadow-sm opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity z-50">
                  Bantuan
                </span>
              </Link>

              <Link
                href="/download"
                onClick={closeMobileDrawer}
                aria-label="Unduh Aplikasi Desktop & PWA"
                className={`group relative flex items-center justify-center gap-1.5 min-h-[44px] lg:min-h-0 lg:w-9 lg:h-9 rounded border transition-colors ${
                  pathname === '/download'
                    ? 'bg-blue-50 text-[#1E40AF] border-blue-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-[#1E40AF]'
                }`}
              >
                <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="text-xs font-medium lg:hidden">Unduh App</span>
                <span className="hidden lg:block pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-slate-900 text-white text-xs font-medium whitespace-nowrap shadow-sm opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity z-50">
                  Unduh App
                </span>
              </Link>
            </div>

            <span className="hidden lg:inline text-[11px] font-medium text-slate-500 whitespace-nowrap">
              PT YPTI ERP
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
