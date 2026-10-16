'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';

export default function MonitoringPage() {
  const { showToast } = useToast();
  const [loans, setLoans] = useState<any[]>([]);
  const [counts, setCounts] = useState({ total: 0, overdue: 0, dueSoon: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'OVERDUE' | 'DUE_SOON'>('ALL');
  const [search, setSearch] = useState('');

  const fetchMonitoring = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        filter,
        search,
      });
      const res = await fetch(`/api/monitoring?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setLoans(json.data || []);
        if (json.counts) setCounts(json.counts);
      }
    } catch {
      showToast('Gagal memuat data monitoring.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter, search, showToast]);

  useEffect(() => {
    fetchMonitoring();
  }, [fetchMonitoring]);

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm lg:text-base font-bold text-slate-900 uppercase tracking-tight">
                MONITORING KETERLAMBATAN & JATUH TEMPO
              </h1>
              {counts.overdue > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-sm bg-[#D94841] text-white">
                  {counts.overdue} Terlambat
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Identifikasi otomatis transaksi yang melewati batas waktu server dan template pengingat langsung WhatsApp / Email
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open('/api/excel/export?type=overdue', '_blank')}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              Export
            </button>

            <button
              onClick={fetchMonitoring}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              Segarkan
            </button>
          </div>
        </div>

        {/* Filter Pills - Flat row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-2 border-b border-slate-200">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                filter === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Aktif ({counts.total})
            </button>
            <button
              onClick={() => setFilter('OVERDUE')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                filter === 'OVERDUE'
                  ? 'bg-rose-900 text-white'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Terlambat Melewati Tenggat ({counts.overdue})
            </button>
            <button
              onClick={() => setFilter('DUE_SOON')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                filter === 'DUE_SOON'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              Jatuh Tempo Hari Ini ({counts.dueSoon})
            </button>
          </div>

          <div className="w-full sm:max-w-xs">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari peminjam, NIK, atau no transaksi..."
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E40AF]"
            />
          </div>
        </div>

        {/* Monitoring Table - Flat borderless */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[950px]">
            <thead className="border-b-2 border-slate-200 text-slate-600 font-semibold font-heading uppercase tracking-wider bg-slate-50/50">
              <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">NO. TRANSAKSI</th>
                  <th className="py-2.5 px-3">IDENTITAS PEMINJAM</th>
                  <th className="py-2.5 px-3">BARANG BELUM KEMBALI</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">WAKTU JATUH TEMPO</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">STATUS & DURASI</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">KONTAK</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">AKSI CEPAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Memeriksa status server waktu pengembalian...
                    </td>
                  </tr>
                ) : loans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      Tidak ada transaksi yang sesuai dengan filter ini.
                    </td>
                  </tr>
                ) : (
                  loans.map((loan) => (
                    <tr
                      key={loan.id}
                      className={loan.status === 'TERLAMBAT' ? 'bg-red-50/20 hover:bg-red-50/40' : 'hover:bg-slate-50'}
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap tabular-nums">
                        {loan.transactionNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{loan.employee?.name}</div>
                        <div className="text-[10px] text-slate-500 tabular-nums">
                          {loan.employee?.nik} | {loan.employee?.department}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 max-w-[240px] truncate font-medium text-slate-800" title={loan.itemsList}>
                        {loan.itemsList}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap tabular-nums">
                        {new Date(loan.expectedReturnDate).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          {loan.status === 'TERLAMBAT' && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FEF2F2] text-[#D94841] border border-red-200 w-fit">
                              Terlambat
                            </span>
                          )}
                          {loan.status === 'MENDEKATI_JATUH_TEMPO' && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FFFBEB] text-amber-700 border border-amber-200 w-fit">
                              Mendekati Jatuh Tempo
                            </span>
                          )}
                          {loan.status === 'DIPINJAM' && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#1E40AF] border border-blue-200 w-fit">
                              Dipinjam
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 font-semibold tabular-nums">
                            {loan.durationText}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {loan.waLink ? (
                            <a
                              href={loan.waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded bg-[#25D366]/10 text-[#075E54] hover:bg-[#25D366]/20 text-[11px] font-bold transition-colors border border-[#25D366]/30"
                              title="Buka WhatsApp dengan pesan template resmi"
                            >
                              WhatsApp
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400">-</span>
                          )}

                          {loan.emailLink && (
                            <a
                              href={loan.emailLink}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] transition-colors"
                              title="Kirim Email"
                            >
                              Email
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <Link
                          href={`/returns?tx=${loan.transactionNumber}`}
                          className="px-2.5 py-1 rounded bg-[#1E40AF] text-white hover:bg-[#1D4ED8] text-[11px] font-semibold transition-colors"
                        >
                          Kembalikan
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AppShell>
    );
  }
