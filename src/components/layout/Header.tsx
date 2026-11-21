'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ChevronDown, Clock, Info, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { fetchHeaderSummary } from '@/lib/dashboard-client';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';

const READ_NOTIFS_STORAGE_KEY = 'ypti_read_notif_ids';
const DISMISSED_NOTIFS_STORAGE_KEY = 'ypti_dismissed_notif_keys';

function loadReadNotifIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(READ_NOTIFS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadNotifIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(READ_NOTIFS_STORAGE_KEY, JSON.stringify(Array.from(ids).slice(-100)));
  } catch {
    // ignore storage quota errors
  }
}

function loadDismissedNotifKeys(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_NOTIFS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissedNotifKeys(keys: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISMISSED_NOTIFS_STORAGE_KEY, JSON.stringify(Array.from(keys).slice(-150)));
  } catch {
    // ignore storage quota errors
  }
}

interface HeaderUserSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  employeeId?: string | null;
  employeeNik?: string | null;
}

interface HeaderProps {
  onToggleSidebar: () => void;
  onToggleMobileMenu?: () => void;
  userName?: string;
  userRole?: string;
  userIdCode?: string;
  userDepartment?: string;
  employeeNik?: string | null;
  onUserUpdated?: (user: HeaderUserSummary) => void;
}

interface NotificationItem {
  id: string;
  dismissKey: string;
  title: string;
  message: string;
  type: string;
  urgent: boolean;
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
    id: 'menu-requests',
    title: 'Antrean Request Pinjam',
    subtitle: 'Proses pengajuan pinjam dari operator dan scan barcode unit tool',
    keywords: 'request pinjam antrean operator scan barcode qr siapkan',
    href: '/requests',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'menu-scan-tool',
    title: 'Cek Barcode & Umur Tool',
    subtitle: 'Pindai stiker barcode wadah tool untuk cek sisa umur pakai dan pemegang',
    keywords: 'scan barcode stiker cek umur pakai tool life unit qr',
    href: '/scan-tool',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'menu-operator-home',
    title: 'Dasbor Operator',
    subtitle: 'Ringkasan barang dipinjam, barang siap diambil, dan waiting list shift',
    keywords: 'operator dasbor pinjaman waiting list terima tolak',
    href: '/operator',
    roles: ['OPERATOR'],
  },
  {
    id: 'menu-operator-req',
    title: 'Request Pinjam Tool',
    subtitle: 'Ajukan permintaan peminjaman perkakas dan inventaris ke Tool Room',
    keywords: 'request pinjam ajukan perkakas operator',
    href: '/operator/request',
    roles: ['OPERATOR'],
  },
  {
    id: 'menu-operator-handover',
    title: 'Pengalihan Shift',
    subtitle: 'Input menit pakai dan alihkan hak pinjam barang ke operator shift 2',
    keywords: 'pengalihan handover shift 2 alih pinjam menit pakai',
    href: '/operator/handover',
    roles: ['OPERATOR'],
  },
  {
    id: 'menu-help',
    title: 'Panduan Sistem',
    subtitle: 'Dokumentasi tata cara penggunaan sistem Tool Room PT YPTI',
    keywords: 'panduan bantuan sop cara pakai manual aturan',
    href: '/help',
    roles: ['SUPER_ADMIN', 'ADMIN', 'OPERATOR'],
  },
  {
    id: 'menu-download',
    title: 'Unduh Aplikasi Desktop & Mobile',
    subtitle: 'Installer Windows .exe dan pemasangan cepat PWA di browser atau tablet',
    keywords: 'download unduh exe desktop installer windows pwa aplikasi android',
    href: '/download',
    roles: ['SUPER_ADMIN', 'ADMIN', 'OPERATOR'],
  },
];

export function Header({
  onToggleSidebar,
  onToggleMobileMenu,
  userName,
  userRole,
  userIdCode,
  userDepartment,
  employeeNik,
  onUserUpdated,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(() => new Set());

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
  const notificationsContainerRef = useRef<HTMLDivElement>(null);
  const accountContainerRef = useRef<HTMLDivElement>(null);

  const effectiveRole = userRole || 'SUPER_ADMIN';
  const displayName = userName || 'Agung Setiawan';
  const displayRole =
    effectiveRole === 'SUPER_ADMIN'
      ? 'Super Admin'
      : effectiveRole === 'OPERATOR'
      ? 'Operator Produksi'
      : 'Admin Tool Room';
  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Close search, notifications & account popovers when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
      if (
        notificationsContainerRef.current &&
        !notificationsContainerRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        accountContainerRef.current &&
        !accountContainerRef.current.contains(e.target as Node)
      ) {
        setShowAccountMenu(false);
      }
    };
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  const openProfileModal = () => {
    setShowAccountMenu(false);
    setProfileName(displayName);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setProfileError('');
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');

    const trimmedName = profileName.trim();
    const wantsNameChange = effectiveRole !== 'OPERATOR' && trimmedName !== displayName;
    const wantsPasswordChange = newPassword.length > 0;

    if (effectiveRole !== 'OPERATOR' && trimmedName.length < 2) {
      setProfileError('Nama tampilan minimal terdiri dari 2 karakter.');
      return;
    }

    if (wantsPasswordChange) {
      if (!currentPassword) {
        setProfileError('Masukkan kata sandi saat ini untuk verifikasi.');
        return;
      }
      if (newPassword.length < 6) {
        setProfileError('Kata sandi baru minimal terdiri dari 6 karakter.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setProfileError('Konfirmasi kata sandi baru tidak cocok.');
        return;
      }
    }

    if (!wantsNameChange && !wantsPasswordChange) {
      setProfileError('Belum ada perubahan nama atau kata sandi untuk disimpan.');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: wantsNameChange ? trimmedName : undefined,
          currentPassword: wantsPasswordChange ? currentPassword : undefined,
          newPassword: wantsPasswordChange ? newPassword : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setProfileError(json.error || 'Gagal menyimpan perubahan akun.');
        return;
      }
      if (json.user && onUserUpdated) {
        onUserUpdated(json.user);
      }
      setShowProfileModal(false);
      showToast('Pengaturan akun berhasil diperbarui.', 'success');
    } catch {
      setProfileError('Terjadi kesalahan jaringan saat memperbarui akun.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleHeaderLogout = async () => {
    setShowAccountMenu(false);
    const ok = await confirm({
      title: 'Konfirmasi Keluar Sistem',
      message: 'Apakah Anda yakin ingin mengakhiri sesi akses pada perangkat ini?',
      confirmText: 'Keluar Sistem',
      cancelText: 'Batal',
      type: 'danger',
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

  // Debounced live search fetch from /api/search (Admin & Super Admin)
  useEffect(() => {
    if (!isSearchOpen || effectiveRole === 'OPERATOR') return;

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
  }, [globalSearch, isSearchOpen, effectiveRole]);

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
    if (effectiveRole === 'OPERATOR') {
      router.push(`/operator/request?search=${encodeURIComponent(q)}`);
      return;
    }

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
        const readIds = loadReadNotifIds();
        const storedDismissed = loadDismissedNotifKeys();

        if (effectiveRole === 'OPERATOR') {
          const res = await fetch('/api/operator/summary');
          if (res.ok) {
            const data = await res.json();
            const items: NotificationItem[] = [];
            (data.incomingHandovers || []).forEach((h: { id: string; handoverNumber: string; fromEmployee?: { name?: string }; toolUnit?: { unitCode?: string } }) => {
              const id = `hov-${h.id}`;
              items.push({
                id,
                dismissKey: id,
                title: `Menunggu Terima Shift (${h.handoverNumber})`,
                message: `Pengalihan dari ${h.fromEmployee?.name || 'Operator'} untuk unit ${h.toolUnit?.unitCode || 'Tool'}`,
                type: 'DANGER',
                urgent: true,
                isRead: readIds.has(id),
                link: '/operator',
                createdAt: new Date().toISOString(),
              });
            });
            (data.readyRequests || []).forEach((r: { id: string; requestNumber: string }) => {
              const id = `req-${r.id}`;
              items.push({
                id,
                dismissKey: id,
                title: `Barang Siap Diambil (${r.requestNumber})`,
                message: 'Admin Tool Room telah memindai unit perkakas. Cek dan klik Terima.',
                type: 'DANGER',
                urgent: true,
                isRead: readIds.has(id),
                link: '/operator',
                createdAt: new Date().toISOString(),
              });
            });
            if (typeof data.criticalLifeCount === 'number' && data.criticalLifeCount > 0) {
              const id = `op-crit-${data.criticalLifeCount}`;
              items.push({
                id,
                dismissKey: id,
                title: `Umur Pakai Kritis (${data.criticalLifeCount} unit)`,
                message: 'Perkakas yang Anda pegang mendekati batas umur pakai. Segera kembalikan ke Tool Room.',
                type: 'DANGER',
                urgent: true,
                isRead: readIds.has(id),
                link: '/operator',
                createdAt: new Date().toISOString(),
              });
            }
            (data.recentNotifications || []).forEach((rn: { id: string; title: string; message: string; type: string; link?: string | null; createdAt: string }) => {
              const lowerTitle = rn.title.toLowerCase();
              if (lowerTitle.includes('waiting list pengalihan shift') || lowerTitle.includes('barang siap diambil')) {
                return;
              }
              const id = `op-db-${rn.id}`;
              items.push({
                id,
                dismissKey: id,
                title: rn.title,
                message: rn.message,
                type: rn.type || 'INFO',
                urgent: false,
                isRead: readIds.has(id),
                link: rn.link || '/operator',
                createdAt: rn.createdAt,
              });
            });
            setDismissedKeys(storedDismissed);
            setNotifications(items);
          }
          return;
        }

        const data = await fetchHeaderSummary();
        if (data) {
          const items: NotificationItem[] = (data.actionItems || []).map((item) => {
            const id = `notif-${item.id}`;
            const isUrgent = Boolean(item.urgent ?? item.type === 'DANGER');
            return {
              id,
              dismissKey: item.dismissKey || id,
              title: item.title,
              message: item.description,
              type: item.type,
              urgent: isUrgent,
              isRead: readIds.has(id),
              link: item.link,
              createdAt: new Date().toISOString(),
            };
          });

          // Include recent non-urgent admin event notifications so they can be inspected and dismissed cleanly
          (data.notifications || []).slice(0, 5).forEach((dn) => {
            const lowerTitle = dn.title.toLowerCase();
            if (
              lowerTitle.includes('transaksi terlambat') ||
              lowerTitle.includes('request pinjam baru') ||
              lowerTitle.includes('umur pakai kritis')
            ) {
              return;
            }
            const id = `db-${dn.id}`;
            items.push({
              id,
              dismissKey: id,
              title: dn.title,
              message: dn.message,
              type: dn.type || 'INFO',
              urgent: false,
              isRead: readIds.has(id),
              link: dn.link || '/',
              createdAt: dn.createdAt,
            });
          });

          setDismissedKeys(storedDismissed);
          setNotifications(items);
        }
      } catch {
        // silent fallback
      }
    };

    fetchNotifs();
  }, [effectiveRole, pathname]);

  const markNotifRead = (id: string) => {
    const nextRead = loadReadNotifIds();
    nextRead.add(id);
    saveReadNotifIds(nextRead);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const dismissNotif = (dismissKey: string, id: string) => {
    const nextDismissed = loadDismissedNotifKeys();
    nextDismissed.add(dismissKey);
    saveDismissedNotifKeys(nextDismissed);
    setDismissedKeys(nextDismissed);

    const nextRead = loadReadNotifIds();
    nextRead.add(id);
    saveReadNotifIds(nextRead);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const visibleNotifications = useMemo(
    () => notifications.filter((n) => n.urgent || !dismissedKeys.has(n.dismissKey)),
    [notifications, dismissedKeys]
  );

  const dismissAllNonUrgent = () => {
    const nextDismissed = loadDismissedNotifKeys();
    const nextRead = loadReadNotifIds();
    visibleNotifications.forEach((n) => {
      if (!n.urgent) {
        nextDismissed.add(n.dismissKey);
        nextRead.add(n.id);
      }
    });
    saveDismissedNotifKeys(nextDismissed);
    saveReadNotifIds(nextRead);
    setDismissedKeys(nextDismissed);
    setNotifications((prev) => prev.map((n) => (!n.urgent ? { ...n, isRead: true } : n)));
  };

  const getBreadcrumbs = () => {
    switch (pathname) {
      case '/':
        return { parent: 'PT YPTI', current: 'Beranda' };
      case '/operator':
        return { parent: 'Portal Operator', current: 'Dasbor Operator' };
      case '/operator/request':
        return { parent: 'Portal Operator', current: 'Request Pinjam Tool' };
      case '/operator/handover':
        return { parent: 'Portal Operator', current: 'Pengalihan Shift' };
      case '/requests':
        return { parent: 'Operasional', current: 'Antrean Request Pinjam' };
      case '/scan-tool':
        return { parent: 'Menu Utama', current: 'Cek Barcode & Umur Tool' };
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
      case '/download':
        return { parent: 'Aplikasi', current: 'Unduh Desktop & PWA' };
      default:
        return { parent: 'PT YPTI', current: 'Beranda' };
    }
  };

  const breadcrumbs = getBreadcrumbs();
  const urgentCount = visibleNotifications.filter((n) => n.urgent).length;
  const dismissibleCount = visibleNotifications.filter((n) => !n.urgent).length;
  const unreadCount = visibleNotifications.filter((n) => n.urgent || !n.isRead).length;

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
    <header className="sticky top-0 z-20 h-14 sm:h-16 bg-white border-b border-[#E2E8F0] px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-4 print:hidden">
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          id="sidebar-toggle-btn"
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 1024 && onToggleMobileMenu) {
              onToggleMobileMenu();
            } else {
              onToggleSidebar();
            }
          }}
          className="flex p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors border border-slate-200 items-center justify-center shrink-0 cursor-pointer"
          aria-label="Toggle navigasi menu"
          title="Buka / Tutup Menu"
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
      <div ref={searchContainerRef} className="relative flex-1 min-w-0 max-w-lg mx-1 sm:mx-4">
        <form onSubmit={handleGlobalSearchSubmit} className="relative flex items-center w-full">
          <svg
            className="w-3.5 h-3.5 text-slate-600 absolute left-3 pointer-events-none"
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
            placeholder={
              effectiveRole === 'OPERATOR'
                ? 'Cari menu & panduan...'
                : 'Cari kode, NIK, menu...'
            }
            aria-label="Pencarian cepat global"
            className="w-full bg-slate-50 border border-slate-200 rounded pl-8 pr-9 py-1.5 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#1E40AF] focus:bg-white transition-colors"
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
              className="absolute right-0.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-600 hover:text-slate-900 text-sm font-semibold cursor-pointer"
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
        <div ref={notificationsContainerRef} className="relative">
          <button
            onClick={() => {
              setShowAccountMenu(false);
              setShowNotifications((prev) => !prev);
            }}
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
              <span
                className={`absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-semibold text-white rounded-full ring-2 ring-white tabular-nums ${
                  urgentCount > 0 ? 'bg-[#991B1B]' : 'bg-[#1E40AF]'
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-14 sm:top-full sm:mt-2 sm:w-96 bg-white border border-slate-200 rounded-md shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between gap-2">
                <span className="text-xs font-heading font-semibold text-slate-800">Pemberitahuan Sistem</span>
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] text-slate-600 font-medium tabular-nums">
                    {urgentCount > 0 ? `${urgentCount} wajib` : `${unreadCount} baru`}
                  </span>
                  {dismissibleCount > 0 && (
                    <button
                      type="button"
                      onClick={dismissAllNonUrgent}
                      className="text-[11px] font-semibold text-[#1E40AF] hover:underline cursor-pointer"
                    >
                      Bersihkan info
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {visibleNotifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Tidak ada notifikasi aktif saat ini.
                  </div>
                ) : (
                  visibleNotifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-stretch hover:bg-slate-50 transition-colors ${
                        n.isRead && !n.urgent ? 'opacity-75' : ''
                      }`}
                    >
                      <Link
                        href={n.link || '#'}
                        onClick={() => {
                          markNotifRead(n.id);
                          setShowNotifications(false);
                        }}
                        className="group flex-1 min-w-0 p-3 flex items-center justify-between gap-2.5 text-left"
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <span
                            className="shrink-0 mt-0.5"
                            title={
                              n.urgent
                                ? 'Wajib diselesaikan'
                                : n.type === 'DANGER'
                                ? 'Peringatan Penting'
                                : n.type === 'WARNING'
                                ? 'Peringatan / Tenggat'
                                : 'Informasi'
                            }
                          >
                            {n.urgent || n.type === 'DANGER' ? (
                              <AlertCircle
                                className="w-4 h-4 text-[#991B1B]"
                                aria-label={n.urgent ? 'Wajib diselesaikan' : 'Peringatan Penting'}
                              />
                            ) : n.type === 'WARNING' ? (
                              <Clock
                                className="w-4 h-4 text-[#92400E]"
                                aria-label="Peringatan atau Tenggat"
                              />
                            ) : (
                              <Info
                                className="w-4 h-4 text-[#1E40AF]"
                                aria-label="Informasi"
                              />
                            )}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-800 leading-snug truncate">
                              {n.title}
                            </p>
                            <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                            {n.urgent && (
                              <p className="text-[10px] font-semibold text-[#991B1B] mt-0.5">
                                Wajib diselesaikan
                              </p>
                            )}
                          </div>
                        </div>
                        <svg
                          className="w-4 h-4 text-slate-400 group-hover:text-[#1E40AF] group-hover:translate-x-0.5 transition-all shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                      {!n.urgent && (
                        <button
                          type="button"
                          onClick={() => dismissNotif(n.dismissKey, n.id)}
                          aria-label={`Tutup notifikasi ${n.title}`}
                          title="Tutup notifikasi"
                          className="px-2.5 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 border-l border-slate-100 cursor-pointer shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div ref={accountContainerRef} className="relative pl-2 border-l border-slate-200">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(false);
              setShowAccountMenu((prev) => !prev);
            }}
            aria-expanded={showAccountMenu}
            aria-label="Menu Akun Pengguna"
            title={`${displayName} (${displayRole})`}
            className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded bg-slate-200 text-slate-800 font-semibold text-[11px] flex items-center justify-center border border-slate-300 shrink-0">
              {initials || 'AD'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 leading-tight">
                {displayName}
              </span>
              <span className="text-[11px] text-slate-600 leading-tight">
                {displayRole}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block shrink-0" aria-hidden="true" />
          </button>

          {showAccountMenu && (
            <div className="fixed sm:absolute right-3 sm:right-0 top-14 sm:top-full sm:mt-2 w-64 bg-white border border-slate-200 rounded-md shadow-lg py-1.5 z-50">
              <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    {displayName}
                  </span>
                  <span className="text-[11px] font-semibold text-[#1E40AF] shrink-0">
                    {displayRole}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 tabular-nums truncate">
                  ID {employeeNik || userIdCode || '-'}
                  {userDepartment ? ` · ${userDepartment}` : ''}
                </div>
              </div>

              <div className="py-1 divide-y divide-slate-100">
                <button
                  type="button"
                  onClick={openProfileModal}
                  className="w-full min-h-[42px] sm:min-h-0 px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                  <span>Pengaturan Akun &amp; Sandi</span>
                </button>
                <button
                  type="button"
                  onClick={handleHeaderLogout}
                  className="w-full min-h-[42px] sm:min-h-0 px-3.5 py-2 text-left text-xs font-semibold text-[#991B1B] hover:bg-[#FEF2F2] flex items-center gap-2.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Keluar dari Sistem</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Pengaturan Akun & Ubah Kata Sandi Mandiri */}
      {showProfileModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => !savingProfile && setShowProfileModal(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded shadow-xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#1E40AF]" aria-hidden="true" />
                <h2 className="text-xs font-heading font-semibold text-slate-900 uppercase tracking-wider">
                  Pengaturan Akun Pengguna
                </h2>
              </div>
              <button
                type="button"
                disabled={savingProfile}
                onClick={() => setShowProfileModal(false)}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-4 space-y-3.5 text-xs">
              <div className="pb-2.5 border-b border-slate-100 flex items-center justify-between gap-2 text-slate-600">
                <div>
                  <div className="font-semibold text-slate-900">{displayRole}</div>
                  <div className="text-[11px] text-slate-600 tabular-nums">
                    ID Pengguna {employeeNik || userIdCode || '-'}
                  </div>
                </div>
                <div className="w-9 h-9 rounded bg-slate-100 text-slate-800 font-semibold text-xs flex items-center justify-center border border-slate-200">
                  {initials || 'AD'}
                </div>
              </div>

              <div>
                <label
                  htmlFor="account-display-name"
                  className="block font-semibold text-slate-700 mb-1"
                >
                  Nama Tampilan
                </label>
                <input
                  id="account-display-name"
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  disabled={effectiveRole === 'OPERATOR'}
                  className={`w-full px-3 py-2 border rounded text-xs ${
                    effectiveRole === 'OPERATOR'
                      ? 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                      : 'bg-white border-slate-300 text-slate-900 focus:outline-none focus:border-[#1E40AF]'
                  }`}
                />
                {effectiveRole === 'OPERATOR' && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Nama operator mengikuti Data Master Karyawan. Anda tetap dapat memperbarui kata sandi di bawah ini.
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <div className="font-semibold text-slate-800">Ubah Kata Sandi (Opsional)</div>
                <div>
                  <label
                    htmlFor="account-current-pw"
                    className="block text-[11px] font-medium text-slate-700 mb-1"
                  >
                    Kata Sandi Saat Ini
                  </label>
                  <input
                    id="account-current-pw"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan kata sandi lama..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="account-new-pw"
                      className="block text-[11px] font-medium text-slate-700 mb-1"
                    >
                      Kata Sandi Baru
                    </label>
                    <input
                      id="account-new-pw"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:border-[#1E40AF]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="account-confirm-pw"
                      className="block text-[11px] font-medium text-slate-700 mb-1"
                    >
                      Konfirmasi Sandi Baru
                    </label>
                    <input
                      id="account-confirm-pw"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi sandi baru"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:border-[#1E40AF]"
                    />
                  </div>
                </div>
              </div>

              {profileError && (
                <div className="p-2.5 bg-[#FEF2F2] border border-red-200 rounded text-xs font-medium text-[#991B1B]">
                  {profileError}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={savingProfile}
                  onClick={() => setShowProfileModal(false)}
                  className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded disabled:opacity-60 cursor-pointer"
                >
                  {savingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
