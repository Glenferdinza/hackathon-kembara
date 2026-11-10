'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { SkeletonTable } from '@/components/ui/SkeletonTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { RefreshButton } from '@/components/ui/RefreshButton';

function computeLiveTiming(expectedReturnDate: string, nowMs: number, fallbackDurationText?: string) {
  if (!nowMs) {
    return {
      statusLabel: 'Memeriksa Tenggat',
      detailText: fallbackDurationText || '-',
      isOverdue: false,
      isDueSoon: false,
    };
  }
  const expMs = new Date(expectedReturnDate).getTime();
  const diffMs = expMs - nowMs;
  const totalMinutes = Math.floor(Math.abs(diffMs) / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (diffMs < 0) {
    const durationParts: string[] = [];
    if (days > 0) durationParts.push(`${days} hari`);
    if (hours > 0) durationParts.push(`${hours} jam`);
    if (days === 0 && minutes > 0) durationParts.push(`${minutes} menit`);
    const text = durationParts.length > 0 ? durationParts.join(' ') : 'Baru saja melewati tenggat';
    return {
      statusLabel: 'Melewati Tenggat',
      detailText: `Terlambat ${text}`,
      isOverdue: true,
      isDueSoon: false,
    };
  }

  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours <= 24) {
    const durationParts: string[] = [];
    if (hours > 0) durationParts.push(`${hours} jam`);
    if (minutes > 0) durationParts.push(`${minutes} menit`);
    const text = durationParts.length > 0 ? durationParts.join(' ') : 'Kurang dari 1 menit';
    return {
      statusLabel: 'Jatuh Tempo Hari Ini',
      detailText: `Sisa waktu ${text}`,
      isOverdue: false,
      isDueSoon: true,
    };
  }

  return {
    statusLabel: 'Aktif Normal',
    detailText: `Sisa waktu ${days} hari ${hours} jam`,
    isOverdue: false,
    isDueSoon: false,
  };
}

export default function MonitoringPage() {
  const { showToast } = useToast();
  const [loans, setLoans] = useState<any[]>([]);
  const [counts, setCounts] = useState({ total: 0, overdue: 0, dueSoon: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'OVERDUE' | 'DUE_SOON'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [nowMs, setNowMs] = useState<number>(0);
  const pageSize = 10;

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
        setNowMs(Date.now());
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

  // Pembaruan waktu berjalan otomatis setiap 30 detik tanpa perlu refresh manual
  useEffect(() => {
    setNowMs(Date.now());
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <AppShell>
      <div className="space-y-4 pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base lg:text-lg font-semibold text-slate-900 tracking-tight">
                Monitoring Keterlambatan &amp; Jatuh Tempo
              </h1>
              {counts.overdue > 0 && (
                <span className="text-xs font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                  ({counts.overdue} Terlambat)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Perhitungan durasi waktu berjalan otomatis dan pengingat resmi WhatsApp
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <RefreshButton onRefresh={fetchMonitoring} loading={loading} />

            <button
              onClick={() => window.open('/api/excel/export?type=overdue', '_blank')}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Ekspor Data
            </button>
          </div>
        </div>

        {/* Filter Bar - Clean Single-Color Dropdown & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-slate-200">
          <div className="w-full sm:max-w-xs">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari peminjam, NIK, atau no transaksi..."
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1E40AF]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs text-slate-500 font-medium whitespace-nowrap">
              Filter Status
            </label>
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as 'ALL' | 'OVERDUE' | 'DUE_SOON');
                setPage(1);
              }}
              className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1E40AF] cursor-pointer"
            >
              <option value="ALL">Semua Transaksi Aktif ({counts.total})</option>
              <option value="OVERDUE">Melewati Tenggat ({counts.overdue})</option>
              <option value="DUE_SOON">Jatuh Tempo Hari Ini ({counts.dueSoon})</option>
            </select>
          </div>
        </div>

        {/* Monitoring Table - Calm 2-Tone Monochrome View */}
        <div className="overflow-x-auto border border-slate-200 rounded bg-white">
          {loading ? (
            <SkeletonTable rows={5} cols={7} className="p-2" />
          ) : loans.length === 0 ? (
            <EmptyState
              title="Tidak Ada Keterlambatan"
              description={
                search
                  ? `Tidak ada transaksi aktif yang cocok dengan kata kunci "${search}".`
                  : 'Seluruh peminjaman masih berada dalam batas waktu yang ditentukan.'
              }
              actionLabel={search ? 'Reset Pencarian' : undefined}
              onAction={search ? () => setSearch('') : undefined}
            />
          ) : (
            <table className="w-full text-left text-xs min-w-[1000px]">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold font-heading uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">NO. TRANSAKSI</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">IDENTITAS PEMINJAM</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">BARANG BELUM KEMBALI</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">WAKTU JATUH TEMPO</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">STATUS &amp; DURASI BERJALAN</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">PENGINGAT RESMI</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.slice((page - 1) * pageSize, page * pageSize).map((loan) => {
                  const live = computeLiveTiming(loan.expectedReturnDate, nowMs, loan.durationText);

                  return (
                    <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap tabular-nums">
                        {loan.transactionNumber}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{loan.employee?.name}</div>
                        <div className="text-[10px] text-slate-500 tabular-nums">
                          {loan.employee?.nik} | {loan.employee?.department}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 max-w-[260px] truncate font-medium text-slate-800" title={loan.itemsList}>
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
                          <span
                            className={`text-xs ${
                              live.isOverdue
                                ? 'font-bold text-slate-900'
                                : live.isDueSoon
                                ? 'font-semibold text-[#1E40AF]'
                                : 'font-medium text-slate-600'
                            }`}
                          >
                            {live.statusLabel}
                          </span>
                          <span className="text-[11px] text-slate-500 tabular-nums">
                            {live.detailText}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {loan.waLink ? (
                            <a
                              href={loan.waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Kirim Pengingat WhatsApp"
                              title="Kirim Pengingat WhatsApp"
                              className="group relative w-7 h-7 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400 flex items-center justify-center transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                              </svg>
                              <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-medium whitespace-nowrap z-20 shadow-xs">
                                Kirim Pengingat WhatsApp
                              </span>
                            </a>
                          ) : (
                            <span
                              title="Nomor WhatsApp belum terdaftar"
                              className="group relative w-7 h-7 rounded border border-slate-200 bg-slate-50 text-slate-300 flex items-center justify-center cursor-not-allowed"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                              </svg>
                              <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-medium whitespace-nowrap z-20 shadow-xs">
                                Nomor WhatsApp Kosong
                              </span>
                            </span>
                          )}

                          {loan.emailLink && (
                            <a
                              href={loan.emailLink}
                              aria-label="Kirim Pengingat Email"
                              title="Kirim Pengingat Email"
                              className="group relative w-7 h-7 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400 flex items-center justify-center transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                              </svg>
                              <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-medium whitespace-nowrap z-20 shadow-xs">
                                Kirim Pengingat Email
                              </span>
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <Link
                          href={`/returns?tx=${loan.transactionNumber}`}
                          className="px-3 py-1 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded transition-colors"
                        >
                          Kembalikan
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Navigasi Paging Panah Kiri / Kanan */}
        {loans.length > pageSize && (
          <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
            <span>
              Halaman <strong className="text-slate-900">{page}</strong> dari <strong className="text-slate-900">{Math.ceil(loans.length / pageSize) || 1}</strong> ({loans.length} item)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="min-w-[28px] h-7 px-2 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 font-bold cursor-pointer"
                title="Halaman Sebelumnya"
                aria-label="Halaman Sebelumnya"
              >
                &lt;
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(Math.ceil(loans.length / pageSize) || 1, p + 1))}
                disabled={page >= (Math.ceil(loans.length / pageSize) || 1)}
                className="min-w-[28px] h-7 px-2 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 font-bold cursor-pointer"
                title="Halaman Selanjutnya"
                aria-label="Halaman Selanjutnya"
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
