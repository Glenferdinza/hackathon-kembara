'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface HeaderProps {
  onToggleSidebar: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [adminName] = useState('Agung Setiawan');
  const [adminRole] = useState('Super Admin');

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          if (data.actionItems) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const items = data.actionItems.map((item: any, idx: number) => ({
              id: `notif-${idx}`,
              title: item.title,
              message: item.description,
              type: item.type,
              isRead: false,
              link: item.link,
              createdAt: new Date().toISOString(),
            }));
            setNotifications(items);
          }
        }
      } catch {
        // silent fallback
      }
    };

    fetchNotifs();
  }, []);

  const getBreadcrumbs = () => {
    switch (pathname) {
      case '/':
        return { parent: 'PT. YPTI', current: 'Dashboard Beranda' };
      case '/master-tool':
        return { parent: 'Data Master', current: 'Master Data Tool' };
      case '/master-inventory':
        return { parent: 'Data Master', current: 'Master Data Inventaris' };
      case '/employees':
        return { parent: 'Data Master', current: 'Data Karyawan / Peminjam' };
      case '/loans':
        return { parent: 'Operasional', current: 'Data Peminjaman (Barcode & Manual)' };
      case '/returns':
        return { parent: 'Operasional', current: 'Data Pengembalian Barang' };
      case '/monitoring':
        return { parent: 'Kontrol', current: 'Monitoring Keterlambatan' };
      case '/history':
        return { parent: 'Audit & Ketertelusuran', current: 'Riwayat Transaksi' };
      case '/help':
        return { parent: 'Panduan', current: 'Bantuan Sistem' };
      default:
        return { parent: 'PT. YPTI', current: 'Halaman' };
    }
  };

  const breadcrumbs = getBreadcrumbs();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-[#E2E8F0] px-4 lg:px-6 flex items-center justify-between gap-4">
      {/* Left: Clean Hamburger Icon Toggle Button & breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors border border-slate-200 flex items-center justify-center shrink-0"
          aria-label="Toggle navigasi sidebar"
          title="Buka / Tutup Sidebar"
        >
          {/* Authentic 3-line hamburger icon */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex flex-col">
          <div className="text-[11px] text-slate-500 font-medium">
            {breadcrumbs.parent} <span className="text-slate-300">/</span>
          </div>
          <h1 className="text-sm lg:text-base font-heading font-bold text-slate-900 tracking-tight leading-tight">
            {breadcrumbs.current}
          </h1>
        </div>
      </div>

      {/* Center: Search input without decorative icon */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
        <input
          type="text"
          placeholder="Cari kode tool, inventaris, atau transaksi..."
          className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E40AF] focus:bg-white transition-colors"
        />
      </div>

      {/* Right: Notifications & Admin Profile */}
      <div className="flex items-center gap-3">
        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors"
            aria-label="Lihat notifikasi"
          >
            <span>Notifikasi</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-rose-50 text-rose-700 border border-rose-200">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-md shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-heading font-bold text-slate-800">Pemberitahuan Sistem</span>
                <span className="text-[10px] text-slate-500 font-medium">{unreadCount} baru</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Tidak ada notifikasi aktif saat ini.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <Link
                      key={n.id}
                      href={n.link || '#'}
                      onClick={() => setShowNotifications(false)}
                      className="block p-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`px-1.5 py-0.5 text-[9px] font-bold rounded-xs uppercase shrink-0 mt-0.5 ${
                            n.type === 'DANGER'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : n.type === 'WARNING'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-blue-50 text-[#1E40AF] border border-blue-200'
                          }`}
                        >
                          {n.type === 'DANGER' ? 'URGENT' : n.type === 'WARNING' ? 'TENGGAT' : 'INFO'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 leading-snug truncate">
                            {n.title}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-7 h-7 rounded bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center border border-slate-300">
            AS
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold text-slate-900 leading-tight">
              {adminName}
            </span>
            <span className="text-[10px] text-slate-500 leading-tight">
              {adminRole}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
