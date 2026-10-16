'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface SidebarProps {
  overdueCount?: number;
  isOpen?: boolean;
  isPinned?: boolean;
  onClose?: () => void;
  onTogglePin?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function Sidebar({
  overdueCount = 0,
  isOpen = true,
  isPinned = true,
  onClose,
  onTogglePin,
  onMouseEnter,
  onMouseLeave,
}: SidebarProps) {
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
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-[#E2E8F0] flex flex-col transition-all duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${!isPinned && isOpen ? 'shadow-2xl' : ''}`}
      >
        {/* Brand Header with Official PT. YPTI Logo & Pin / Close Controls */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#E2E8F0] bg-white gap-2">
          <Link href="/" className="flex items-center min-w-0">
            <img
              src="/ypti-logo.png"
              alt="PT. YPTI Logo"
              className="h-8 w-auto max-w-[140px] object-contain"
            />
          </Link>
          <div className="flex items-center gap-1.5 shrink-0">
            {onTogglePin && (
              <button
                onClick={onTogglePin}
                className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors ${
                  isPinned
                    ? 'bg-blue-50 text-[#1E40AF] border-blue-200 hover:bg-blue-100'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title={isPinned ? 'Lepas Kunci (Beralih ke mode auto-hide / hover)' : 'Tahan / Kunci Sidebar agar Tetap Terbuka (Solid)'}
              >
                {isPinned ? 'Terkunci' : 'Tahan'}
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-700 text-xs font-semibold rounded hover:bg-slate-100 transition-colors"
                title="Sembunyikan Sidebar"
                aria-label="Sembunyikan Sidebar"
              >
                Tutup
              </button>
            )}
          </div>
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
                      onClick={() => {
                        if (typeof window !== 'undefined' && window.innerWidth < 1024 && onClose) {
                          onClose();
                        }
                      }}
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

        {/* System Links */}
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
