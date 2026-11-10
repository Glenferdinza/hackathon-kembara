'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';

interface Employee {
  id: string;
  nik: string;
  name: string;
  role?: string;
  department: string;
  shift?: string;
  phone?: string;
  email?: string;
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

export default function LoansPage() {
  const { showToast } = useToast();

  // Step 1: Employee Barcode / Input
  const [nikInput, setNikInput] = useState('EMP-0101');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isSearchingEmp, setIsSearchingEmp] = useState(false);
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);

  // Step 2: Item Selection (Tool vs Inventory)
  const [activeCatalogTab, setActiveCatalogTab] = useState<'TOOL' | 'INVENTORY'>('TOOL');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const [availableInventories, setAvailableInventories] = useState<any[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  // Combobox Dropdown & Manual Typing State
  const [comboboxQuery, setComboboxQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [comboboxFilter, setComboboxFilter] = useState<'ALL' | 'TOOL' | 'INVENTORY'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close combobox dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Selected Basket Items
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // Step 3: Tenggat Pengembalian & Catatan (Flowchart Hal. 3)
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [activePreset, setActivePreset] = useState<number>(8); // default 8 hours (1 shift)
  const [purpose, setPurpose] = useState('CNC Milling 03 / Job Part Mould Base');
  const [notes, setNotes] = useState('');

  // Confirmation Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedTx, setCompletedTx] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/employees')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setEmployeesList(json.data);
          const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
          const urlEmp = params?.get('emp') || params?.get('nik');
          if (urlEmp) {
            setNikInput(urlEmp);
            handleSearchEmployee(urlEmp);
          } else if (json.data.length > 0) {
            handleSearchEmployee(json.data[0].nik);
          }
        }
      })
      .catch(() => {});
  }, []);

  const fetchCatalog = async () => {
    setIsLoadingCatalog(true);
    try {
      const [toolRes, invRes] = await Promise.all([
        fetch('/api/tools?limit=50&status=AKTIF'),
        fetch('/api/inventories?limit=50&status=AKTIF'),
      ]);

      if (toolRes.ok) {
        const json = await toolRes.json();
        const toolsList = json.data || [];
        setAvailableTools(toolsList);

        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const urlItem = params?.get('item') || params?.get('tool');
        if (urlItem) {
          const match = toolsList.find((t: any) => t.code.toUpperCase() === urlItem.toUpperCase());
          if (match) {
            handleAddItem(match, 'TOOL');
          }
        }
      }
      if (invRes.ok) {
        const json = await invRes.json();
        const invList = json.data || [];
        setAvailableInventories(invList);

        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const urlItem = params?.get('item') || params?.get('tool');
        if (urlItem) {
          const match = invList.find((i: any) => i.code.toUpperCase() === urlItem.toUpperCase());
          if (match) {
            handleAddItem(match, 'INVENTORY');
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

  useEffect(() => {
    setDeadlinePreset(8);
  }, []);

  const setDeadlinePreset = (hours: number) => {
    setActivePreset(hours);
    const d = new Date(Date.now() + hours * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setExpectedReturnDate(formatted);
  };

  const handleSearchEmployee = async (customNik?: string) => {
    const targetNik = customNik || nikInput;
    if (!targetNik.trim()) {
      showToast('Masukkan NIK atau scan barcode terlebih dahulu.', 'error');
      return;
    }

    setIsSearchingEmp(true);
    try {
      const res = await fetch(`/api/employees?search=${encodeURIComponent(targetNik)}`);
      const json = await res.json();
      if (!res.ok || !json.data || json.data.length === 0) {
        showToast('Karyawan tidak ditemukan.', 'error');
        setEmployee(null);
      } else {
        const emp = json.data[0];
        setEmployee(emp);
        showToast(`Peminjam teridentifikasi: ${emp.name}`, 'success');
      }
    } catch {
      showToast('Gagal memeriksa data karyawan.', 'error');
    } finally {
      setIsSearchingEmp(false);
    }
  };

  const handleAddItem = (item: any, type: 'TOOL' | 'INVENTORY') => {
    if (item.availableStock <= 0) {
      showToast(`Stok "${item.name}" sedang habis!`, 'error');
      return;
    }

    const existingIndex = selectedItems.findIndex((i) => i.id === item.id && i.itemType === type);
    if (existingIndex >= 0) {
      const current = selectedItems[existingIndex];
      if (current.quantity + 1 > item.availableStock) {
        showToast(`Jumlah pinjam melebihi stok tersedia (${item.availableStock} ${item.unit})`, 'error');
        return;
      }
      const updated = [...selectedItems];
      updated[existingIndex].quantity += 1;
      setSelectedItems(updated);
      showToast(`+1 ${item.name} (${updated[existingIndex].quantity} ${item.unit})`, 'success');
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          id: item.id,
          itemType: type,
          code: item.code,
          name: item.name,
          location: item.location,
          availableStock: item.availableStock,
          unit: item.unit,
          quantity: 1,
        },
      ]);
      showToast(`${item.name} ditambahkan ke daftar pinjam`, 'success');
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

  const allAvailableItems = [
    ...availableTools.map((t) => ({ ...t, itemType: 'TOOL' as const })),
    ...availableInventories.map((i) => ({ ...i, itemType: 'INVENTORY' as const })),
  ];

  const filteredDropdownItems = allAvailableItems.filter((item) => {
    if (comboboxFilter === 'TOOL' && item.itemType !== 'TOOL') return false;
    if (comboboxFilter === 'INVENTORY' && item.itemType !== 'INVENTORY') return false;
    if (!comboboxQuery.trim()) return true;
    const q = comboboxQuery.toLowerCase();
    const matchCode = item.code?.toLowerCase().includes(q);
    const matchName = item.name?.toLowerCase().includes(q);
    const matchCategory = item.category?.name?.toLowerCase().includes(q);
    const matchLocation = item.location?.toLowerCase().includes(q);
    const matchBrand = item.brand?.toLowerCase().includes(q);
    const matchSpecs = item.specifications?.toLowerCase().includes(q);
    return Boolean(matchCode || matchName || matchCategory || matchLocation || matchBrand || matchSpecs);
  });

  const handleSelectFromCombobox = (item: any) => {
    handleAddItem(item, item.itemType);
    setComboboxQuery('');
    setIsDropdownOpen(false);
  };

  const handleComboboxKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredDropdownItems.length > 0) {
        const available = filteredDropdownItems.find((i) => i.availableStock > 0) || filteredDropdownItems[0];
        if (available.availableStock > 0) {
          handleSelectFromCombobox(available);
        } else {
          showToast(`Stok "${available.name}" sedang habis!`, 'error');
        }
      } else if (comboboxQuery.trim()) {
        showToast(`Tidak ditemukan alat atau inventaris dengan nama/kode "${comboboxQuery}"`, 'error');
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleOpenConfirm = () => {
    if (!employee) {
      showToast('Harap identifikasi peminjam (karyawan) terlebih dahulu.', 'error');
      return;
    }
    if (selectedItems.length === 0) {
      showToast('Pilih minimal 1 barang untuk dipinjam.', 'error');
      return;
    }
    if (!expectedReturnDate) {
      showToast('Tentukan tenggat waktu pengembalian.', 'error');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleSubmitCheckout = async () => {
    if (!employee || selectedItems.length === 0) return;

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
        showToast(json.error || 'Gagal menyimpan transaksi peminjaman.', 'error');
      } else {
        setCompletedTx(json.data);
        setIsConfirmModalOpen(false);
        setSelectedItems([]);
        showToast(`Transaksi ${json.data.transactionNumber} berhasil dicatat.`, 'success');
        fetchCatalog();
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTools = availableTools.filter(
    (t) =>
      t.code.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      t.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (t.specifications && t.specifications.toLowerCase().includes(catalogSearch.toLowerCase()))
  );

  const filteredInventories = availableInventories.filter(
    (i) =>
      i.code.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      i.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (i.serialNumber && i.serialNumber.toLowerCase().includes(catalogSearch.toLowerCase()))
  );

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-sm lg:text-base font-bold text-slate-900 uppercase tracking-tight">
              Peminjaman Perkakas &amp; Inventaris
            </h1>
            <p className="text-xs text-slate-500">
              Validasi barcode ID card peminjam, pemilihan jenis barang, cek stok real-time, dan simpan transaksi atomik
            </p>
          </div>
        </div>

        {/* Success Banner */}
        {completedTx && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-xs flex items-center justify-between">
            <div>
              <span className="font-bold text-emerald-900">
                Transaksi Berhasil Dicatat: {completedTx.transactionNumber}
              </span>
              <span className="text-emerald-800 ml-2">
                Peminjam: {completedTx.employee?.name} | Tenggat:{' '}
                {new Date(completedTx.expectedReturnDate).toLocaleString('id-ID')}
              </span>
            </div>
            <button
              onClick={() => setCompletedTx(null)}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline ml-4"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Flat 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Panel Samping Identitas Peminjam */}
          <div className="lg:col-span-4 space-y-4">
            <div className="pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Panel Identitas Peminjam
              </span>
              <p className="text-[11px] text-slate-500">
                Scan barcode kartu anggota atau ketik NIK
              </p>
            </div>

            {/* Barcode scanner input */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nikInput}
                  onChange={(e) => setNikInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchEmployee();
                    }
                  }}
                  placeholder="Scan barcode USB / NIK..."
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#1E40AF]"
                />
                <button
                  type="button"
                  onClick={() => handleSearchEmployee()}
                  disabled={isSearchingEmp}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded shrink-0"
                >
                  {isSearchingEmp ? 'Cek...' : 'Validasi'}
                </button>
              </div>

              {/* Quick Select Employee Pill List for Fast Demo */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[11px]">
                <span className="text-slate-400 font-medium">Demo:</span>
                {employeesList.slice(0, 4).map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => {
                      setNikInput(emp.nik);
                      handleSearchEmployee(emp.nik);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                      employee?.id === emp.id
                        ? 'bg-[#1E40AF] text-white font-semibold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {emp.nik}
                  </button>
                ))}
              </div>
            </div>

            {/* Identified Employee Profile Card (Flat seamless layout) */}
            {employee ? (
              <div className="pt-3 border-t border-slate-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-heading font-bold text-slate-900 text-sm block">{employee.name}</span>
                    <span className="text-slate-500 text-[11px]">{employee.nik}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-blue-50 text-[#1E40AF] border border-blue-200">
                    Kartu Aktif
                  </span>
                </div>

                <div className="space-y-1 text-slate-600 text-[11px] pt-1">
                  <div className="flex justify-between border-b border-slate-100 py-1">
                    <span className="text-slate-400">Jabatan / Peran:</span>
                    <span className="font-medium text-slate-800">{employee.role || 'Operator CNC'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 py-1">
                    <span className="text-slate-400">Departemen:</span>
                    <span className="font-medium text-slate-800">{employee.department}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 py-1">
                    <span className="text-slate-400">Shift Kerja:</span>
                    <span className="font-medium text-slate-800">{employee.shift || 'Shift 1 (Pagi)'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 py-1">
                    <span className="text-slate-400">WhatsApp:</span>
                    <span className="font-medium text-slate-800 tabular-nums">{employee.phone || '-'}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded text-[11px] text-slate-600">
                  Foto cocok dengan pekerja di loket. Bebas dari catatan pelanggaran keterlambatan.
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 border-t border-slate-200">
                Scan ID card atau pilih NIK untuk memvalidasi peminjam.
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Katalog Barang, Parameter, & Keranjang Pinjam */}
          <div className="lg:col-span-8 space-y-5">
            {/* FITUR UTAMA: Dropdown & Ketik Manual Alat / Inventaris */}
            <div className="p-4 bg-slate-50 border border-slate-300 rounded space-y-3" ref={dropdownRef}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-heading font-bold text-slate-900 uppercase tracking-wider block">
                    Pilih Alat / Inventaris (Dropdown &amp; Ketik Manual)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Pilih langsung dari dropdown, atau ketik manual nama / kode alat lalu tekan Enter.
                  </p>
                </div>

                {/* Filter group - Clean Segmented Control */}
                <div className="inline-flex p-0.5 bg-slate-200/70 rounded text-[11px]">
                  <button
                    type="button"
                    onClick={() => setComboboxFilter('ALL')}
                    className={`px-2.5 py-0.5 rounded transition-colors ${
                      comboboxFilter === 'ALL'
                        ? 'bg-white text-slate-900 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                  >
                    Semua ({allAvailableItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setComboboxFilter('TOOL')}
                    className={`px-2.5 py-0.5 rounded transition-colors ${
                      comboboxFilter === 'TOOL'
                        ? 'bg-white text-slate-900 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                  >
                    Tools ({availableTools.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setComboboxFilter('INVENTORY')}
                    className={`px-2.5 py-0.5 rounded transition-colors ${
                      comboboxFilter === 'INVENTORY'
                        ? 'bg-white text-slate-900 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                  >
                    Inventaris ({availableInventories.length})
                  </button>
                </div>
              </div>

              {/* Combobox Input with Dropdown Toggle */}
              <div className="relative">
                <div className="flex items-center border border-slate-300 bg-white rounded focus-within:border-[#1E40AF] focus-within:ring-1 focus-within:ring-[#1E40AF] shadow-xs">
                  <input
                    type="text"
                    value={comboboxQuery}
                    onChange={(e) => {
                      setComboboxQuery(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    onKeyDown={handleComboboxKeyDown}
                    placeholder="Ketik manual nama atau kode alat (contoh: Endmill, Caliper, TOOL-001) atau klik tombol di samping..."
                    className="w-full px-3 py-2 text-xs text-slate-900 bg-transparent placeholder-slate-400 focus:outline-none"
                  />
                  {comboboxQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setComboboxQuery('');
                        setIsDropdownOpen(true);
                      }}
                      className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-[11px] font-medium"
                      title="Bersihkan input"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border-l border-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                  >
                    {isDropdownOpen ? 'Tutup Pilihan' : 'Pilih Alat'}
                  </button>
                </div>

                {/* Floating Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded shadow-xl z-30 max-h-72 overflow-y-auto divide-y divide-slate-100">
                    <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-600 flex justify-between items-center sticky top-0 border-b border-slate-200">
                      <span>Daftar Pilihan ({filteredDropdownItems.length} alat tersedia)</span>
                      <span className="text-slate-400 font-normal">Klik untuk menambahkan ke daftar pinjam</span>
                    </div>

                    {filteredDropdownItems.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        Tidak ada alat atau inventaris yang cocok dengan &quot;{comboboxQuery}&quot;.
                      </div>
                    ) : (
                      filteredDropdownItems.map((item) => {
                        const isOutOfStock = item.availableStock <= 0;
                        return (
                          <div
                            key={`${item.itemType}-${item.id}`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              if (!isOutOfStock) {
                                handleSelectFromCombobox(item);
                              }
                            }}
                            onClick={() => {
                              if (!isOutOfStock) {
                                handleSelectFromCombobox(item);
                              }
                            }}
                            className={`p-2.5 flex items-center justify-between text-xs transition-colors ${
                              isOutOfStock
                                ? 'opacity-50 bg-slate-50 cursor-not-allowed'
                                : 'hover:bg-blue-50/80 hover:border-l-2 hover:border-[#1E40AF] cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`px-1.5 py-0.5 text-[9px] font-bold rounded-xs shrink-0 ${
                                  item.itemType === 'TOOL'
                                    ? 'bg-blue-100 text-[#1E40AF]'
                                    : 'bg-indigo-100 text-indigo-700'
                                }`}
                              >
                                {item.itemType === 'TOOL' ? 'TOOL' : 'INV'}
                              </span>
                              <div className="truncate">
                                <span className="font-bold text-slate-900 mr-2">{item.code}</span>
                                <span className="font-semibold text-slate-800">{item.name}</span>
                                <span className="text-[11px] text-slate-400 ml-2">
                                  Lokasi: {item.location || '-'}
                                  {item.specifications ? ` | ${item.specifications}` : ''}
                                  {item.brand ? ` | ${item.brand}` : ''}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 ml-3">
                              <span
                                className={`text-[11px] font-bold tabular-nums ${
                                  isOutOfStock ? 'text-rose-600' : 'text-[#1E40AF]'
                                }`}
                              >
                                {isOutOfStock ? 'Stok Habis' : `Tersedia: ${item.availableStock} ${item.unit}`}
                              </span>
                              {!isOutOfStock && (
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSelectFromCombobox(item);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectFromCombobox(item);
                                  }}
                                  className="px-2 py-0.5 bg-blue-50 text-[#1E40AF] hover:bg-[#1E40AF] hover:text-white border border-[#1E40AF] rounded text-[11px] font-bold transition-colors"
                                >
                                  + Pilih
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Catalog Selector */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-heading font-bold text-slate-900 uppercase tracking-wider">
                    Pilih Jenis Barang:
                  </span>
                  <div className="inline-flex p-0.5 bg-slate-100 rounded border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveCatalogTab('TOOL')}
                      className={`px-3 py-1 rounded transition-colors ${
                        activeCatalogTab === 'TOOL'
                          ? 'bg-white text-slate-900 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 font-medium'
                      }`}
                    >
                      Katalog Tool (Perkakas)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCatalogTab('INVENTORY')}
                      className={`px-3 py-1 rounded transition-colors ${
                        activeCatalogTab === 'INVENTORY'
                          ? 'bg-white text-slate-900 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 font-medium'
                      }`}
                    >
                      Katalog Inventaris (Non-Tool)
                    </button>
                  </div>
                </div>

                <div className="w-full sm:w-60">
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Cari nama, merk, kode..."
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>
              </div>

              {/* Items List (Flat table layout) */}
              <div className="overflow-x-auto max-h-64 overflow-y-auto border-b border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-heading font-bold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">KODE</th>
                      <th className="py-2 px-3">NAMA BARANG</th>
                      <th className="py-2 px-3">PARAMETER / SPESIFIKASI</th>
                      <th className="py-2 px-3 text-center">TERSEDIA</th>
                      <th className="py-2 px-3 text-right">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingCatalog ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          Memuat katalog...
                        </td>
                      </tr>
                    ) : activeCatalogTab === 'TOOL' ? (
                      filteredTools.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 font-bold text-slate-900">{t.code}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">{t.name}</td>
                          <td className="py-2 px-3 text-slate-500 max-w-[200px] truncate">{t.specifications || '-'}</td>
                          <td className="py-2 px-3 text-center font-bold text-[#1E40AF] tabular-nums">
                            {t.availableStock} {t.unit}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleAddItem(t, 'TOOL')}
                              disabled={t.availableStock <= 0}
                              className="text-[#1E40AF] hover:underline font-bold text-xs disabled:opacity-30 disabled:no-underline"
                            >
                              + Pilih
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      filteredInventories.map((i) => (
                        <tr key={i.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 font-bold text-slate-900">{i.code}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">{i.name}</td>
                          <td className="py-2 px-3 text-slate-500 max-w-[200px] truncate">
                            {i.brand ? `${i.brand} ${i.model || ''}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-[#1E40AF] tabular-nums">
                            {i.availableStock} {i.unit}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleAddItem(i, 'INVENTORY')}
                              disabled={i.availableStock <= 0}
                              className="text-[#1E40AF] hover:underline font-bold text-xs disabled:opacity-30 disabled:no-underline"
                            >
                              + Pilih
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Basket (Daftar Pinjam) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-heading font-bold text-slate-900 uppercase tracking-wider">
                  Daftar Barang Dipinjam ({selectedItems.length} item)
                </span>
                {selectedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedItems([])}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Kosongkan Keranjang
                  </button>
                )}
              </div>

              {selectedItems.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Belum ada barang dipilih. Klik &quot;+ Pilih&quot; pada katalog di atas.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border-b border-slate-200">
                  {selectedItems.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{item.code}</span>
                        <span className="font-semibold text-slate-800 ml-2">{item.name}</span>
                        <span className="text-[11px] text-slate-400 ml-2">Lokasi: {item.location}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-slate-300 rounded overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, item.quantity - 1)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                          >
                            -
                          </button>
                          <span className="px-3 py-0.5 font-bold text-slate-900 tabular-nums">
                            {item.quantity} {item.unit}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, item.quantity + 1)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-500 hover:text-rose-700 hover:underline text-[11px]"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            {/* Tenggat Pengembalian & Keperluan (Flowchart Hal. 3 Langkah 24-25) */}
            <div className="pt-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Preset Tenggat */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-heading font-bold text-slate-800 uppercase tracking-wider">
                    Tenggat Pengembalian (Batas Waktu):
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setDeadlinePreset(8)}
                      className={`px-3 py-1 rounded text-xs transition-colors ${
                        activePreset === 8
                          ? 'bg-[#1E40AF] text-white font-bold'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      1 Shift (8 Jam)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeadlinePreset(24)}
                      className={`px-3 py-1 rounded text-xs transition-colors ${
                        activePreset === 24
                          ? 'bg-[#1E40AF] text-white font-bold'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      1 Hari (24 Jam)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeadlinePreset(72)}
                      className={`px-3 py-1 rounded text-xs transition-colors ${
                        activePreset === 72
                          ? 'bg-[#1E40AF] text-white font-bold'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      3 Hari Kerja
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeadlinePreset(168)}
                      className={`px-3 py-1 rounded text-xs transition-colors ${
                        activePreset === 168
                          ? 'bg-[#1E40AF] text-white font-bold'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      7 Hari
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    value={expectedReturnDate}
                    onChange={(e) => {
                      setExpectedReturnDate(e.target.value);
                      setActivePreset(0);
                    }}
                    className="w-full mt-1 bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>

                {/* Keperluan / No. Mesin / No. Job */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-heading font-bold text-slate-800 uppercase tracking-wider">
                    Keperluan / No. Mesin / No. Job (Opsional):
                  </label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Contoh: CNC Milling 03 / Part Mould Base..."
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#1E40AF]"
                  />
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan tambahan kondisi barang..."
                    className="w-full mt-1 bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>
              </div>

              {/* Checkout Button */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Total {selectedItems.reduce((acc, it) => acc + it.quantity, 0)} unit barang akan dialokasikan ke status &quot;Dipinjam&quot;.
                </div>
                <button
                  type="button"
                  onClick={handleOpenConfirm}
                  disabled={!employee || selectedItems.length === 0}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] disabled:bg-slate-300 disabled:cursor-not-allowed rounded transition-colors"
                >
                  Konfirmasi Peminjaman (Langkah 4)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && employee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded border border-slate-300 shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h2 className="text-sm font-heading font-bold text-slate-900">
                Ringkasan Transaksi Peminjaman
              </h2>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                <div><span className="text-slate-500">Peminjam:</span> <span className="font-bold text-slate-900">{employee.name} ({employee.nik})</span></div>
                <div><span className="text-slate-500">Departemen:</span> <span className="text-slate-800">{employee.department}, {employee.shift || 'Shift 1'}</span></div>
                <div><span className="text-slate-500">Tenggat Waktu:</span> <span className="font-bold text-[#1E40AF] tabular-nums">{new Date(expectedReturnDate).toLocaleString('id-ID')}</span></div>
                <div><span className="text-slate-500">Keperluan:</span> <span className="text-slate-800">{purpose || '-'}</span></div>
              </div>

              <div>
                <span className="font-bold text-slate-800 block mb-1">Daftar Barang:</span>
                <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {selectedItems.map((it) => (
                    <div key={it.id} className="p-2 flex justify-between">
                      <span className="font-bold text-slate-900">{it.code} <span className="font-normal text-slate-700">{it.name}</span></span>
                      <span className="font-bold text-[#1E40AF] tabular-nums">{it.quantity} {it.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Stok tersedia akan otomatis dikurangi secara atomik via Prisma `$transaction`. Transaksi akan langsung tercatat di Audit Log dan Dashboard.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded border border-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitCheckout}
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded"
              >
                {isSubmitting ? 'Menyimpan...' : 'Klik Pinjam & Selesaikan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
