'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
              <h1 className="text-sm lg:text-base font-bold text-slate-900 uppercase tracking-tight">
                DATA ANGGOTA & IDENTITAS PEMINJAM
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700">
                {employees.length} anggota
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Sesuai SOP Hal. 7: Pengelolaan NIK, departemen, shift kerja, status blokir, dan cetak kartu Code 128
            </p>
          </div>

          <div className="flex items-center gap-2">
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
            <label className="text-xs text-slate-500 font-medium whitespace-nowrap">Filter Status:</label>
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

        {/* Table - Flat borderless enterprise layout */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[950px]">
            <thead className="border-b-2 border-slate-200 text-slate-600 font-semibold font-heading uppercase tracking-wider bg-slate-50/50">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">NIK (ID BARCODE)</th>
                <th className="py-2.5 px-3">NAMA LENGKAP</th>
                <th className="py-2.5 px-3">PERAN / JABATAN</th>
                <th className="py-2.5 px-3">DEPARTEMEN</th>
                <th className="py-2.5 px-3">SHIFT KERJA</th>
                <th className="py-2.5 px-3 whitespace-nowrap">KONTAK WHATSAPP</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">VERSI KARTU</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">STATUS</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Memuat data anggota PT YPTI...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada anggota ditemukan dengan kriteria pencarian ini.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap tabular-nums">
                      {emp.nik}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {emp.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {emp.role || 'Operator CNC'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {emp.department}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {emp.shift || 'Shift 1 (Pagi)'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap tabular-nums">
                      {emp.phone || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
                        v{emp.cardVersion || 1}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          emp.status === 'AKTIF'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 text-[11px]">
                        <button
                          onClick={() => handleOpenCard(emp)}
                          className="text-slate-600 hover:text-slate-900 font-medium hover:underline"
                          title="Cetak Kartu Ber-barcode"
                        >
                          Kartu
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="text-[#1E40AF] hover:underline font-semibold"
                        >
                          Edit
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={() => handleReplaceCard(emp)}
                          className="text-slate-500 hover:text-amber-800 hover:underline font-medium"
                          title="Tandai Hilang/Rusak & Cetak Versi Baru"
                        >
                          Ganti Kartu
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: TAMBAH ANGGOTA (Hal. 7) */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded border border-slate-200 border-t-4 border-t-[#1E40AF] shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-xs font-bold font-heading text-slate-900 uppercase">Tambah Anggota Baru</h2>
                <p className="text-[11px] text-slate-500">SOP Hal. 7: Pendaftaran NIK & Pembuatan Barcode Otomatis</p>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 transition-colors">
                Tutup
              </button>
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
                    placeholder="Contoh: EMP-0106"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 uppercase tabular-nums focus:outline-none focus:border-[#1E40AF]"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Akan digenerate ke Barcode Code 128</p>
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
                    placeholder="Contoh: Ahmad Fauzi"
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
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                  >
                    <option value="Machining CNC">Machining CNC</option>
                    <option value="Mould Making">Mould Making</option>
                    <option value="QC (Quality Control)">QC (Quality Control)</option>
                    <option value="Maintenance & Utility">Maintenance & Utility</option>
                    <option value="Engineering & Design">Engineering & Design</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Shift Kerja *
                  </label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                  >
                    <option value="Shift 1 (Pagi)">Shift 1 (Pagi: 07.00 - 15.00)</option>
                    <option value="Shift 2 (Siang)">Shift 2 (Siang: 15.00 - 23.00)</option>
                    <option value="Shift 3 (Malam)">Shift 3 (Malam: 23.00 - 07.00)</option>
                    <option value="Non-Shift (Office)">Non-Shift (Office: 08.00 - 17.00)</option>
                  </select>
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
                  {isSubmitting ? 'Menyimpan...' : 'Simpan & Buat Barcode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT ANGGOTA & STATUS BLOKIR (Hal. 7) */}
      {isEditOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded border border-slate-200 border-t-4 border-t-[#1E40AF] shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-xs font-bold font-heading text-slate-900 uppercase">
                  Edit Data Anggota: {selectedEmp.nik}
                </h2>
                <p className="text-[11px] text-slate-500">
                  Ubah data atau kelola status aktif/blokir kartu
                </p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 transition-colors">
                Tutup
              </button>
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
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                  >
                    <option value="Machining CNC">Machining CNC</option>
                    <option value="Mould Making">Mould Making</option>
                    <option value="QC (Quality Control)">QC (Quality Control)</option>
                    <option value="Maintenance & Utility">Maintenance & Utility</option>
                    <option value="Engineering & Design">Engineering & Design</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Shift Kerja
                  </label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF]"
                  >
                    <option value="Shift 1 (Pagi)">Shift 1 (Pagi: 07.00 - 15.00)</option>
                    <option value="Shift 2 (Siang)">Shift 2 (Siang: 15.00 - 23.00)</option>
                    <option value="Shift 3 (Malam)">Shift 3 (Malam: 23.00 - 07.00)</option>
                    <option value="Non-Shift (Office)">Non-Shift (Office: 08.00 - 17.00)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status Akun & Kartu
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={`w-full border rounded px-2.5 py-1.5 font-bold ${
                      status === 'AKTIF'
                        ? 'border-blue-300 bg-blue-50 text-[#1E40AF]'
                        : 'border-rose-300 bg-rose-50 text-rose-700'
                    }`}
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

      {/* MODAL 3: CETAK KARTU ANGGOTA DENGAN BARCODE CODE 128 (Hal. 7 Flowchart) */}
      {isCardModalOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded border border-slate-200 border-t-4 border-t-[#1E40AF] shadow-xl max-w-sm w-full overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-bold font-heading text-slate-900 uppercase">
                Pratinjau Kartu Anggota (Code 128)
              </span>
              <button onClick={() => setIsCardModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 transition-colors">
                Tutup
              </button>
            </div>

            <div className="p-5 text-xs flex flex-col items-center">
              {/* Card Body */}
              <div className="w-full border-2 border-slate-800 rounded-lg p-4 bg-gradient-to-b from-white to-slate-50 shadow-sm text-center">
                <div className="border-b border-slate-300 pb-2 mb-3 flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-900 tracking-wider">PT YOGYA PRESISI TEHNIKATAMA INDUSTRI</p>
                    <p className="text-[9px] text-slate-500 uppercase">TOOL CRIB & INVENTORY CARD</p>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 tabular-nums">
                    v{selectedEmp.cardVersion || 1}
                  </span>
                </div>

                {/* Photo & Identity */}
                <div className="my-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-slate-200 border-2 border-slate-400 flex items-center justify-center text-slate-600 font-bold text-lg mb-2">
                    {selectedEmp.name.charAt(0)}
                  </div>
                  <h3 className="font-bold font-heading text-slate-900 text-sm">{selectedEmp.name}</h3>
                  <p className="text-[11px] font-medium text-slate-700">{selectedEmp.role || 'Operator CNC'}</p>
                  <p className="text-[10px] text-slate-500">{selectedEmp.department} &bull; {selectedEmp.shift}</p>
                </div>

                {/* Barcode Code 128 Visual */}
                <div className="mt-4 pt-3 border-t border-dashed border-slate-300">
                  <div className="inline-block py-2 px-4 bg-white border border-slate-200 rounded">
                    {/* Barcode graphic lines */}
                    <div className="flex items-center justify-center gap-[2px] h-10 w-44 mx-auto mb-1">
                      <div className="w-[3px] h-full bg-black"></div>
                      <div className="w-[1px] h-full bg-black"></div>
                      <div className="w-[4px] h-full bg-black"></div>
                      <div className="w-[2px] h-full bg-black"></div>
                      <div className="w-[1px] h-full bg-black"></div>
                      <div className="w-[3px] h-full bg-black"></div>
                      <div className="w-[5px] h-full bg-black"></div>
                      <div className="w-[2px] h-full bg-black"></div>
                      <div className="w-[1px] h-full bg-black"></div>
                      <div className="w-[4px] h-full bg-black"></div>
                      <div className="w-[2px] h-full bg-black"></div>
                      <div className="w-[3px] h-full bg-black"></div>
                      <div className="w-[1px] h-full bg-black"></div>
                      <div className="w-[4px] h-full bg-black"></div>
                      <div className="w-[2px] h-full bg-black"></div>
                      <div className="w-[3px] h-full bg-black"></div>
                      <div className="w-[1px] h-full bg-black"></div>
                      <div className="w-[2px] h-full bg-black"></div>
                    </div>
                    <span className="text-xs font-bold tracking-widest text-slate-900 tabular-nums">
                      *{selectedEmp.nik}*
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-[9px] text-slate-400">
                  Kartu resmi wajib dipindai saat pengambilan dan pengembalian tool.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 w-full flex items-center justify-between gap-2">
                <button
                  onClick={() => handleReplaceCard(selectedEmp)}
                  className="px-3 py-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-300 rounded hover:bg-amber-100"
                >
                  Ganti Kartu (Hilang/Rusak)
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors"
                >
                  Cetak Kartu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
