'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useConfirm } from '@/components/ui/ConfirmDialog';

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
  const router = useRouter();
  const { confirm } = useConfirm();

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Konfirmasi Keluar dari Sistem',
      message: 'Apakah Anda yakin ingin keluar dari sesi aplikasi Tool Room PT YPTI?',
      confirmText: 'Keluar Sekarang',
      cancelText: 'Tetap di Sini',
      type: 'warning',
    });
    if (!ok) return;

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('ypti_erp_active_user');
      }
      await fetch('/api/auth', { method: 'DELETE' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

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
            ? 'translate-x-0 pointer-events-auto'
            : '-translate-x-full pointer-events-none'
        } ${
          isOpen
            ? 'lg:translate-x-0 lg:pointer-events-auto'
            : 'lg:-translate-x-full lg:pointer-events-none'
        }`}
      >
        <div className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-[#E2E8F0] bg-white shrink-0">
          <Link
            href={userRole === 'OPERATOR' ? '/operator' : '/'}
            onClick={closeMobileDrawer}
            className="flex items-center"
          >
            <img
              src="/ypti-logo.png"
              alt="PT YPTI Logo"
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
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <Link
                href="/help"
                onClick={closeMobileDrawer}
                className="py-1.5 px-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                Bantuan
              </Link>
              <Link
                href="/download"
                onClick={closeMobileDrawer}
                className="py-1.5 px-1.5 text-xs text-slate-600 hover:text-[#1E40AF] font-medium transition-colors"
              >
                Unduh App
              </Link>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="py-1.5 px-2 text-xs text-slate-600 hover:text-slate-900 font-semibold transition-colors cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
