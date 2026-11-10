'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

interface HeaderProps {
  onToggleSidebar: () => void;
  userName?: string;
  userRole?: string;
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

interface SearchToolItem {
  id: string;
  code: string;
  name: string;
  location: string;
  availableStock: number;
  unit: string;
}

interface SearchInventoryItem {
  id: string;
  code: string;
  name: string;
  brand?: string | null;
  location: string;
  availableStock: number;
  unit: string;
}

interface SearchEmployeeItem {
  id: string;
  nik: string;
  name: string;
  department: string;
  shift?: string | null;
}

interface SearchLoanItem {
  id: string;
  transactionNumber: string;
  status: string;
  employee?: {
    nik: string;
    name: string;
    department: string;
  };
}

interface FlatSuggestion {
  id: string;
  category: 'MENU' | 'TOOL' | 'INVENTORY' | 'EMPLOYEE' | 'LOAN';
  code?: string;
  title: string;
  subtitle: string;
  meta: string;
  href: string;
  searchQuery?: string;
}

const MENU_SUGGESTIONS = [
  {
    id: 'menu-home',
    title: 'Beranda',
    subtitle: 'Ringkasan metrik operasional, grafik stok, dan antrean prioritas',
    keywords: 'beranda dashboard home grafik ringkasan utama stok',
    href: '/',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'menu-loans',
    title: 'Peminjaman',
    subtitle: 'Formulir peminjaman cepat barcode scanner untuk tool dan inventaris',
    keywords: 'peminjaman pinjam loket dispatch barcode keranjang form baru',
    href: '/loans',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'menu-returns',
    title: 'Pengembalian',
    subtitle: 'Inspeksi fisik pengembalian barang kondisi baik, aus, atau rusak',
    keywords: 'pengembalian kembali return verifikasi inspeksi fisik selesai',
    href: '/returns',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'menu-monitoring',
    title: 'Monitoring Keterlambatan',
    subtitle: 'Pantau pinjaman lewat tenggat waktu dan kirim pengingat WhatsApp',
    keywords: 'monitoring keterlambatan terlambat overdue jatuh tempo whatsapp wa pengingat',
    href: '/monitoring',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'menu-tool',
    title: 'Data Tool',
    subtitle: 'Katalog perkakas mesin CNC, endmill, collet, boring bar, dan lokasi rak',
    keywords: 'master data tool perkakas mesin endmill arbor collet katalog alat',
    href: '/master-tool',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'menu-inventory',
    title: 'Data Inventaris',
    subtitle: 'Katalog aset pabrik, alat ukur digital, scanner, dan nomor seri',
    keywords: 'master data inventaris inventory aset barang elektronik caliper ukur serial',
    href: '/master-inventory',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'menu-employees',
    title: 'Data Karyawan',
    subtitle: 'Daftar NIK peminjam, departemen, shift kerja, dan cetak kartu ID',
    keywords: 'data anggota karyawan pekerja peminjam nik kartu id barcode',
    href: '/employees',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'menu-history',
    title: 'Riwayat & Laporan',
    subtitle: 'Log ketertelusuran transaksi, frekuensi pemakaian, dan servis regrind',
    keywords: 'riwayat histori laporan audit log servis regrind perawatan umur pakai',
    href: '/history',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'menu-users',
    title: 'Manajemen Akun',
    subtitle: 'Kelola ID login angka, kata sandi, dan hak akses menu petugas',
    keywords: 'manajemen akun user pengguna login hak akses admin operator supervisor password',
    href: '/users',
    roles: ['SUPER_ADMIN'],
  },
  {
    id: 'menu-help',
    title: 'Panduan Sistem',
    subtitle: 'Dokumentasi tata cara penggunaan sistem Tool Room PT YPTI',
    keywords: 'panduan bantuan sop cara pakai manual aturan',
    href: '/help',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
];

export function Header({ onToggleSidebar, userName, userRole }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Global search state + live autocomplete recommendations
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [apiResults, setApiResults] = useState<{
    tools: SearchToolItem[];
    inventories: SearchInventoryItem[];
    employees: SearchEmployeeItem[];
    loans: SearchLoanItem[];
  }>({
    tools: [],
    inventories: [],
    employees: [],
    loans: [],
  });

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const effectiveRole = userRole || 'SUPER_ADMIN';
  const displayName = userName || 'Agung Setiawan';
  const displayRole =
    effectiveRole === 'SUPER_ADMIN'
      ? 'Super Admin (Boss)'
      : 'Admin';
  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced live search fetch from /api/search
  useEffect(() => {
    if (!isSearchOpen) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setIsSearchingApi(true);
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(globalSearch.trim())}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          setApiResults({
            tools: data.tools || [],
            inventories: data.inventories || [],
            employees: data.employees || [],
            loans: data.loans || [],
          });
        }
      } catch {
        // Ignore abort errors
      } finally {
        setIsSearchingApi(false);
      }
    }, 140);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [globalSearch, isSearchOpen]);

  // Build unified flat list of recommendations for rendering & keyboard navigation
  const flatSuggestions = useMemo<FlatSuggestion[]>(() => {
    const q = globalSearch.trim().toLowerCase();
    const list: FlatSuggestion[] = [];

    // 1. Matching menu items allowed for current role
    const allowedMenus = MENU_SUGGESTIONS.filter((m) =>
      m.roles.includes(effectiveRole)
    );
    const matchedMenus = q
      ? allowedMenus.filter(
          (m) =>
            m.title.toLowerCase().includes(q) ||
            m.subtitle.toLowerCase().includes(q) ||
            m.keywords.toLowerCase().includes(q)
        )
      : allowedMenus.slice(0, 3);

    for (const m of matchedMenus.slice(0, 4)) {
      list.push({
        id: m.id,
        category: 'MENU',
        title: m.title,
        subtitle: m.subtitle,
        meta: 'Buka',
        href: m.href,
      });
    }

    // 2. Matching Tools
    for (const t of apiResults.tools) {
      list.push({
        id: `tool-${t.id}`,
        category: 'TOOL',
        code: t.code,
        title: t.name,
        subtitle: `Lokasi ${t.location}`,
        meta: `${t.availableStock} ${t.unit}`,
        href: `/master-tool?search=${encodeURIComponent(t.code)}`,
        searchQuery: t.code,
      });
    }

    // 3. Matching Inventories
    for (const inv of apiResults.inventories) {
      list.push({
        id: `inv-${inv.id}`,
        category: 'INVENTORY',
        code: inv.code,
        title: inv.name,
        subtitle: `${inv.brand ? `${inv.brand} · ` : ''}Lokasi ${inv.location}`,
        meta: `${inv.availableStock} ${inv.unit}`,
        href: `/master-inventory?search=${encodeURIComponent(inv.code)}`,
        searchQuery: inv.code,
      });
    }

    // 4. Matching Employees
    for (const emp of apiResults.employees) {
        list.push({
          id: `emp-${emp.id}`,
          category: 'EMPLOYEE',
          code: emp.nik,
          title: emp.name,
          subtitle: `${emp.department}${emp.shift ? ` · ${emp.shift}` : ''}`,
          meta: 'Karyawan',
          href: `/employees?search=${encodeURIComponent(emp.nik)}`,
          searchQuery: emp.nik,
        });
      }

    // 5. Matching Active Loans
    for (const ln of apiResults.loans) {
      list.push({
        id: `loan-${ln.id}`,
        category: 'LOAN',
        code: ln.transactionNumber,
        title: ln.employee?.name || 'Peminjam',
        subtitle: `${ln.employee?.nik || ''} ${ln.employee?.department ? `· ${ln.employee.department}` : ''}`,
        meta: ln.status === 'TERLAMBAT' ? 'Terlambat' : 'Dipinjam',
        href: `/returns?tx=${encodeURIComponent(ln.transactionNumber)}`,
        searchQuery: ln.transactionNumber,
      });
    }

    return list;
  }, [globalSearch, apiResults, effectiveRole]);

  const navigateToSuggestion = (item: FlatSuggestion) => {
    setIsSearchOpen(false);
    if (item.searchQuery) {
      window.dispatchEvent(
        new CustomEvent('ypti-global-search', {
          detail: { search: item.searchQuery },
        })
      );
    }
    router.push(item.href);
  };

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && activeIndex < flatSuggestions.length) {
      navigateToSuggestion(flatSuggestions[activeIndex]);
      return;
    }

    const q = globalSearch.trim();
    if (!q) return;

    if (flatSuggestions.length > 0) {
      navigateToSuggestion(flatSuggestions[0]);
      return;
    }

    setIsSearchOpen(false);
    const upper = q.toUpperCase();
    window.dispatchEvent(
      new CustomEvent('ypti-global-search', { detail: { search: q } })
    );
    if (upper.startsWith('TRX-') || upper.startsWith('LOAN-')) {
      router.push(`/returns?tx=${encodeURIComponent(upper)}`);
    } else if (upper.startsWith('EMP-')) {
      router.push(`/employees?search=${encodeURIComponent(upper)}`);
    } else if (upper.startsWith('INV-') || q.toLowerCase().includes('inventaris')) {
      router.push(`/master-inventory?search=${encodeURIComponent(q.toLowerCase() === 'inventaris' ? '' : q)}`);
    } else {
      router.push(`/master-tool?search=${encodeURIComponent(q)}`);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen) {
      if (e.key === 'ArrowDown') {
        setIsSearchOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) =>
        flatSuggestions.length === 0 ? -1 : (prev + 1) % flatSuggestions.length
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        flatSuggestions.length === 0
          ? -1
          : (prev - 1 + flatSuggestions.length) % flatSuggestions.length
      );
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
      setActiveIndex(-1);
    }
  };

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
        return { parent: 'PT YPTI', current: 'Beranda' };
      case '/master-tool':
        return { parent: 'Data Master', current: 'Data Tool' };
      case '/master-inventory':
        return { parent: 'Data Master', current: 'Data Inventaris' };
      case '/employees':
        return { parent: 'Data Master', current: 'Data Karyawan' };
      case '/loans':
        return { parent: 'Operasional', current: 'Peminjaman' };
      case '/returns':
        return { parent: 'Operasional', current: 'Pengembalian' };
      case '/monitoring':
        return { parent: 'Kontrol', current: 'Monitoring Keterlambatan' };
      case '/history':
        return { parent: 'Audit & Ketertelusuran', current: 'Riwayat & Laporan' };
      case '/users':
        return { parent: 'Kontrol & Audit', current: 'Manajemen Akun' };
      case '/help':
        return { parent: 'Panduan', current: 'Panduan Sistem' };
      default:
        return { parent: 'PT YPTI', current: 'Beranda' };
    }
  };

  const breadcrumbs = getBreadcrumbs();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getCategoryHeading = (cat: FlatSuggestion['category']) => {
    switch (cat) {
      case 'MENU':
        return 'Halaman & Fitur';
      case 'TOOL':
        return 'Data Tool';
      case 'INVENTORY':
        return 'Data Inventaris';
      case 'EMPLOYEE':
        return 'Data Karyawan';
      case 'LOAN':
        return 'Transaksi Aktif';
    }
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-[#E2E8F0] px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-4">
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          id="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors border border-slate-200 flex items-center justify-center shrink-0 cursor-pointer"
          aria-label="Toggle navigasi sidebar"
          title="Buka / Tutup Sidebar"
        >
          <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="hidden sm:block text-sm lg:text-base font-heading font-semibold text-slate-900 tracking-tight leading-tight whitespace-nowrap">
          {breadcrumbs.current}
        </div>
      </div>

      {/* Responsive Global Search with Live Recommendations Dropdown */}
      <div ref={searchContainerRef} className="relative flex-1 max-w-lg mx-1 sm:mx-4">
        <form onSubmit={handleGlobalSearchSubmit} className="relative flex items-center w-full">
          <svg
            className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 10.5a7.5 7.5 0 0013.15 6.15z"
            />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            value={globalSearch}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              setGlobalSearch(e.target.value);
              setIsSearchOpen(true);
              setActiveIndex(0);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Cari menu, kode tool, inventaris, NIK, atau transaksi..."
            aria-label="Pencarian cepat global"
            className="w-full bg-slate-50 border border-slate-200 rounded pl-8 pr-7 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1E40AF] focus:bg-white transition-colors"
          />
          {globalSearch && (
            <button
              type="button"
              onClick={() => {
                setGlobalSearch('');
                setActiveIndex(-1);
                searchInputRef.current?.focus();
              }}
              aria-label="Bersihkan kata kunci"
              className="absolute right-2.5 text-slate-400 hover:text-slate-700 text-xs font-semibold cursor-pointer"
            >
              &times;
            </button>
          )}
        </form>

        {/* Live Recommendation Dropdown Panel */}
        {isSearchOpen && (
          <div className="fixed sm:absolute left-3 right-3 sm:left-0 sm:right-0 top-14 sm:top-full sm:mt-1.5 bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-[70vh] overflow-y-auto divide-y divide-slate-100">
            <div className="px-3.5 py-2 bg-slate-50/80 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-medium text-slate-700">
                {globalSearch.trim()
                  ? `Hasil pencarian "${globalSearch.trim()}"`
                  : 'Akses Cepat & Rekomendasi'}
              </span>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {isSearchingApi ? 'Memuat...' : `${flatSuggestions.length} saran`}
              </span>
            </div>

            {flatSuggestions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                Tidak ada saran untuk <span className="font-medium text-slate-800">&ldquo;{globalSearch}&rdquo;</span>. Tekan Enter untuk mencari di katalog.
              </div>
            ) : (
              <div className="py-1">
                {flatSuggestions.map((item, idx) => {
                  const prevCategory = idx > 0 ? flatSuggestions[idx - 1].category : null;
                  const showCategoryHeader = item.category !== prevCategory;
                  const isHighlighted = idx === activeIndex;

                  return (
                    <React.Fragment key={item.id}>
                      {showCategoryHeader && (
                        <div className="px-3.5 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-white">
                          {getCategoryHeading(item.category)}
                        </div>
                      )}
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => navigateToSuggestion(item)}
                        className={`w-full text-left px-3.5 py-2 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                          isHighlighted ? 'bg-slate-100/80' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs truncate">
                            {item.code && (
                              <span className="font-semibold text-[#1E40AF] tabular-nums shrink-0">
                                {item.code}
                              </span>
                            )}
                            <span className="font-medium text-slate-800 truncate">
                              {item.title}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5 font-normal">
                            {item.subtitle}
                          </div>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap shrink-0 tabular-nums">
                          {item.meta} &rarr;
                        </span>
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            aria-label="Lihat notifikasi"
            title="Pemberitahuan Sistem"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-semibold text-white bg-[#1E40AF] rounded-full ring-2 ring-white tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-md shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-heading font-semibold text-slate-800">Pemberitahuan Sistem</span>
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
                          className={`text-[10px] font-semibold uppercase shrink-0 mt-0.5 ${
                            n.type === 'DANGER'
                              ? 'text-slate-900'
                              : n.type === 'WARNING'
                              ? 'text-slate-700'
                              : 'text-[#1E40AF]'
                          }`}
                        >
                          [{n.type === 'DANGER' ? 'URGENT' : n.type === 'WARNING' ? 'TENGGAT' : 'INFO'}]
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 leading-snug truncate">
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

        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-7 h-7 rounded bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center justify-center border border-slate-300">
            {initials || 'AD'}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-900 leading-tight">
              {displayName}
            </span>
            <span className="text-[10px] text-slate-500 leading-tight">
              {displayRole}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
