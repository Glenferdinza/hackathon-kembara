'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { SkeletonTable } from '@/components/ui/SkeletonTable';
import { EmptyState } from '@/components/ui/EmptyState';

interface Employee {
  id: string;
  nik: string;
  name: string;
  role?: string;
  department: string;
  shift?: string;
  phone?: string;
  email?: string;
  status: string;
  loans?: any[];
}

interface SelectedItem {
  id: string;
  itemType: 'TOOL' | 'INVENTORY';
  code: string;
  name: string;
  location: string;
  availableStock: number;
  unit: string;
  quantity: number;
}

type LoanView = 'PIC' | 'ITEMS' | 'CONFIRM';

export default function LoansPage() {
  const { showToast } = useToast();

  // Navigasi Layar Fokus (Next / Back tanpa banner stepper 1-2-3)
  const [currentView, setCurrentView] = useState<LoanView>('PIC');

  // 1. State Penanggung Jawab Tunggal (1 Orang)
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);

  // Modal Tambah Karyawan Baru Inline
  const [isQuickAddEmpOpen, setIsQuickAddEmpOpen] = useState(false);
  const [newEmpNik, setNewEmpNik] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('Machining CNC');
  const [newEmpShift, setNewEmpShift] = useState('Shift 1 (Pagi)');
  const [newEmpPhone, setNewEmpPhone] = useState('08123456789');
  const [isSubmittingNewEmp, setIsSubmittingNewEmp] = useState(false);

  // 2. State Katalog Barang (Ringkas 5 baris per halaman agar tidak memanjang ke bawah)
  const [activeCatalogTab, setActiveCatalogTab] = useState<'TOOL' | 'INVENTORY'>('TOOL');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);
  const catalogPageSize = 5;
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const [availableInventories, setAvailableInventories] = useState<any[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  // 3. Daftar Alat yang Dipinjam
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // 4. Durasi (Dropdown 1 Warna), Tenggat, & Catatan
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [activePreset, setActivePreset] = useState<number>(8);
  const [purpose, setPurpose] = useState('Pengerjaan Part Machining & Moulding Shift Kerja');
  const [notes, setNotes] = useState('');

  // 5. Submit & Bukti Transaksi Selesai
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedTx, setCompletedTx] = useState<any | null>(null);

  const setDeadlinePreset = (hours: number) => {
    setActivePreset(hours);
    if (hours <= 0) return;
    const d = new Date(Date.now() + hours * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    setExpectedReturnDate(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
  };

  useEffect(() => {
    setDeadlinePreset(8);
  }, []);

  // Load Daftar Karyawan
  useEffect(() => {
    fetch('/api/employees')
      .then((res) => res.json())
      .then((json) => {
        if (json.data && Array.isArray(json.data)) {
          setEmployeesList(json.data);
          const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
          const urlEmp = params?.get('emp') || params?.get('nik');
          if (urlEmp) {
            const cleanQ = urlEmp.trim().toUpperCase();
            const matched = json.data.find(
              (e: Employee) => e.nik.toUpperCase() === cleanQ || e.name.toUpperCase().includes(cleanQ)
            );
            if (matched) {
              setEmployee(matched);
            }
          } else if (json.data.length > 0) {
            setEmployee(json.data[0]);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Load Katalog Tool & Inventaris
  const fetchCatalog = async () => {
    setIsLoadingCatalog(true);
    try {
      const [toolRes, invRes] = await Promise.all([
        fetch('/api/tools?limit=150&status=AKTIF'),
        fetch('/api/inventories?limit=150&status=AKTIF'),
      ]);

      let loadedTools: any[] = [];
      let loadedInventories: any[] = [];

      if (toolRes.ok) {
        const json = await toolRes.json();
        loadedTools = json.data || [];
        setAvailableTools(loadedTools);
      }
      if (invRes.ok) {
        const json = await invRes.json();
        loadedInventories = json.data || [];
        setAvailableInventories(loadedInventories);
      }

      if (typeof window !== 'undefined') {
        const urlItem = new URLSearchParams(window.location.search).get('item');
        if (urlItem) {
          const cleanCode = urlItem.trim().toUpperCase();
          const matchedTool = loadedTools.find((t) => t.code?.toUpperCase() === cleanCode);
          if (matchedTool && matchedTool.availableStock > 0) {
            setActiveCatalogTab('TOOL');
            setSelectedItems((prev) => {
              if (prev.some((i) => i.id === matchedTool.id && i.itemType === 'TOOL')) return prev;
              return [
                ...prev,
                {
                  id: matchedTool.id,
                  itemType: 'TOOL',
                  code: matchedTool.code,
                  name: matchedTool.name,
                  location: matchedTool.location || 'Rak Utama',
                  availableStock: matchedTool.availableStock,
                  unit: matchedTool.unit || 'PCS',
                  quantity: 1,
                },
              ];
            });
            setCurrentView('ITEMS');
          } else {
            const matchedInv = loadedInventories.find((i) => i.code?.toUpperCase() === cleanCode);
            if (matchedInv && matchedInv.availableStock > 0) {
              setActiveCatalogTab('INVENTORY');
              setSelectedItems((prev) => {
                if (prev.some((i) => i.id === matchedInv.id && i.itemType === 'INVENTORY')) return prev;
                return [
                  ...prev,
                  {
                    id: matchedInv.id,
                    itemType: 'INVENTORY',
                    code: matchedInv.code,
                    name: matchedInv.name,
                    location: matchedInv.location || 'Rak Utama',
                    availableStock: matchedInv.availableStock,
                    unit: matchedInv.unit || 'UNIT',
                    quantity: 1,
                  },
                ];
              });
              setCurrentView('ITEMS');
            }
          }
        }
      }
    } catch {
      // silent
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleSelectEmployeeByNik = (nik: string) => {
    if (!nik) {
      setEmployee(null);
      return;
    }
    const matched = employeesList.find((e) => e.nik === nik);
    if (matched) {
      setEmployee(matched);
    }
  };

  const handleQuickCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpNik || !newEmpName) {
      showToast('NIK dan Nama Lengkap wajib diisi.', 'error');
      return;
    }
    setIsSubmittingNewEmp(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nik: newEmpNik.trim(),
          name: newEmpName.trim(),
          department: newEmpDept,
          shift: newEmpShift,
          phone: newEmpPhone.trim(),
          role: 'Operator Produksi',
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Gagal menambahkan karyawan.', 'error');
      } else {
        const createdEmp = json.data;
        showToast(`Penanggung jawab ${createdEmp.name} berhasil didaftarkan dan dipilih.`, 'info');
        setEmployeesList((prev) => [createdEmp, ...prev]);
        setEmployee(createdEmp);
        setIsQuickAddEmpOpen(false);
        setNewEmpNik('');
        setNewEmpName('');
      }
    } catch {
      showToast('Terjadi kesalahan saat menambahkan karyawan.', 'error');
    } finally {
      setIsSubmittingNewEmp(false);
    }
  };

  // Filter Katalog
  const currentCatalogList = activeCatalogTab === 'TOOL' ? availableTools : availableInventories;
  const filteredCatalog = currentCatalogList.filter((item: any) => {
    const search = catalogSearch.toLowerCase();
    return (
      item.code?.toLowerCase().includes(search) ||
      item.name?.toLowerCase().includes(search) ||
      item.location?.toLowerCase().includes(search) ||
      (item.category?.name && item.category.name.toLowerCase().includes(search))
    );
  });

  const totalCatalogPages = Math.ceil(filteredCatalog.length / catalogPageSize) || 1;
  const paginatedCatalog = filteredCatalog.slice(
    (catalogPage - 1) * catalogPageSize,
    catalogPage * catalogPageSize
  );

  const handleAddItem = (item: any, type: 'TOOL' | 'INVENTORY') => {
    if (item.availableStock <= 0) {
      showToast(`Stok "${item.name}" sedang habis!`, 'error');
      return;
    }

    const existingIdx = selectedItems.findIndex((i) => i.id === item.id && i.itemType === type);
    if (existingIdx >= 0) {
      const currentQty = selectedItems[existingIdx].quantity;
      if (currentQty + 1 > item.availableStock) {
        showToast(`Maksimal stok tersedia adalah ${item.availableStock}`, 'error');
        return;
      }
      const updated = [...selectedItems];
      updated[existingIdx].quantity += 1;
      setSelectedItems(updated);
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          id: item.id,
          itemType: type,
          code: item.code,
          name: item.name,
          location: item.location || 'Rak Utama',
          availableStock: item.availableStock,
          unit: item.unit || 'Unit',
          quantity: 1,
        },
      ]);
    }
  };

  const handleUpdateQty = (index: number, newQty: number) => {
    const item = selectedItems[index];
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    if (newQty > item.availableStock) {
      showToast(`Maksimal stok tersedia adalah ${item.availableStock}`, 'error');
      return;
    }
    const updated = [...selectedItems];
    updated[index].quantity = newQty;
    setSelectedItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, idx) => idx !== index));
  };

  const totalUnitsSelected = selectedItems.reduce((acc, cur) => acc + cur.quantity, 0);

  const handleSubmitCheckout = async () => {
    if (!employee) {
      showToast('Harap pilih 1 karyawan penanggung jawab terlebih dahulu.', 'error');
      setCurrentView('PIC');
      return;
    }
    if (selectedItems.length === 0) {
      showToast('Pilih minimal 1 perkakas atau aset untuk dipinjam.', 'error');
      setCurrentView('ITEMS');
      return;
    }
    if (!expectedReturnDate) {
      showToast('Tentukan batas tenggat waktu pengembalian.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        employeeId: employee.id,
        expectedReturnDate: new Date(expectedReturnDate).toISOString(),
        purpose,
        notes,
        items: selectedItems.map((i) => ({
          id: i.id,
          itemType: i.itemType,
          quantity: i.quantity,
        })),
      };

      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal menyimpan transaksi peminjaman.');
      }

      setCompletedTx({
        transactionNumber: json.data?.transactionNumber || 'LOAN-TERCATAT',
        employeeName: employee.name,
        employeeNik: employee.nik,
        employeeDept: employee.department,
        itemCount: totalUnitsSelected,
        expectedReturnDate,
        items: [...selectedItems],
      });

      setSelectedItems([]);
      fetchCatalog();
      showToast('Peminjaman perkakas berhasil dicatat.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan sistem saat menyimpan transaksi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartNewTransaction = () => {
    setCompletedTx(null);
    setSelectedItems([]);
    setDeadlinePreset(8);
    setPurpose('Pengerjaan Part Machining & Moulding Shift Kerja');
    setNotes('');
    setCurrentView('PIC');
  };

  return (
    <AppShell>
      <div className="space-y-4 pb-12 max-w-3xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-base lg:text-lg font-semibold font-heading text-slate-900 tracking-tight">
              Peminjaman Perkakas &amp; Inventaris
            </h1>
            <p className="text-xs text-slate-500">
              Pencatatan peminjaman alat dengan 1 penanggung jawab tunggal dan pemotongan stok atomik
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/returns"
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              Menu Pengembalian
            </Link>
          </div>
        </div>

        {/* JIKA TRANSAKSI BARU SAJA SELESAI: Tampilkan Bukti Transaksi Saja (Tanpa Form di Bawahnya) */}
        {completedTx ? (
          <div className="bg-white border border-slate-200 rounded p-5 space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Bukti Pencatatan Peminjaman
                </span>
                <h2 className="text-sm font-bold font-heading text-slate-900 mt-0.5 tabular-nums">
                  No. Transaksi {completedTx.transactionNumber}
                </h2>
              </div>
              <span className="text-xs font-bold text-[#1E40AF]">
                Tercatat di Database
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded">
              <div>
                <span className="text-[11px] text-slate-500 block">Penanggung Jawab Peminjaman</span>
                <span className="font-bold text-slate-900 text-xs">
                  {completedTx.employeeName} ({completedTx.employeeNik})
                </span>
                <span className="text-[11px] text-slate-600 block">
                  {completedTx.employeeDept}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Batas Waktu Pengembalian</span>
                <span className="font-bold text-slate-900 text-xs tabular-nums">
                  {new Date(completedTx.expectedReturnDate).toLocaleString('id-ID')}
                </span>
                <span className="text-[11px] text-slate-600 block">
                  Total Dipinjam {completedTx.itemCount} unit
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="font-semibold text-slate-800 block">Rincian Alat yang Dipinjam</span>
              <div className="border border-slate-200 rounded divide-y divide-slate-100">
                {completedTx.items.map((item: SelectedItem) => (
                  <div key={`${item.itemType}-${item.id}`} className="px-3 py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 tabular-nums">{item.code}</span>
                      <span className="text-slate-400 mx-1.5">|</span>
                      <span className="font-medium text-slate-800">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <Link
                href="/returns"
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
              >
                Lihat Daftar Pengembalian
              </Link>
              <button
                type="button"
                onClick={handleStartNewTransaction}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded transition-colors cursor-pointer"
              >
                + Buat Peminjaman Baru
              </button>
            </div>
          </div>
        ) : (
          /* SATU KARTU FORMULIR FOKUS (Berpindah Layar dengan Lanjut / Kembali) */
          <div className="bg-white border border-slate-200 rounded p-5 space-y-4">
            {/* LAYAR 1: PENANGGUNG JAWAB PEMINJAMAN (1 ORANG) */}
            {currentView === 'PIC' && (
              <div className="space-y-4">
                <div className="pb-2.5 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-xs font-bold font-heading text-slate-900 uppercase tracking-wider">
                      Penanggung Jawab Peminjaman
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pilih 1 karyawan yang bertanggung jawab atas pengambilan perkakas ini
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    1 Penanggung Jawab
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Nama Karyawan / Penanggung Jawab *
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select
                      value={employee?.nik || ''}
                      onChange={(e) => handleSelectEmployeeByNik(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1E40AF] cursor-pointer"
                    >
                      <option value="">Pilih 1 Karyawan Penanggung Jawab ({employeesList.length} terdaftar)</option>
                      {employeesList.map((emp) => (
                        <option key={emp.id} value={emp.nik}>
                          {emp.name} ({emp.nik}) | {emp.department} | {emp.shift || 'Shift 1'}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setIsQuickAddEmpOpen(true)}
                      className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors whitespace-nowrap cursor-pointer"
                    >
                      + Tambah Karyawan Baru
                    </button>
                  </div>
                </div>

                {/* Informasi Ringkas 1 Penanggung Jawab Terpilih */}
                {employee ? (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-slate-500">Penanggung Jawab Terpilih</div>
                      <div className="font-bold text-slate-900 text-sm font-heading">
                        {employee.name} <span className="font-mono text-xs font-semibold text-slate-600">({employee.nik})</span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        <span className="font-semibold text-slate-800">{employee.department}</span> | <span className="font-semibold text-slate-800">{employee.shift || 'Shift 1'}</span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-xs font-semibold text-slate-800 block">Status Aktif</span>
                      {employee.loans && employee.loans.length > 0 ? (
                        <span className="text-[11px] text-slate-800 font-semibold">
                          Memiliki {employee.loans.length} pinjaman aktif
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          Tidak ada tanggungan pinjaman
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded text-center text-xs text-slate-500">
                    Silakan pilih 1 karyawan penanggung jawab pada dropdown di atas, atau klik &quot;+ Tambah Karyawan Baru&quot; jika nama belum terdaftar.
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end">
                  <button
                    type="button"
                    disabled={!employee}
                    onClick={() => setCurrentView('ITEMS')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
                  >
                    Lanjut Pilih Alat &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* LAYAR 2: PEMILIHAN ALAT YANG DIPINJAM */}
            {currentView === 'ITEMS' && (
              <div className="space-y-3.5">
                {/* Bar Info Penanggung Jawab + Tombol Kembali */}
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 mr-1.5">Penanggung Jawab</span>
                    <span className="font-bold text-slate-900">{employee?.name}</span>
                    <span className="text-slate-600 font-mono text-[11px] ml-1">({employee?.nik})</span>
                    <span className="text-slate-400 mx-1.5">|</span>
                    <span className="text-slate-600">{employee?.department}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentView('PIC')}
                    className="text-xs font-semibold text-[#1E40AF] hover:underline cursor-pointer"
                  >
                    &larr; Ganti Penanggung Jawab
                  </button>
                </div>

                {/* Filter Katalog (Dropdown 1 Warna + Input Pencarian) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                      Jenis Barang
                    </label>
                    <select
                      value={activeCatalogTab}
                      onChange={(e) => {
                        setActiveCatalogTab(e.target.value as 'TOOL' | 'INVENTORY');
                        setCatalogPage(1);
                      }}
                      className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1E40AF] cursor-pointer"
                    >
                      <option value="TOOL">Tool Mesin ({availableTools.length})</option>
                      <option value="INVENTORY">Inventaris ({availableInventories.length})</option>
                    </select>
                  </div>

                  <div className="flex-1 sm:max-w-xs">
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => {
                        setCatalogSearch(e.target.value);
                        setCatalogPage(1);
                      }}
                      placeholder="Cari kode barang, nama alat, atau rak..."
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1E40AF]"
                    />
                  </div>
                </div>

                {/* Tabel Katalog Ringkas (5 Baris per Halaman) */}
                <div className="overflow-x-auto border border-slate-200 rounded">
                  {isLoadingCatalog ? (
                    <SkeletonTable rows={5} cols={5} className="p-2" />
                  ) : paginatedCatalog.length === 0 ? (
                    <EmptyState
                      title="Barang Tidak Ditemukan"
                      description="Tidak ada perkakas yang cocok dengan kata kunci pencarian."
                      actionLabel="Reset Pencarian"
                      onAction={() => setCatalogSearch('')}
                    />
                  ) : (
                    <table className="w-full text-left text-xs min-w-[520px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold font-heading">
                          <th className="py-2 px-3 whitespace-nowrap">KODE</th>
                          <th className="py-2 px-3">NAMA BARANG</th>
                          <th className="py-2 px-3 whitespace-nowrap">LOKASI RAK</th>
                          <th className="py-2 px-3 text-right whitespace-nowrap text-[#1E40AF]">TERSEDIA</th>
                          <th className="py-2 px-3 text-right whitespace-nowrap w-28">PILIH</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedCatalog.map((item: any) => {
                          const selectedIdx = selectedItems.findIndex(
                            (si) => si.id === item.id && si.itemType === activeCatalogTab
                          );
                          const isSelected = selectedIdx >= 0;
                          const selectedQty = isSelected ? selectedItems[selectedIdx].quantity : 0;

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap tabular-nums">
                                {item.code}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-900">
                                <div className="truncate max-w-[220px]">{item.name}</div>
                              </td>
                              <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                                {item.location || 'Rak Utama'}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-[#1E40AF] tabular-nums whitespace-nowrap">
                                {item.availableStock} {item.unit || 'PCS'}
                              </td>
                              <td className="py-2 px-3 text-right whitespace-nowrap">
                                {isSelected ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateQty(selectedIdx, selectedQty - 1)}
                                      className="w-6 h-6 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-xs cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min={1}
                                      max={item.availableStock}
                                      value={selectedQty}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        if (!isNaN(val)) {
                                          handleUpdateQty(selectedIdx, Math.min(item.availableStock, Math.max(1, val)));
                                        }
                                      }}
                                      aria-label={`Jumlah ${item.name}`}
                                      className="w-11 h-6 text-center font-bold text-slate-900 bg-white border border-slate-300 rounded text-xs tabular-nums focus:outline-none focus:border-[#1E40AF]"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateQty(selectedIdx, selectedQty + 1)}
                                      className="w-6 h-6 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-xs cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleAddItem(item, activeCatalogTab)}
                                    disabled={item.availableStock <= 0}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                                      item.availableStock <= 0
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'text-white bg-[#1E40AF] hover:bg-blue-800'
                                    }`}
                                  >
                                    + Pilih
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Navigasi Halaman Katalog (< dan >) */}
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>
                    Halaman <strong className="text-slate-900">{catalogPage}</strong> dari{' '}
                    <strong className="text-slate-900">{totalCatalogPages}</strong> ({filteredCatalog.length} barang)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                      disabled={catalogPage <= 1}
                      className="min-w-[28px] h-7 px-2 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed text-slate-700 font-bold cursor-pointer"
                    >
                      &lt;
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatalogPage((p) => Math.min(totalCatalogPages, p + 1))}
                      disabled={catalogPage >= totalCatalogPages}
                      className="min-w-[28px] h-7 px-2 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed text-slate-700 font-bold cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Ringkasan Alat Terpilih di Bawah Tabel */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      Alat yang Dipilih ({selectedItems.length} jenis, {totalUnitsSelected} unit)
                    </span>
                    {selectedItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedItems([])}
                        className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                      >
                        Kosongkan Pilihan
                      </button>
                    )}
                  </div>

                  {selectedItems.length === 0 ? (
                    <div className="text-slate-500 text-[11px]">
                      Belum ada alat yang dipilih. Klik tombol &quot;+ Pilih&quot; pada tabel di atas.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200/70 max-h-32 overflow-y-auto">
                      {selectedItems.map((item, idx) => (
                        <div key={`${item.itemType}-${item.id}`} className="py-1.5 flex items-center justify-between gap-2">
                          <div className="truncate">
                            <span className="font-bold text-slate-900 tabular-nums">{item.code}</span>
                            <span className="text-slate-400 mx-1.5">|</span>
                            <span className="text-slate-800 font-medium">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(idx, item.quantity - 1)}
                              className="w-5 h-5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-[11px] cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={item.availableStock}
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) {
                                  handleUpdateQty(idx, Math.min(item.availableStock, Math.max(1, val)));
                                }
                              }}
                              aria-label={`Jumlah ${item.name}`}
                              className="w-10 h-5 text-center font-bold text-[#1E40AF] bg-white border border-slate-300 rounded text-[11px] tabular-nums focus:outline-none focus:border-[#1E40AF]"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(idx, item.quantity + 1)}
                              className="w-5 h-5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-[11px] cursor-pointer"
                            >
                              +
                            </button>
                            <span className="text-[11px] font-semibold text-slate-600 ml-0.5">
                              {item.unit}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-[11px] text-slate-500 hover:text-slate-900 underline cursor-pointer ml-1"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Navigasi Bawah: Kembali / Lanjut */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentView('PIC')}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                  >
                    &larr; Kembali
                  </button>
                  <button
                    type="button"
                    disabled={selectedItems.length === 0}
                    onClick={() => setCurrentView('CONFIRM')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
                  >
                    Lanjut Atur Durasi ({totalUnitsSelected} Unit) &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* LAYAR 3: DURASI PEMINJAMAN, TUJUAN, & KONFIRMASI SIMPAN */}
            {currentView === 'CONFIRM' && (
              <div className="space-y-4">
                <div className="pb-2.5 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-xs font-bold font-heading text-slate-900 uppercase tracking-wider">
                      Durasi Peminjaman &amp; Konfirmasi Akhir
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Periksa kembali penanggung jawab, daftar alat, dan tentukan durasi pinjam
                    </p>
                  </div>
                </div>

                {/* Ringkasan Penanggung Jawab & Alat */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <span className="text-slate-500 mr-1.5">Penanggung Jawab</span>
                      <span className="font-bold text-slate-900">{employee?.name} ({employee?.nik})</span>
                      <span className="text-slate-400 mx-1.5">|</span>
                      <span className="text-slate-600">{employee?.department}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentView('PIC')}
                      className="text-[11px] font-semibold text-[#1E40AF] hover:underline cursor-pointer"
                    >
                      Ubah
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-500">Daftar Alat Dipinjam ({totalUnitsSelected} unit)</span>
                      <button
                        type="button"
                        onClick={() => setCurrentView('ITEMS')}
                        className="text-[11px] font-semibold text-[#1E40AF] hover:underline cursor-pointer"
                      >
                        Ubah Alat
                      </button>
                    </div>
                    <div className="space-y-1">
                      {selectedItems.map((item) => (
                        <div key={`${item.itemType}-${item.id}`} className="flex items-center justify-between text-slate-800">
                          <span>
                            <strong className="font-mono">{item.code}</strong> | {item.name}
                          </span>
                          <span className="font-bold tabular-nums">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pilihan Durasi (Dropdown 1 Warna) & Tanggal Tenggat */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Durasi Peminjaman Shift Kerja *
                    </label>
                    <select
                      value={activePreset}
                      onChange={(e) => setDeadlinePreset(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1E40AF] cursor-pointer"
                    >
                      <option value={8}>1 Shift Kerja (8 Jam)</option>
                      <option value={24}>1 Hari (24 Jam)</option>
                      <option value={72}>3 Hari (72 Jam)</option>
                      <option value={0}>Pilih Tanggal &amp; Jam Manual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tanggal &amp; Jam Tenggat Pengembalian *
                    </label>
                    <input
                      type="datetime-local"
                      value={expectedReturnDate}
                      onChange={(e) => {
                        setExpectedReturnDate(e.target.value);
                        setActivePreset(0);
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#1E40AF]"
                    />
                  </div>
                </div>

                {/* Tujuan & Catatan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tujuan / Keperluan Penugasan
                    </label>
                    <input
                      type="text"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="Contoh: Pengerjaan part CNC Milling..."
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#1E40AF]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Catatan Tambahan (Opsional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Catatan nomor mesin, supervisor, dsb..."
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#1E40AF]"
                    />
                  </div>
                </div>

                {/* Navigasi Bawah: Kembali / Simpan Transaksi */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentView('ITEMS')}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                  >
                    &larr; Kembali Pilih Alat
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitCheckout}
                    disabled={isSubmitting || !employee || selectedItems.length === 0}
                    className="px-5 py-2 text-xs font-bold font-heading text-white bg-[#1E40AF] hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    {isSubmitting ? 'Memproses Transaksi...' : 'Konfirmasi & Simpan Peminjaman'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL CEPAT: TAMBAH KARYAWAN BARU JIKA BELUM ADA DI DAFTAR */}
      {isQuickAddEmpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onClick={() => setIsQuickAddEmpOpen(false)}
        >
          <div
            className="bg-white rounded border border-slate-300 shadow-xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50">
              <span className="text-xs font-bold font-heading text-slate-900 uppercase">
                Daftarkan Karyawan Baru
              </span>
            </div>
            <form onSubmit={handleQuickCreateEmployee} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIK *</label>
                  <input
                    type="text"
                    required
                    value={newEmpNik}
                    onChange={(e) => setNewEmpNik(e.target.value.toUpperCase())}
                    placeholder="Contoh: EMP-0105"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 uppercase focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    placeholder="Nama Operator..."
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Departemen *</label>
                  <select
                    value={newEmpDept}
                    onChange={(e) => setNewEmpDept(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                  >
                    <option value="Machining CNC">Machining CNC</option>
                    <option value="Mould & Dies">Mould &amp; Dies</option>
                    <option value="Quality Control (QC)">Quality Control (QC)</option>
                    <option value="Maintenance Machine">Maintenance Machine</option>
                    <option value="Tool Crib">Tool Crib</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Shift Kerja *</label>
                  <select
                    value={newEmpShift}
                    onChange={(e) => setNewEmpShift(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                  >
                    <option value="Shift 1 (Pagi)">Shift 1 (Pagi)</option>
                    <option value="Shift 2 (Siang)">Shift 2 (Siang)</option>
                    <option value="Shift 3 (Malam)">Shift 3 (Malam)</option>
                    <option value="Non-Shift (Staff)">Non-Shift (Staff)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">No. WhatsApp / Telepon</label>
                <input
                  type="text"
                  value={newEmpPhone}
                  onChange={(e) => setNewEmpPhone(e.target.value)}
                  placeholder="08123456789"
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                />
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickAddEmpOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewEmp}
                  className="px-4 py-1.5 font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingNewEmp ? 'Menyimpan...' : 'Simpan & Pilih Karyawan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
