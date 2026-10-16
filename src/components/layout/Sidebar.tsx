'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface SidebarProps {
  overdueCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ overdueCount = 0, isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const navGroups = [
    {
      group: 'MENU UTAMA',
      items: [
        { label: 'Beranda (Dashboard)', href: '/' },
      ],
    },
    {
      group: 'DATA MASTER',
      items: [
        { label: 'Master Data Tool', href: '/master-tool' },
        { label: 'Master Data Inventaris', href: '/master-inventory' },
        { label: 'Data Karyawan / Peminjam', href: '/employees' },
      ],
    },
    {
      group: 'TRANSAKSI & OPERASIONAL',
      items: [
        { label: 'Data Peminjaman', href: '/loans' },
        { label: 'Data Pengembalian', href: '/returns' },
      ],
    },
    {
      group: 'KONTROL & AUDIT',
      items: [
        {
          label: 'Monitoring Keterlambatan',
          href: '/monitoring',
          badge: overdueCount > 0 ? `${overdueCount}` : undefined,
          badgeColor: 'bg-rose-50 text-rose-700 border border-rose-200',
        },
        { label: 'Riwayat & Audit Log', href: '/history' },
      ],
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-[#E2E8F0] flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header with Official PT. YPTI Logo */}
        <div className="h-16 px-5 flex items-center border-b border-[#E2E8F0] bg-white">
          <Link href="/" className="flex items-center">
            <img
              src="/ypti-logo.png"
              alt="PT. YPTI Logo"
              className="h-9 w-auto max-w-[200px] object-contain"
            />
          </Link>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navGroups.map((grp) => (
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
                      onClick={onClose}
                      className={`flex items-center justify-between px-3 py-2 rounded text-xs font-heading transition-colors ${
                        isActive
                          ? 'bg-blue-50/70 text-[#1E40AF] font-bold border-l-2 border-[#1E40AF]'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                      {item.badge !== undefined && (
                        <span
                          className={`px-1.5 py-0.2 text-[10px] font-bold rounded-xs ${item.badgeColor || 'bg-slate-200 text-slate-700'}`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Environment & Local DB Status */}
        <div className="p-3 border-t border-[#E2E8F0] bg-slate-50">
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-white border border-[#E2E8F0] text-[11px]">
            <span className="font-medium text-slate-600">Database:</span>
            <span className="font-semibold text-[#1E40AF]">Relasional Lokal</span>
          </div>

          <div className="mt-2.5 flex items-center justify-between px-1">
            <Link
              href="/help"
              className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
            >
              Bantuan Sistem
            </Link>

            <button
              onClick={handleLogout}
              className="text-xs text-slate-500 hover:text-rose-700 font-medium transition-colors"
            >
              Keluar
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
