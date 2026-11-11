'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { SkeletonTable } from '@/components/ui/SkeletonTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { RefreshButton } from '@/components/ui/RefreshButton';

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
  cardVersion: number;
}

export const isMachineDept = (dept: string = '') => {
  const d = dept.toLowerCase();
  return d.includes('machining') || d.includes('mould') || d.includes('mesin') || d.includes('dies');
};

export default function EmployeesPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  // Form State
  const [nik, setNik] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Operator CNC');
  const [department, setDepartment] = useState('Machining CNC');
  const [shift, setShift] = useState('Shift 1 (Pagi)');
  const [phone, setPhone] = useState('628');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('AKTIF');

  const handleDeptChange = (newDept: string) => {
    setDepartment(newDept);
    if (!isMachineDept(newDept)) {
      setShift('Non-Shift (Reguler)');
    } else if (shift.includes('Non-Shift')) {
      setShift('Shift 1 (Pagi)');
    }
  };
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlSearch = new URLSearchParams(window.location.search).get('search');
      if (urlSearch !== null) {
        setSearch(urlSearch);
      }
    }
    const handleGlobalSearchEvent = (e: Event) => {
      const custom = e as CustomEvent<{ search?: string }>;
      if (custom.detail && typeof custom.detail.search === 'string') {
        setSearch(custom.detail.search);
      }
    };
    window.addEventListener('ypti-global-search', handleGlobalSearchEvent);
    return () => window.removeEventListener('ypti-global-search', handleGlobalSearchEvent);
  }, []);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const json = await res.json();
        let list: Employee[] = json.data || [];
        if (statusFilter) {
          list = list.filter((e) => e.status === statusFilter);
        }
        setEmployees(list);
      }
    } catch {
      showToast('Gagal memuat data anggota.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, showToast]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleOpenAdd = () => {
    setNik('');
    setName('');
    setRole('Operator CNC');
    setDepartment('Machining CNC');
    setShift('Shift 1 (Pagi)');
    setPhone('628');
    setEmail('');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setSelectedEmp(emp);
    setName(emp.name);
    setRole(emp.role || 'Operator CNC');
    setDepartment(emp.department);
    setShift(emp.shift || 'Shift 1 (Pagi)');
    setPhone(emp.phone || '');
    setEmail(emp.email || '');
    setStatus(emp.status);
    setIsEditOpen(true);
  };

  const handleOpenCard = (emp: Employee) => {
    setSelectedEmp(emp);
    setIsCardModalOpen(true);
  };

  // Add Employee (Hal. 7 Flowchart)
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nik || !name || !department) {
      showToast('NIK, Nama, dan Departemen wajib diisi.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nik, name, role, department, shift, phone, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal menambahkan anggota.', 'error');
        return;
      }

      showToast(`Anggota ${cleanNikText(nik)} berhasil didaftarkan.`, 'success');
      setIsAddOpen(false);
      fetchEmployees();
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit / Deactivate Employee (Hal. 7 Flowchart: deactivation check)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedEmp.id,
          name,
          role,
          department,
          shift,
          phone,
          email,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal memperbarui data.', 'error');
        return;
      }

      showToast('Data anggota berhasil diperbarui.', 'success');
      setIsEditOpen(false);
      fetchEmployees();
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Kartu Hilang / Rusak (Hal. 7 Flowchart: Blokir kartu lama, versi +1)
  const handleReplaceCard = async (emp: Employee) => {
    const ok = await confirm({
      title: 'Konfirmasi Penerbitan Kartu Pengganti',
      message: `Konfirmasi penerbitan kartu baru untuk ${emp.nik} (${emp.name})? Versi kartu saat ini (v${emp.cardVersion}) akan dibatalkan/diblokir dan dinaikkan menjadi v${emp.cardVersion + 1}.`,
      confirmText: `Terbitkan Kartu v${emp.cardVersion + 1}`,
      cancelText: 'Batal',
      type: 'warning',
    });
    if (!ok) return;

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'replace_card', id: emp.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal menerbitkan kartu baru.', 'error');
        return;
      }

      showToast(`Kartu baru berhasil diterbitkan: Versi ${data.data.cardVersion}`, 'success');
      fetchEmployees();
      if (selectedEmp && selectedEmp.id === emp.id) {
        setSelectedEmp(data.data);
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    }
  };

  const cleanNikText = (val: string) => val.trim().toUpperCase();

  return (
    <AppShell>
      <div className="space-y-3 pb-24">
        {/* Header - Flowchart Hal. 7: Data Anggota */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base lg:text-lg font-semibold text-slate-900 tracking-tight">
                Data Karyawan
              </h1>
              <span className="text-xs font-medium text-slate-500 tabular-nums">
                ({employees.length} karyawan)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Pengelolaan NIK, nama lengkap, penugasan departemen, shift kerja, dan status aktif anggota
            </p>
          </div>

          <div className="flex items-center gap-2">
            <RefreshButton onRefresh={fetchEmployees} loading={loading} />
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors"
            >
              + Tambah Anggota
            </button>
          </div>
        </div>

        {/* Filters - Flat row without boxed card */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-2 border-b border-slate-200">
          <div className="w-full sm:max-w-xs">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari NIK, nama, atau departemen..."
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E40AF]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs text-slate-500 font-medium whitespace-nowrap">Filter Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#1E40AF]"
            >
              <option value="">Semua Status</option>
              <option value="AKTIF">AKTIF</option>
              <option value="NONAKTIF">NONAKTIF / DIBLOKIR</option>
            </select>
            {(search || statusFilter) && (
              <button
                onClick={() => { setSearch(''); setStatusFilter(''); }}
                className="text-xs text-slate-500 hover:text-slate-800 underline px-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Table View with Skeleton & EmptyState */}
        {loading ? (
          <div className="border-t border-slate-200 mt-2">
            <SkeletonTable rows={7} cols={9} />
          </div>
        ) : employees.length === 0 ? (
          <EmptyState
            title="Tidak Ada Anggota Ditemukan"
            description="Tidak ada data karyawan yang cocok dengan kata kunci pencarian atau filter status."
            actionLabel="Reset Filter"
            onAction={() => { setSearch(''); setStatusFilter(''); }}
            className="border-t border-slate-200 mt-2"
          />
        ) : (
          <div className="overflow-x-auto border-t border-slate-200 mt-2">
            <table className="w-full text-left text-xs min-w-[950px]">
              <thead className="border-b-2 border-slate-200 text-slate-600 font-semibold font-heading uppercase tracking-wider bg-slate-50/50">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">NIK</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">NAMA LENGKAP</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">PERAN / JABATAN</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">DEPARTEMEN</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">SHIFT / JADWAL KERJA</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">KONTAK WHATSAPP</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">VERSI KARTU</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">STATUS</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap tabular-nums">
                      {emp.nik}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                      {emp.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {emp.role || 'Operator CNC'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {emp.department}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isMachineDept(emp.department) ? (
                        <span className="text-slate-800 font-medium">{emp.shift || 'Shift 1 (Pagi)'}</span>
                      ) : (
                        <span className="text-slate-500 font-normal">Non-Shift (Reguler)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap tabular-nums">
                      {emp.phone || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="text-xs font-medium text-slate-700 tabular-nums">
                        v{emp.cardVersion || 1}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap text-xs font-semibold">
                      {emp.status === 'AKTIF' ? (
                        <span className="text-[#1E40AF]">{emp.status}</span>
                      ) : (
                        <span className="text-slate-500">{emp.status}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenCard(emp)}
                          aria-label="Pratinjau Kartu Identitas"
                          title="Pratinjau Kartu Identitas"
                          className="group relative w-7 h-7 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"
                            />
                          </svg>
                          <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 right-0 px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-medium whitespace-nowrap z-20 shadow-xs">
                            Pratinjau Kartu Identitas
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(emp)}
                          aria-label="Edit Data Anggota"
                          title="Edit Data Anggota"
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
                            Edit Data Anggota
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReplaceCard(emp)}
                          aria-label="Terbitkan Kartu Pengganti Baru"
                          title="Terbitkan Kartu Pengganti Baru"
                          className="group relative w-7 h-7 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                            />
                          </svg>
                          <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 right-0 px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-medium whitespace-nowrap z-20 shadow-xs">
                            Ganti Kartu Baru
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
      </div>

      {/* MODAL 1 TAMBAH ANGGOTA */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onClick={() => setIsAddOpen(false)}
        >
          <div
            className="bg-white rounded border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-xs font-bold font-heading text-slate-900 uppercase">Tambah Anggota Baru</h2>
              <p className="text-[11px] text-slate-500">Pendaftaran Identitas &amp; Penugasan Anggota</p>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NIK / ID Karyawan *
                  </label>
                  <input
                    type="text"
                    required
                    value={nik}
                    onChange={(e) => setNik(e.target.value.toUpperCase())}
                    placeholder="Contoh EMP-0106"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 uppercase tabular-nums focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh Ahmad Fauzi"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Peran / Jabatan *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                  >
                    <option value="Operator CNC">Operator CNC</option>
                    <option value="Teknisi Moulding">Teknisi Moulding</option>
                    <option value="CAD/CAM & Design Engineer">CAD/CAM &amp; Design Engineer</option>
                    <option value="Marketing & Sales">Marketing &amp; Sales</option>
                    <option value="Staff Administrasi / HR">Staff Administrasi / HR</option>
                    <option value="QC Inspector">QC Inspector</option>
                    <option value="Teknisi Maintenance">Teknisi Maintenance</option>
                    <option value="Supervisor Produksi">Supervisor Produksi</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Departemen *
                  </label>
                  <select
                    value={department}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                  >
                    <option value="Machining CNC">Machining CNC (Mesin 24 Jam)</option>
                    <option value="Mould Making">Mould Making (Mesin 24 Jam)</option>
                    <option value="Engineering & Design">Engineering &amp; Design (Non-Shift)</option>
                    <option value="Marketing & Sales">Marketing &amp; Sales (Non-Shift)</option>
                    <option value="Administrasi & HR">Administrasi &amp; HR (Non-Shift)</option>
                    <option value="QC (Quality Control)">QC (Quality Control)</option>
                    <option value="Maintenance & Utility">Maintenance &amp; Utility</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jadwal / Shift Kerja *
                  </label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                  >
                    <option value="Shift 1 (Pagi)">Shift 1 (Pagi 07.00 - 15.00)</option>
                    <option value="Shift 2 (Siang)">Shift 2 (Siang 15.00 - 23.00)</option>
                    <option value="Shift 3 (Malam)">Shift 3 (Malam 23.00 - 07.00)</option>
                    <option value="Non-Shift (Jam Kantor)">Non-Shift (Jam Kantor 08.00 - 17.00)</option>
                  </select>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {isMachineDept(department)
                      ? 'Departemen mesin 24 jam umumnya beroperasi 3 shift.'
                      : 'Divisi non-lapangan (design, marketing, admin) beroperasi non-shift.'}
                  </span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    WhatsApp (Notifikasi)
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="628123456789"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 tabular-nums focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Perusahaan (Opsional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ahmad.fauzi@ypti.co.id"
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Anggota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2 EDIT ANGGOTA & STATUS BLOKIR */}
      {isEditOpen && selectedEmp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onClick={() => setIsEditOpen(false)}
        >
          <div
            className="bg-white rounded border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-xs font-bold font-heading text-slate-900 uppercase">
                Edit Data Anggota {selectedEmp.nik}
              </h2>
              <p className="text-[11px] text-slate-500">
                Ubah data atau kelola status aktif dan blokir kartu
              </p>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NIK (Tidak Dapat Diubah)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedEmp.nik}
                    className="w-full bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 tabular-nums text-slate-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Peran / Jabatan
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                  >
                    <option value="Operator CNC">Operator CNC</option>
                    <option value="Teknisi Moulding">Teknisi Moulding</option>
                    <option value="CAD/CAM & Design Engineer">CAD/CAM &amp; Design Engineer</option>
                    <option value="Marketing & Sales">Marketing &amp; Sales</option>
                    <option value="Staff Administrasi / HR">Staff Administrasi / HR</option>
                    <option value="QC Inspector">QC Inspector</option>
                    <option value="Teknisi Maintenance">Teknisi Maintenance</option>
                    <option value="Supervisor Produksi">Supervisor Produksi</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Departemen
                  </label>
                  <select
                    value={department}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                  >
                    <option value="Machining CNC">Machining CNC (Mesin 24 Jam)</option>
                    <option value="Mould Making">Mould Making (Mesin 24 Jam)</option>
                    <option value="Engineering & Design">Engineering &amp; Design (Non-Shift)</option>
                    <option value="Marketing & Sales">Marketing &amp; Sales (Non-Shift)</option>
                    <option value="Administrasi & HR">Administrasi &amp; HR (Non-Shift)</option>
                    <option value="QC (Quality Control)">QC (Quality Control)</option>
                    <option value="Maintenance & Utility">Maintenance &amp; Utility</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jadwal / Shift Kerja *
                  </label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                  >
                    <option value="Shift 1 (Pagi)">Shift 1 (Pagi 07.00 - 15.00)</option>
                    <option value="Shift 2 (Siang)">Shift 2 (Siang 15.00 - 23.00)</option>
                    <option value="Shift 3 (Malam)">Shift 3 (Malam 23.00 - 07.00)</option>
                    <option value="Non-Shift (Jam Kantor)">Non-Shift (Jam Kantor 08.00 - 17.00)</option>
                  </select>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {isMachineDept(department)
                      ? 'Departemen mesin 24 jam umumnya beroperasi 3 shift.'
                      : 'Divisi non-lapangan (design, marketing, admin) beroperasi non-shift.'}
                  </span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status Akun &amp; Kartu
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-[#1E40AF]"
                  >
                    <option value="AKTIF">AKTIF (Dapat Meminjam)</option>
                    <option value="NONAKTIF">NONAKTIF (Kartu Diblokir)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Kontak WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 tabular-nums focus:outline-none focus:border-[#1E40AF]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3 PRATINJAU KARTU ANGGOTA RESMI PT YPTI */}
      {isCardModalOpen && selectedEmp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onClick={() => setIsCardModalOpen(false)}
        >
          <div
            className="bg-white rounded border border-slate-300 shadow-xl max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50">
              <span className="text-xs font-bold font-heading text-slate-900 uppercase">
                Kartu Tanda Anggota PT YPTI
              </span>
            </div>

            <div className="p-5 text-xs flex flex-col items-center">
              {/* Card Body - Flat Pure White Industrial */}
              <div
                id="printable-employee-card"
                className="w-full border-2 border-slate-800 rounded-md p-4 bg-white text-center shadow-xs"
              >
                <div className="border-b border-slate-200 pb-2 mb-3 flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-900 tracking-wider">
                      PT YOGYA PRESISI TEHNIKATAMA INDUSTRI
                    </p>
                    <p className="text-[9px] text-slate-500 uppercase font-semibold">
                      TOOL ROOM &amp; INVENTORY ID CARD
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 tabular-nums">
                    v{selectedEmp.cardVersion || 1}
                  </span>
                </div>

                {/* Photo & Identity */}
                <div className="my-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-slate-700 font-bold text-lg mb-2">
                    {selectedEmp.name.charAt(0)}
                  </div>
                  <h3 className="font-bold font-heading text-slate-900 text-sm">
                    {selectedEmp.name}
                  </h3>
                  <div className="mt-1">
                    <span className="text-xs font-bold tracking-widest text-slate-900 font-mono tabular-nums">
                      NIK {selectedEmp.nik}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-700 mt-2">
                    {selectedEmp.role || 'Operator CNC'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {selectedEmp.department} | {selectedEmp.shift || 'Shift 1'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 tabular-nums">
                    Kontak {selectedEmp.phone || '-'}
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-200 text-[9px] text-slate-500">
                  Kartu resmi tanda pengenal peminjaman dan pengembalian perkakas PT YPTI.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 w-full flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setIsCardModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleReplaceCard(selectedEmp)}
                    className="px-3 py-1.5 text-xs text-slate-700 bg-slate-100 border border-slate-300 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Ganti Kartu
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded transition-colors cursor-pointer"
                  >
                    Cetak Kartu
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
