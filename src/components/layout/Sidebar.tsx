'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface SidebarProps {
  overdueCount?: number;
  isOpen?: boolean;
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
  isOpen = true,
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
      group: 'MENU UTAMA',
      items: [
        {
          label: 'Beranda',
          href: '/',
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

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-[#E2E8F0] flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform',
        }}
      >
        <div className="h-16 px-6 flex items-center border-b border-[#E2E8F0] bg-white">
          <Link href="/" className="flex items-center">
            <img
              src="/ypti-logo.png"
              alt="PT YPTI Logo"
              className="h-9 w-auto max-w-[180px] object-contain"
            />
          </Link>
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
                      onClick={() => {
                        if (typeof window !== 'undefined' && window.innerWidth < 1024 && onClose) {
                          onClose();
                        }
                      }}
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

        <div className="p-3 border-t border-[#E2E8F0] bg-slate-50">
          <div className="flex items-center justify-between px-2">
            <Link
              href="/help"
              className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
            >
              Bantuan Sistem
            </Link>

            <button
              onClick={handleLogout}
              className="text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
