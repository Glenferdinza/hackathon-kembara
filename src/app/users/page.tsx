'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { SkeletonTable } from '@/components/ui/SkeletonTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { RefreshButton } from '@/components/ui/RefreshButton';

interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | string;
  department: string;
  status: 'AKTIF' | 'NONAKTIF' | string;
  createdAt: string;
  loansHandled: number;
  returnsHandled: number;
}

export default function UsersAccessPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDepartment, setFormDepartment] = useState('Tool Room & Central Warehouse');
  const [formRole, setFormRole] = useState<'SUPER_ADMIN' | 'ADMIN'>('ADMIN');
  const [formStatus, setFormStatus] = useState<'AKTIF' | 'NONAKTIF'>('AKTIF');
  const [formPassword, setFormPassword] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (roleFilter) query.set('role', roleFilter);
      if (statusFilter) query.set('status', statusFilter);

      const res = await fetch(`/api/users?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setUsers(json.data || []);
      } else {
        const json = await res.json().catch(() => ({}));
        showToast(json.error || 'Gagal memuat daftar akun pengguna.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi saat memuat daftar akun.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const getRoleLabel = (role: string) => {
    if (role === 'SUPER_ADMIN') return 'Super Admin';
    if (role === 'ADMIN') return 'Admin';
    return role;
  };

  const getRoleScopeSummary = (role: string) => {
    if (role === 'SUPER_ADMIN') {
      return 'Akses penuh seluruh sistem termasuk manajemen pengguna dan hak akses';
    }
    if (role === 'ADMIN') {
      return 'Mengelola operasional transaksi, monitoring, karyawan, serta master tool dan inventaris tanpa akses manajemen akun pengguna';
    }
    return 'Akses standar';
  };

  const suggestedNextId =
    users.length > 0
      ? (Math.max(...users.map((u) => parseInt(u.email, 10) || 10000)) + 1).toString()
      : '10003';

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail(suggestedNextId);
    setFormDepartment('Loket Dispatch Tool Room');
    setFormRole('ADMIN');
    setFormStatus('AKTIF');
    setFormPassword('');
    setShowFormPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: UserAccount) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormDepartment(u.department || 'Tool Room & Warehouse');
    setFormRole(u.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN');
    setFormStatus((u.status === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF') as 'AKTIF' | 'NONAKTIF');
    setFormPassword('');
    setShowFormPassword(false);
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingUser) {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            email: formEmail,
            department: formDepartment,
            role: formRole,
            status: formStatus,
            newPassword: formPassword,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          showToast(json.error || 'Gagal memperbarui hak akses akun.', 'error');
        } else {
          showToast(`Hak akses akun ${formName} berhasil diperbarui.`, 'info');
          setIsModalOpen(false);
          fetchUsers();
        }
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            email: formEmail,
            department: formDepartment,
            role: formRole,
            status: formStatus,
            password: formPassword,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          showToast(json.error || 'Gagal membuat akun baru.', 'error');
        } else {
          showToast(`Akun ${formName} berhasil didaftarkan.`, 'info');
          setIsModalOpen(false);
          fetchUsers();
        }
      }
    } catch {
      showToast('Terjadi gangguan jaringan saat menyimpan akun.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (u: UserAccount) => {
    const ok = await confirm({
      title: `Hapus Akun Pengguna ${u.name}`,
      message: `Apakah Anda yakin ingin menghapus akun ${u.name} (ID ${u.email})? Hak akses login akun ini akan langsung dicabut seketika.`,
      confirmText: 'Ya, Cabut & Hapus',
      cancelText: 'Batal',
      type: 'danger',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Gagal menghapus akun pengguna.', 'error');
      } else {
        showToast(json.message || `Akun ${u.name} berhasil dihapus.`, 'info');
        fetchUsers();
      }
    } catch {
      showToast('Terjadi kesalahan koneksi saat menghapus akun.', 'error');
    }
  };

  return (
    <AppShell>
      <div className="space-y-4 pb-16">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-base lg:text-lg font-semibold font-heading text-slate-900 tracking-tight">
              Manajemen Akun &amp; Hak Akses
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola siapa saja petugas yang diizinkan masuk ke sistem dan batasan menu per akun
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <RefreshButton onRefresh={fetchUsers} loading={loading} />
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded transition-colors cursor-pointer"
            >
              + Tambah Akun Pengguna
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama pengguna, ID Login angka, atau departemen..."
              className="flex-1 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E40AF]"
            />

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filter Role Akses"
                className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded px-3 py-1.5 focus:outline-none focus:border-[#1E40AF] cursor-pointer"
              >
                <option value="">Semua Level Akses</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN">Admin</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter Status Akun"
                className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded px-3 py-1.5 focus:outline-none focus:border-[#1E40AF] cursor-pointer"
              >
                <option value="">Semua Status</option>
                <option value="AKTIF">Status Aktif</option>
                <option value="NONAKTIF">Akses Dicabut</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto border border-slate-200 rounded">
            {loading ? (
              <div className="p-3">
                <SkeletonTable rows={4} cols={6} />
              </div>
            ) : users.length === 0 ? (
              <EmptyState
                title="Tidak Ada Akun Pengguna Ditemukan"
                description="Belum ada akun yang sesuai dengan filter pencarian saat ini."
                actionLabel="Reset Filter"
                onAction={() => {
                  setSearch('');
                  setRoleFilter('');
                  setStatusFilter('');
                }}
              />
            ) : (
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold font-heading uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap">ID LOGIN</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">NAMA PENGGUNA</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">DEPARTEMEN</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">HAK AKSES</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">STATUS LOGIN</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        {u.email}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {u.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {u.department}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`font-semibold text-xs ${
                            u.role === 'SUPER_ADMIN' ? 'text-[#1E40AF]' : 'text-slate-800'
                          }`}
                        >
                          {getRoleLabel(u.role)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {u.status === 'AKTIF' ? (
                          <span className="text-xs font-semibold text-[#1E40AF]">
                            AKTIF
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-500">
                            AKSES DICABUT
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            aria-label="Edit Hak Akses"
                            title="Edit Hak Akses"
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
                              Edit Hak Akses
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            aria-label="Hapus Akun"
                            title="Hapus Akun"
                            className="group relative w-7 h-7 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                            <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 right-0 px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-medium whitespace-nowrap z-20 shadow-xs">
                              Hapus Akun
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal Tambah / Edit Akun Pengguna */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded border border-slate-200 shadow-lg max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xs font-bold font-heading text-slate-900 uppercase">
                {editingUser ? `Edit Hak Akses (${editingUser.name})` : 'Tambah Akun Pengguna Baru'}
              </h2>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap Petugas *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh Budi Hartono"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-slate-900 focus:outline-none focus:border-[#1E40AF]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ID Login (Angka) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value.replace(/\D/g, ''))}
                  placeholder="Contoh 10004"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono font-bold tabular-nums text-slate-900 focus:outline-none focus:border-[#1E40AF]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Departemen / Unit Kerja *
                </label>
                <input
                  type="text"
                  required
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  placeholder="Contoh Loket Dispatch Tool Room"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-slate-900 focus:outline-none focus:border-[#1E40AF]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Level Hak Akses (Role) *
                </label>
                <select
                  value={formRole}
                  onChange={(e) =>
                    setFormRole(e.target.value as 'SUPER_ADMIN' | 'ADMIN')
                  }
                  className="w-full bg-white border border-slate-300 text-slate-800 font-semibold rounded px-2.5 py-1.5 focus:outline-none focus:border-[#1E40AF] cursor-pointer"
                >
                  <option value="ADMIN">Admin (Operasional &amp; Master Data)</option>
                  <option value="SUPER_ADMIN">Super Admin (Pimpinan / Boss)</option>
                </select>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600">
                {getRoleScopeSummary(formRole)}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    {editingUser ? 'Ganti Kata Sandi Baru (Kosongkan jika tetap)' : 'Kata Sandi Login *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowFormPassword((prev) => !prev)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    {showFormPassword ? 'Sembunyikan' : 'Tampilkan'}
                  </button>
                </div>
                <input
                  type={showFormPassword ? 'text' : 'password'}
                  required={!editingUser}
                  minLength={6}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingUser ? 'Minimal 6 karakter untuk reset sandi' : 'Minimal 6 karakter'}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-slate-900 focus:outline-none focus:border-[#1E40AF]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 disabled:bg-slate-300 rounded transition-colors cursor-pointer"
                >
                  {submitting
                    ? 'Menyimpan...'
                    : editingUser
                    ? 'Simpan Perubahan Akses'
                    : 'Daftarkan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

