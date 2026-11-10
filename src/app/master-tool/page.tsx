'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { SkeletonTable } from '@/components/ui/SkeletonTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { ImportExcelModal } from '@/components/modals/ImportExcelModal';

interface Tool {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  category: { id: string; name: string };
  specifications?: string;
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

export default function MasterToolPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [detailTool, setDetailTool] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Form inputs
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSpecs, setFormSpecs] = useState('');
  const [formUnit, setFormUnit] = useState('PCS');
  const [formStock, setFormStock] = useState('1');
  const [formLocation, setFormLocation] = useState('');
  const [formCondition, setFormCondition] = useState('BAIK');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Load categories & initial URL search param + global search listener
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlSearch = params.get('search');
      if (urlSearch !== null) {
        setSearch(urlSearch);
        setPage(1);
      }
    }
    const handleGlobalSearchEvent = (e: Event) => {
      const custom = e as CustomEvent<{ search?: string }>;
      if (custom.detail && typeof custom.detail.search === 'string') {
        setSearch(custom.detail.search);
        setPage(1);
      }
    };
    window.addEventListener('ypti-global-search', handleGlobalSearchEvent);
    return () => window.removeEventListener('ypti-global-search', handleGlobalSearchEvent);
  }, []);

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

  const fetchTools = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        category: categoryFilter,
        page: String(page),
        limit: String(pageSize),
      });
      const res = await fetch(`/api/tools?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTools(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalCount(json.pagination?.total || 0);
      }
    } catch {
      showToast('Gagal memuat master tool.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, page, pageSize, showToast]);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  const handleOpenAdd = () => {
    setEditingTool(null);
    setFormCode('');
    setFormName('');
    setFormSpecs('');
    setFormUnit('PCS');
    setFormStock('10');
    setFormLocation('Rak A-01-A');
    setFormCondition('BAIK');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (tool: Tool) => {
    setEditingTool(tool);
    setFormCode(tool.code);
    setFormName(tool.name);
    setFormCategory(tool.categoryId);
    setFormSpecs(tool.specifications || '');
    setFormUnit(tool.unit);
    setFormStock(String(tool.totalStock));
    setFormLocation(tool.location);
    setFormCondition(tool.condition);
    setIsAddOpen(true);
  };

  const handleOpenDetail = async (toolId: string) => {
    try {
      const res = await fetch(`/api/tools/${toolId}`);
      if (res.ok) {
        const json = await res.json();
        setDetailTool(json.data);
      }
    } catch {
      showToast('Gagal memuat detail tool', 'error');
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
        specifications: formSpecs,
        unit: formUnit,
        totalStock: parseInt(formStock, 10),
        location: formLocation,
        condition: formCondition,
      };

      let res;
      if (editingTool) {
        res = await fetch(`/api/tools/${editingTool.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/tools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Gagal menyimpan data tool.', 'error');
      } else {
        showToast(editingTool ? 'Tool berhasil diperbarui!' : 'Tool baru berhasil ditambahkan!', 'success');
        setIsAddOpen(false);
        fetchTools();
      }
    } catch {
      showToast('Terjadi kesalahan koneksi.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteTool = async (toolId: string, toolCode: string) => {
    const ok = await confirm({
      title: 'Konfirmasi Penonaktifan Tool',
      message: `Konfirmasi penonaktifan / penghapusan master tool "${toolCode}"? Data terkait unit ini tidak akan dapat dipinjamkan kembali.`,
      confirmText: 'Nonaktifkan Tool',
      cancelText: 'Batal',
      type: 'danger',
    });
    if (!ok) return;

    setIsDeleting(toolId);
    try {
      const res = await fetch(`/api/tools/${toolId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Gagal menghapus tool.', 'error');
      } else {
        showToast(json.message || 'Tool berhasil diproses.', 'success');
        fetchTools();
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
        {/* Header Bar matching ERP Titian Pic 3/4/5 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <h1 className="text-base lg:text-lg font-semibold text-slate-900 tracking-tight">
              Data Tool &amp; Perkakas Mesin
            </h1>
            <span className="text-xs font-medium text-slate-500 tabular-nums">
              ({totalCount} data)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <RefreshButton onRefresh={fetchTools} loading={loading} />
            <button
              onClick={() => setIsImportOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              Impor Excel
            </button>

            <button
              onClick={() => window.open('/api/excel/export?type=tools', '_blank')}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              Ekspor Excel
            </button>

            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors"
            >
              + Tambah Tool
            </button>
          </div>
        </div>

        {/* Filter & Search Bar - Flat inline layout */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="w-full sm:max-w-xs">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari kode, nama perkakas, spesifikasi..."
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E40AF] focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
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

        {/* High-density Enterprise Table */}
        {loading ? (
          <div className="border-t border-slate-200 mt-2">
            <SkeletonTable rows={8} cols={12} />
          </div>
        ) : tools.length === 0 ? (
          <EmptyState
            title="Perkakas Tidak Ditemukan"
            description="Tidak ada data perkakas yang cocok dengan kriteria pencarian atau kategori ini."
            actionLabel="Reset Filter"
            onAction={() => { setSearch(''); setCategoryFilter(''); setPage(1); }}
            className="border-t border-slate-200 mt-2"
          />
        ) : (
          <div className="overflow-x-auto border-t border-slate-200 mt-2">
            <table className="min-w-[1000px] w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-heading font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">KODE</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">NAMA PERALATAN</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">KATEGORI</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">SPESIFIKASI TEKNIS</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">SATUAN</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">TOTAL</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">TERSEDIA</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">DIPINJAM</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">LOKASI RAK</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">KONDISI</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">STATUS</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tools.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                      {t.code}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {t.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {t.category?.name || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-[220px] truncate" title={t.specifications || ''}>
                      {t.specifications || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 whitespace-nowrap">
                      {t.unit}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900 whitespace-nowrap tabular-nums">
                      {t.totalStock}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-[#1E40AF] whitespace-nowrap tabular-nums">
                      {t.availableStock}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-600 whitespace-nowrap tabular-nums">
                      {t.borrowedStock}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {t.location}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap font-medium text-[11px]">
                      {t.condition === 'BAIK' ? (
                        <span className="text-slate-700">{t.condition}</span>
                      ) : t.condition === 'PERAWATAN' ? (
                        <span className="text-[#1E40AF] font-semibold">{t.condition}</span>
                      ) : (
                        <span className="text-slate-900 font-bold">{t.condition}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap font-semibold text-xs">
                      {t.status === 'AKTIF' ? (
                        <span className="text-[#1E40AF]">{t.status}</span>
                      ) : (
                        <span className="text-slate-500">{t.status}</span>
                      )}
                    </td>
                    {/* Action icon buttons with hover tooltips */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(t.id)}
                          aria-label="Detail Perkakas"
                          title="Detail Perkakas"
                          className="group relative w-7 h-7 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                            />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 right-0 px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-medium whitespace-nowrap z-20 shadow-xs">
                            Detail Perkakas
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(t)}
                          aria-label="Edit Data Perkakas"
                          title="Edit Data Perkakas"
                          className="group relative w-7 h-7 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                            />
                          </svg>
                          <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 right-0 px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-medium whitespace-nowrap z-20 shadow-xs">
                            Edit Perkakas
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTool(t.id, t.code)}
                          disabled={isDeleting === t.id}
                          aria-label="Hapus Perkakas"
                          title="Hapus Perkakas"
                          className="group relative w-7 h-7 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                            />
                          </svg>
                          <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 right-0 px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-medium whitespace-nowrap z-20 shadow-xs">
                            Hapus Perkakas
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
            itemName="perkakas / tools"
          />
      </div>

      {/* Modal Add / Edit Master Tool - Clean Enterprise Precision Form */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsAddOpen(false)}
        >
          <div
            className="bg-white rounded border border-slate-300 shadow-xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
              <h2 className="text-sm font-heading font-bold text-slate-900">
                {editingTool ? `Edit Master Tool ${editingTool.code}` : 'Tambah Master Tool Baru'}
              </h2>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kode Tool *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingTool}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: TOL-010"
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
                  Nama Tool *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Endmill Carbide 4 Flute D12"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF] focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Spesifikasi &amp; Parameter Teknis
                </label>
                <textarea
                  rows={2}
                  value={formSpecs}
                  onChange={(e) => setFormSpecs(e.target.value)}
                  placeholder="Contoh: Solid Carbide, AlTiN Coating, HRC 55, Shank 12mm"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Satuan *
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
                    Total Stok *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
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
                  Lokasi Penyimpanan Rak / Kabinet *
                </label>
                <input
                  type="text"
                  required
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Contoh: Rak A-02-B atau Kabinet QC-01"
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
                  {formSubmitting ? 'Menyimpan...' : editingTool ? 'Simpan Perubahan' : 'Tambah Tool'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail & Histori Tool */}
      {detailTool && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setDetailTool(null)}
        >
          <div
            className="bg-white rounded border border-slate-300 shadow-xl max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
              <h2 className="text-sm font-heading font-bold text-slate-900">
                Detail &amp; Histori {detailTool.code} ({detailTool.name})
              </h2>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
              {/* Info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Unit</span>
                  <p className="font-bold text-sm text-slate-900 tabular-nums">{detailTool.totalStock} {detailTool.unit}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Tersedia</span>
                  <p className="font-bold text-sm text-[#1E40AF] tabular-nums">{detailTool.availableStock}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Sedang Dipinjam</span>
                  <p className="font-bold text-sm text-slate-600 tabular-nums">{detailTool.borrowedStock}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Lokasi Rak</span>
                  <p className="font-bold text-sm text-slate-800">{detailTool.location}</p>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-800">Spesifikasi Lengkap</span>
                <p className="mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700 leading-relaxed">
                  {detailTool.specifications || 'Tidak ada spesifikasi khusus tercatat.'}
                </p>
              </div>

              {/* History Table */}
              <div>
                <span className="font-semibold text-slate-800">10 Histori Peminjaman Terakhir</span>
                <div className="mt-2 border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-heading font-bold">
                      <tr>
                        <th className="py-2 px-2.5">No. Transaksi</th>
                        <th className="py-2 px-2.5">Peminjam</th>
                        <th className="py-2 px-2.5 text-center">Jumlah</th>
                        <th className="py-2 px-2.5">Tenggat</th>
                        <th className="py-2 px-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailTool.loanItems && detailTool.loanItems.length > 0 ? (
                        detailTool.loanItems.map((li: any) => (
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
                              <span className="text-[11px] font-medium text-slate-700">
                                {li.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            Belum ada histori peminjaman untuk tool ini.
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
                onClick={() => setDetailTool(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Import Excel */}
      <ImportExcelModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={fetchTools}
      />
    </AppShell>
  );
}
