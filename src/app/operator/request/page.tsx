'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { SkeletonTable } from '@/components/ui/SkeletonTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';

interface CatalogItem {
  id: string;
  code: string;
  name: string;
  location: string;
  availableStock: number;
  unit: string;
  maxLifeMinutes?: number;
  category?: { name: string } | null;
}

interface CartRequestItem {
  id: string;
  itemType: 'TOOL' | 'INVENTORY';
  code: string;
  name: string;
  availableStock: number;
  unit: string;
  requestedQty: number;
}

function computePresetDate(hours: number) {
  const d = new Date(Date.now() + hours * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function OperatorRequestPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'TOOL' | 'INVENTORY'>('TOOL');
  const [search, setSearch] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('search') || '';
    }
    return '';
  });
  const [tools, setTools] = useState<CatalogItem[]>([]);
  const [inventories, setInventories] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [cart, setCart] = useState<CartRequestItem[]>([]);
  const [purpose, setPurpose] = useState('Pengerjaan Mesin Produksi Shift Kerja');
  const [expectedReturnDate, setExpectedReturnDate] = useState(() => computePresetDate(8));
  const [activePreset, setActivePreset] = useState<number>(8);
  const [submitting, setSubmitting] = useState(false);

  const applyDeadlinePreset = (hours: number) => {
    setActivePreset(hours);
    if (hours <= 0) return;
    setExpectedReturnDate(computePresetDate(hours));
  };

  useEffect(() => {
    let active = true;
    const loadCatalog = async () => {
      try {
        const [toolRes, invRes] = await Promise.all([
          fetch('/api/tools?limit=200&status=AKTIF'),
          fetch('/api/inventories?limit=200&status=AKTIF'),
        ]);
        if (!active) return;
        if (toolRes.ok) {
          const j = await toolRes.json();
          setTools(j.data || []);
        }
        if (invRes.ok) {
          const j = await invRes.json();
          setInventories(j.data || []);
        }
      } catch {
        if (active) showToast('Gagal memuat katalog perkakas.', 'error');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadCatalog();
    return () => {
      active = false;
    };
  }, [showToast]);

  const currentList = activeTab === 'TOOL' ? tools : inventories;
  const filtered = currentList.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      item.code.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q) ||
      (item.category?.name || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleAddToCart = (item: CatalogItem, itemType: 'TOOL' | 'INVENTORY') => {
    if (item.availableStock <= 0) {
      showToast(`Stok "${item.name}" sedang kosong.`, 'error');
      return;
    }
    const idx = cart.findIndex((c) => c.id === item.id && c.itemType === itemType);
    if (idx >= 0) {
      if (cart[idx].requestedQty + 1 > item.availableStock) {
        showToast(`Maksimal stok tersedia adalah ${item.availableStock}.`, 'error');
        return;
      }
      const next = [...cart];
      next[idx].requestedQty += 1;
      setCart(next);
    } else {
      setCart([
        ...cart,
        {
          id: item.id,
          itemType,
          code: item.code,
          name: item.name,
          availableStock: item.availableStock,
          unit: item.unit || 'PCS',
          requestedQty: 1,
        },
      ]);
    }
  };

  const handleQtyChange = (id: string, itemType: 'TOOL' | 'INVENTORY', qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((c) => !(c.id === id && c.itemType === itemType)));
      return;
    }
    setCart(
      cart.map((c) => {
        if (c.id === id && c.itemType === itemType) {
          return { ...c, requestedQty: Math.min(c.availableStock, qty) };
        }
        return c;
      })
    );
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      showToast('Pilih minimal 1 perkakas atau inventaris terlebih dahulu.', 'error');
      return;
    }
    if (!expectedReturnDate) {
      showToast('Tenggat waktu kembali wajib ditentukan.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/loan-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose,
          expectedReturnDate,
          items: cart.map((c) => ({
            itemType: c.itemType,
            toolId: c.itemType === 'TOOL' ? c.id : undefined,
            inventoryId: c.itemType === 'INVENTORY' ? c.id : undefined,
            requestedQty: c.requestedQty,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Gagal mengirim request pinjam.', 'error');
      } else {
        showToast(
          `Request ${json.data?.requestNumber} berhasil dikirim ke antrean Admin Tool Room.`,
          'success'
        );
        router.push('/operator');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-base lg:text-lg font-semibold text-slate-900 tracking-tight">
              Ajukan Request Pinjam Perkakas &amp; Inventaris
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih barang yang dibutuhkan agar langsung masuk ke antrean loket Admin Tool Room untuk disiapkan.
            </p>
          </div>
          <Link
            href="/operator"
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors self-start sm:self-auto"
          >
            Kembali ke Dasbor Operator
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Katalog Barang (Kiri - 7 kolom) */}
          <div className="lg:col-span-7 min-w-0 bg-white border border-slate-200 rounded p-3.5 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('TOOL');
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded border cursor-pointer transition-colors ${
                    activeTab === 'TOOL'
                      ? 'bg-[#1E40AF] text-white border-[#1E40AF]'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Data Tool ({tools.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('INVENTORY');
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded border cursor-pointer transition-colors ${
                    activeTab === 'INVENTORY'
                      ? 'bg-[#1E40AF] text-white border-[#1E40AF]'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Data Inventaris ({inventories.length})
                </button>
              </div>

              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari kode, nama, atau rak..."
                className="sm:w-56 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E40AF]"
              />
            </div>

            {loading ? (
              <SkeletonTable rows={6} cols={4} />
            ) : paginated.length === 0 ? (
              <EmptyState
                title="Barang Tidak Ditemukan"
                description="Coba kata kunci lain atau ubah kategori antara Tool dan Inventaris."
              />
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-heading font-bold">
                    <tr>
                      <th className="py-2 px-3">KODE &amp; NAMA</th>
                      <th className="py-2 px-3 text-center">STOK SIAP</th>
                      <th className="py-2 px-3 text-right">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginated.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-slate-500">
                            <span className="font-mono font-semibold">{item.code}</span> | {item.location}
                            {activeTab === 'TOOL' && item.maxLifeMinutes
                              ? ` | Umur Std ${item.maxLifeMinutes.toLocaleString('id-ID')} mnt`
                              : ''}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center font-bold tabular-nums">
                          <span className={item.availableStock > 0 ? 'text-[#1E40AF]' : 'text-red-700'}>
                            {item.availableStock} {item.unit}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            disabled={item.availableStock <= 0}
                            onClick={() => handleAddToCart(item, activeTab)}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded disabled:bg-slate-300 cursor-pointer disabled:cursor-not-allowed"
                          >
                            + Pilih
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={(p) => setPage(p)}
              itemName="item katalog"
            />
          </div>

          {/* Keranjang Pengajuan (Kanan - 5 kolom) */}
          <form
            onSubmit={handleSubmitRequest}
            className="lg:col-span-5 min-w-0 bg-white border border-slate-200 rounded p-3.5 sm:p-4 space-y-4 text-xs"
          >
            <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold font-heading text-slate-900 uppercase tracking-wider">
                Daftar Request Pinjam ({cart.length})
              </h2>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-[11px] text-slate-500 hover:text-slate-900 underline cursor-pointer"
                >
                  Kosongkan
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded text-slate-500">
                Belum ada barang dipilih. Klik &quot;+ Pilih&quot; pada daftar katalog.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded">
                {cart.map((c) => (
                  <div key={`${c.itemType}-${c.id}`} className="p-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 truncate">{c.name}</div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {c.code} ({c.itemType})
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(c.id, c.itemType, c.requestedQty - 1)}
                        className="w-6 h-6 rounded border border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold tabular-nums">{c.requestedQty}</span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(c.id, c.itemType, c.requestedQty + 1)}
                        className="w-6 h-6 rounded border border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700">
                Keperluan / Mesin / Job Order *
              </label>
              <input
                type="text"
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Contoh: CNC Milling Makino V33i - Moulding Cavity"
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-[#1E40AF]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700">
                Estimasi Tenggat Kembali *
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  { label: '1 Shift (8 Jam)', hours: 8 },
                  { label: '1 Hari (24 Jam)', hours: 24 },
                  { label: '3 Hari (72 Jam)', hours: 72 },
                ].map((p) => (
                  <button
                    key={p.hours}
                    type="button"
                    onClick={() => applyDeadlinePreset(p.hours)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border cursor-pointer ${
                      activePreset === p.hours
                        ? 'bg-blue-50 text-[#1E40AF] border-[#1E40AF]'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <input
                type="datetime-local"
                required
                value={expectedReturnDate}
                onChange={(e) => {
                  setExpectedReturnDate(e.target.value);
                  setActivePreset(0);
                }}
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 tabular-nums focus:outline-none focus:border-[#1E40AF]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || cart.length === 0}
              className="w-full py-2.5 font-bold font-heading text-white bg-[#1E40AF] hover:bg-blue-800 rounded transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider"
            >
              {submitting ? 'Mengirim Request...' : 'Kirim Request ke Admin Tool Room'}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
