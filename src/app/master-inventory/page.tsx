'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';

interface Inventory {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  category: { id: string; name: string };
  brand?: string;
  model?: string;
  serialNumber?: string;
  trackingType: 'INDIVIDUAL' | 'QUANTITATIVE';
  unit: string;
  totalStock: number;
  availableStock: number;
  borrowedStock: number;
  repairStock: number;
  scrapStock: number;
  location: string;
  condition: string;
  status: string;
}

export default function MasterInventoryPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [trackingFilter, setTrackingFilter] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<Inventory | null>(null);
  const [detailInv, setDetailInv] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Form inputs
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formSerialNumber, setFormSerialNumber] = useState('');
  const [formTrackingType, setFormTrackingType] = useState<'INDIVIDUAL' | 'QUANTITATIVE'>('INDIVIDUAL');
  const [formUnit, setFormUnit] = useState('UNIT');
  const [formStock, setFormStock] = useState('1');
  const [formLocation, setFormLocation] = useState('');
  const [formCondition, setFormCondition] = useState('BAIK');
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setCategories(data.data);
          if (data.data.length > 0 && !formCategory) {
            setFormCategory(data.data[0].id);
          }
        }
      })
      .catch(() => {});
  }, [formCategory]);

  const fetchInventories = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        category: categoryFilter,
        trackingType: trackingFilter,
        page: String(page),
        limit: String(pageSize),
      });
      const res = await fetch(`/api/inventories?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setInventories(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalCount(json.pagination?.total || 0);
      }
    } catch {
      showToast('Gagal memuat master inventaris.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, trackingFilter, page, pageSize, showToast]);

  useEffect(() => {
    fetchInventories();
  }, [fetchInventories]);

  const handleOpenAdd = () => {
    setEditingInv(null);
    setFormCode('');
    setFormName('');
    setFormBrand('');
    setFormModel('');
    setFormSerialNumber('');
    setFormTrackingType('INDIVIDUAL');
    setFormUnit('UNIT');
    setFormStock('1');
    setFormLocation('Lemari QC-01');
    setFormCondition('BAIK');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (inv: Inventory) => {
    setEditingInv(inv);
    setFormCode(inv.code);
    setFormName(inv.name);
    setFormCategory(inv.categoryId);
    setFormBrand(inv.brand || '');
    setFormModel(inv.model || '');
    setFormSerialNumber(inv.serialNumber || '');
    setFormTrackingType(inv.trackingType);
    setFormUnit(inv.unit);
    setFormStock(String(inv.totalStock));
    setFormLocation(inv.location);
    setFormCondition(inv.condition);
    setIsAddOpen(true);
  };

  const handleOpenDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/inventories/${id}`);
      if (res.ok) {
        const json = await res.json();
        setDetailInv(json.data);
      }
    } catch {
      showToast('Gagal memuat detail inventaris', 'error');
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode || !formName || !formCategory || !formLocation) {
      showToast('Mohon lengkapi seluruh kolom wajib.', 'error');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        code: formCode,
        name: formName,
        categoryId: formCategory,
        brand: formBrand,
        model: formModel,
        serialNumber: formSerialNumber,
        trackingType: formTrackingType,
        unit: formUnit,
        totalStock: formTrackingType === 'INDIVIDUAL' ? 1 : parseInt(formStock, 10),
        location: formLocation,
        condition: formCondition,
      };

      let res;
      if (editingInv) {
        res = await fetch(`/api/inventories/${editingInv.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/inventories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Gagal menyimpan data inventaris.', 'error');
      } else {
        showToast(editingInv ? 'Inventaris berhasil diperbarui!' : 'Inventaris baru berhasil ditambahkan!', 'success');
        setIsAddOpen(false);
        fetchInventories();
      }
    } catch {
      showToast('Terjadi kesalahan koneksi.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteInventory = async (id: string, code: string) => {
    const ok = await confirm({
      title: 'Konfirmasi Penonaktifan Inventaris',
      message: `Konfirmasi penonaktifan / penghapusan master inventaris "${code}"? Data terkait unit ini tidak akan dapat dipinjamkan kembali.`,
      confirmText: 'Nonaktifkan Inventaris',
      cancelText: 'Batal',
      type: 'danger',
    });
    if (!ok) return;

    setIsDeleting(id);
    try {
      const res = await fetch(`/api/inventories/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Gagal menghapus inventaris.', 'error');
      } else {
        showToast(json.message || 'Inventaris berhasil diproses.', 'success');
        fetchInventories();
      }
    } catch {
      showToast('Terjadi kesalahan saat menghapus.', 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header Bar matching ERP Titian */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <h1 className="text-sm lg:text-base font-bold text-slate-900 uppercase tracking-tight">
              DATA INVENTARIS (ASET & PERLENGKAPAN)
            </h1>
            <span className="text-xs font-medium px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700">
              {totalCount} data
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open('/api/excel/export?type=inventories', '_blank')}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              Export
            </button>

            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors"
            >
              + Tambah Inventaris
            </button>
          </div>
        </div>

        {/* Filters - Flat inline layout */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="w-full sm:max-w-xs">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari kode, nama, serial number..."
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E40AF] focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={trackingFilter}
              onChange={(e) => {
                setTrackingFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#1E40AF]"
            >
              <option value="">Semua Model Tracking</option>
              <option value="INDIVIDUAL">Pelacakan Individual (Serial Number)</option>
              <option value="QUANTITATIVE">Pengelolaan Kuantitatif (Massal)</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#1E40AF]"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table - Seamless flat layout */}
        <div className="overflow-x-auto border-t border-slate-200 mt-2">
          <table className="min-w-[1100px] w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-heading font-bold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">KODE</th>
                <th className="py-2.5 px-3 whitespace-nowrap">NAMA BARANG</th>
                <th className="py-2.5 px-3 whitespace-nowrap">KATEGORI</th>
                <th className="py-2.5 px-3 whitespace-nowrap">MEREK / MODEL</th>
                <th className="py-2.5 px-3 whitespace-nowrap">SERIAL NUMBER</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">MODEL ASET</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">TOTAL</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">TERSEDIA</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">DIPINJAM</th>
                <th className="py-2.5 px-3 whitespace-nowrap">LOKASI</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">KONDISI</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    Memuat data inventaris...
                  </td>
                </tr>
              ) : inventories.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-slate-400">
                    Tidak ada data inventaris yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                inventories.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                      {i.code}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {i.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {i.category?.name || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {i.brand ? `${i.brand} ${i.model || ''}` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {i.serialNumber || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="text-[11px] font-medium text-slate-600">
                        {i.trackingType === 'INDIVIDUAL' ? 'Serial Number' : 'Kuantitatif'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900 whitespace-nowrap tabular-nums">
                      {i.totalStock} {i.unit}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-[#1E40AF] whitespace-nowrap tabular-nums">
                      {i.availableStock}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-600 whitespace-nowrap tabular-nums">
                      {i.borrowedStock}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {i.location}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                          i.condition === 'BAIK'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : i.condition === 'PERAWATAN'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {i.condition}
                      </span>
                    </td>
                    {/* Clean text action links */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 text-[11px]">
                        <button
                          onClick={() => handleOpenDetail(i.id)}
                          className="text-slate-600 hover:text-slate-950 font-medium hover:underline"
                        >
                          Detail
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={() => handleOpenEdit(i)}
                          className="text-[#1E40AF] hover:text-[#1D4ED8] font-semibold hover:underline"
                        >
                          Edit
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={() => handleDeleteInventory(i.id, i.code)}
                          disabled={isDeleting === i.id}
                          className="text-slate-500 hover:text-rose-700 font-medium hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Reusable Enterprise Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalCount}
          pageSize={pageSize}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          itemName="inventaris"
        />
      </div>

      {/* Modal Add / Edit Inventaris - Clean Enterprise Precision Form */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded border border-slate-300 shadow-xl max-w-lg w-full overflow-hidden border-t-4 border-t-[#1E40AF]">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-heading font-bold text-slate-900">
                {editingInv ? `Edit Inventaris: ${editingInv.code}` : 'Tambah Inventaris Baru'}
              </h2>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 transition-colors">
                Tutup
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kode Inventaris *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingInv}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: INV-010"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 uppercase focus:outline-none focus:border-[#1E40AF] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kategori *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Barang *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Digital Caliper 150mm"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Merek
                  </label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="Contoh: Mitutoyo / Zebra"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Model / Tipe
                  </label>
                  <input
                    type="text"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    placeholder="Contoh: 500-196-30"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>
              </div>

              {/* Model Pengelolaan Barang */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                <span className="font-semibold text-slate-800">Model Pengelolaan Barang:</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="radio"
                      name="trackingType"
                      checked={formTrackingType === 'INDIVIDUAL'}
                      onChange={() => {
                        setFormTrackingType('INDIVIDUAL');
                        setFormStock('1');
                      }}
                      className="accent-[#1E40AF]"
                    />
                    <span>Pelacakan Individual (Aset Berseri/Unit)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="radio"
                      name="trackingType"
                      checked={formTrackingType === 'QUANTITATIVE'}
                      onChange={() => setFormTrackingType('QUANTITATIVE')}
                      className="accent-[#1E40AF]"
                    />
                    <span>Kuantitatif (Banyak Unit Sejenis)</span>
                  </label>
                </div>

                {formTrackingType === 'INDIVIDUAL' ? (
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">
                      Nomor Seri (Serial Number / Barcode Fisik)
                    </label>
                    <input
                      type="text"
                      value={formSerialNumber}
                      onChange={(e) => setFormSerialNumber(e.target.value)}
                      placeholder="Contoh: MT-2024-9901"
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">
                      Total Jumlah Unit *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formStock}
                      onChange={(e) => setFormStock(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Satuan
                  </label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 uppercase focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kondisi
                  </label>
                  <select
                    value={formCondition}
                    onChange={(e) => setFormCondition(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                  >
                    <option value="BAIK">BAIK</option>
                    <option value="PERAWATAN">PERAWATAN</option>
                    <option value="RUSAK">RUSAK</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Lokasi Penyimpanan *
                </label>
                <input
                  type="text"
                  required
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Contoh: Lemari QC-01 atau Meja Dispatch"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF] focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded border border-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors"
                >
                  {formSubmitting ? 'Menyimpan...' : editingInv ? 'Simpan Perubahan' : 'Tambah Inventaris'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail & Histori Inventaris */}
      {detailInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded border border-slate-300 shadow-xl max-w-2xl w-full overflow-hidden border-t-4 border-t-[#1E40AF]">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-heading font-bold text-slate-900">
                Detail Inventaris: {detailInv.code} - {detailInv.name}
              </h2>
              <button onClick={() => setDetailInv(null)} className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 transition-colors">
                Tutup
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Tipe Tracking</span>
                  <p className="font-bold text-slate-900">{detailInv.trackingType}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Serial Number</span>
                  <p className="font-bold text-slate-800">{detailInv.serialNumber || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Tersedia</span>
                  <p className="font-bold text-[#1E40AF] tabular-nums">{detailInv.availableStock} {detailInv.unit}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Lokasi</span>
                  <p className="font-bold text-slate-800">{detailInv.location}</p>
                </div>
              </div>

              {/* History Table */}
              <div>
                <span className="font-semibold text-slate-800">Histori Peminjaman:</span>
                <div className="mt-2 border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-heading font-bold">
                      <tr>
                        <th className="py-2 px-2.5">No. Transaksi</th>
                        <th className="py-2 px-2.5">Peminjam</th>
                        <th className="py-2 px-2.5 text-center">Qty</th>
                        <th className="py-2 px-2.5">Tenggat</th>
                        <th className="py-2 px-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailInv.loanItems && detailInv.loanItems.length > 0 ? (
                        detailInv.loanItems.map((li: any) => (
                          <tr key={li.id} className="hover:bg-slate-50">
                            <td className="py-2 px-2.5 font-bold text-slate-900">
                              {li.loanTransaction?.transactionNumber}
                            </td>
                            <td className="py-2 px-2.5">
                              {li.loanTransaction?.employee?.name} ({li.loanTransaction?.employee?.nik})
                            </td>
                            <td className="py-2 px-2.5 text-center font-bold tabular-nums">
                              {li.quantity}
                            </td>
                            <td className="py-2 px-2.5 tabular-nums">
                              {li.loanTransaction?.expectedReturnDate
                                ? new Date(li.loanTransaction.expectedReturnDate).toLocaleDateString('id-ID')
                                : '-'}
                            </td>
                            <td className="py-2 px-2.5">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                {li.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            Belum ada histori peminjaman untuk inventaris ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setDetailInv(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
