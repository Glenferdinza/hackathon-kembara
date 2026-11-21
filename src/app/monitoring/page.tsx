'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { SkeletonTable } from '@/components/ui/SkeletonTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { WhatsAppIcon, EmailIcon } from '@/components/ui/ContactIcons';

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

interface MonitoringLoanItem {
  id: string;
  transactionNumber: string;
  expectedReturnDate: string;
  durationText?: string;
  itemsList: string;
  waLink?: string;
  emailLink?: string;
  employee?: {
    name?: string;
    nik?: string;
    department?: string;
  } | null;
}

export default function MonitoringPage() {
  const { showToast } = useToast();
  const [loans, setLoans] = useState<MonitoringLoanItem[]>([]);
  const [counts, setCounts] = useState({ total: 0, overdue: 0, dueSoon: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'OVERDUE' | 'DUE_SOON'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [nowMs, setNowMs] = useState<number>(0);
  const [expandedLoanIds, setExpandedLoanIds] = useState<Record<string, boolean>>({});
  const pageSize = 10;

  const toggleExpandLoan = (id: string) => {
    setExpandedLoanIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const loadMonitoringData = useCallback(async () => {
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
  }, [filter, search]);

  const fetchMonitoring = useCallback(async () => {
    setLoading(true);
    try {
      await loadMonitoringData();
    } catch {
      showToast('Gagal memuat data monitoring.', 'error');
    } finally {
      setLoading(false);
    }
  }, [loadMonitoringData, showToast]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      if (!active) return;
      setLoading(true);
      try {
        await loadMonitoringData();
      } catch {
        if (active) showToast('Gagal memuat data monitoring.', 'error');
      } finally {
        if (active) setLoading(false);
      }
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadMonitoringData, showToast]);

  // Pembaruan waktu berjalan otomatis setiap 30 detik tanpa perlu refresh manual
  useEffect(() => {
    const initTimer = window.setTimeout(() => {
      setNowMs(Date.now());
    }, 0);
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => {
      window.clearTimeout(initTimer);
      clearInterval(timer);
    };
  }, []);

  return (
    <AppShell>
      <div className="space-y-4 pb-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-900 tracking-tight">
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

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <RefreshButton onRefresh={fetchMonitoring} loading={loading} />

            <button
              type="button"
              onClick={() => window.open('/api/excel/export?type=overdue', '_blank')}
              className="flex-1 sm:flex-initial min-h-[40px] sm:min-h-0 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
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
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari peminjam, NIK, atau no transaksi..."
              className="w-full bg-white border border-slate-300 rounded px-3 py-2 sm:py-1.5 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-[#1E40AF]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs text-slate-600 font-medium whitespace-nowrap">
              Filter Status
            </label>
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as 'ALL' | 'OVERDUE' | 'DUE_SOON');
                setPage(1);
              }}
              className="flex-1 sm:flex-initial min-w-0 bg-white border border-slate-300 rounded px-2.5 py-2 sm:py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1E40AF] cursor-pointer"
            >
              <option value="ALL">Semua Transaksi Aktif ({counts.total})</option>
              <option value="OVERDUE">Melewati Tenggat ({counts.overdue})</option>
              <option value="DUE_SOON">Jatuh Tempo Hari Ini ({counts.dueSoon})</option>
            </select>
          </div>
        </div>

        {/* Monitoring List (Mobile Cards + Desktop Table) */}
        <div className="border border-slate-200 rounded bg-white overflow-hidden">
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
            <>
              {/* Mobile Card View (< 768px) */}
              <div className="md:hidden divide-y divide-slate-200">
                {loans.slice((page - 1) * pageSize, page * pageSize).map((loan) => {
                  const live = computeLiveTiming(loan.expectedReturnDate, nowMs, loan.durationText);
                  const isExpanded = Boolean(expandedLoanIds[loan.id]);
                  const hasLongItems = (loan.itemsList?.length || 0) > 70;

                  return (
                    <div key={loan.id} className="p-4 space-y-3 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 leading-snug">
                            {loan.employee?.name}
                          </div>
                          <div className="text-[11px] text-slate-600 tabular-nums mt-0.5 leading-snug break-words">
                            {loan.transactionNumber} &middot; {loan.employee?.nik} &middot; {loan.employee?.department}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className={`text-xs font-bold ${
                              live.isOverdue
                                ? 'text-[#991B1B]'
                                : live.isDueSoon
                                ? 'text-[#92400E]'
                                : 'text-slate-700'
                            }`}
                          >
                            {live.statusLabel}
                          </div>
                          <div className="text-[11px] text-slate-600 tabular-nums mt-0.5">
                            {live.detailText}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
                        <div>
                          <div
                            className={`text-xs text-slate-700 leading-relaxed ${
                              isExpanded ? '' : 'line-clamp-2'
                            }`}
                          >
                            <span className="font-semibold text-slate-900">Barang: </span>
                            {loan.itemsList}
                          </div>
                          {hasLongItems && (
                            <button
                              type="button"
                              onClick={() => toggleExpandLoan(loan.id)}
                              className="mt-1 text-[11px] font-semibold text-[#1E40AF] hover:underline cursor-pointer"
                            >
                              {isExpanded ? 'Ringkas daftar barang' : 'Lihat semua barang'}
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 tabular-nums">
                          Jatuh tempo{' '}
                          <strong className="text-slate-900">
                            {new Date(loan.expectedReturnDate).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-0.5">
                        {loan.waLink && (
                          <a
                            href={loan.waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Kirim Pengingat WhatsApp"
                            title="Kirim Pengingat WhatsApp"
                            className="min-h-[42px] px-3 py-2 rounded border border-slate-300 bg-white text-slate-800 font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-slate-50 shrink-0"
                          >
                            <WhatsAppIcon className="w-4 h-4 text-[#15803D] shrink-0" />
                            <span>WA</span>
                          </a>
                        )}
                        {loan.emailLink && (
                          <a
                            href={loan.emailLink}
                            aria-label="Kirim Pengingat Email"
                            title="Kirim Pengingat Email"
                            className="min-h-[42px] px-3 py-2 rounded border border-slate-300 bg-white text-slate-800 font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-slate-50 shrink-0"
                          >
                            <EmailIcon className="w-4 h-4 text-slate-600 shrink-0" />
                            <span>Email</span>
                          </a>
                        )}
                        <Link
                          href={`/returns?tx=${loan.transactionNumber}`}
                          className="flex-1 min-h-[42px] px-3 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded inline-flex items-center justify-center transition-colors"
                        >
                          Kembalikan
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop / Tablet Full Table (>= 768px) */}
              <div className="hidden md:block overflow-x-auto">
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
                      const isExpanded = Boolean(expandedLoanIds[loan.id]);
                      const hasLongItems = (loan.itemsList?.length || 0) > 42;

                      return (
                        <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap tabular-nums">
                            {loan.transactionNumber}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">{loan.employee?.name}</div>
                            <div className="text-[11px] text-slate-600 tabular-nums">
                              {loan.employee?.nik} | {loan.employee?.department}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 max-w-[280px] font-medium text-slate-800" title={loan.itemsList}>
                            <div className={isExpanded ? 'whitespace-normal leading-relaxed' : 'truncate'}>
                              {loan.itemsList}
                            </div>
                            {hasLongItems && (
                              <button
                                type="button"
                                onClick={() => toggleExpandLoan(loan.id)}
                                className="text-[11px] font-semibold text-[#1E40AF] hover:underline cursor-pointer mt-0.5"
                              >
                                {isExpanded ? 'Ringkas' : 'Lihat semua'}
                              </button>
                            )}
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
                                    ? 'font-bold text-[#991B1B]'
                                    : live.isDueSoon
                                    ? 'font-semibold text-[#92400E]'
                                    : 'font-medium text-slate-700'
                                }`}
                              >
                                {live.statusLabel}
                              </span>
                              <span className="text-[11px] text-slate-600 tabular-nums">
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
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold text-[11px] transition-colors"
                                >
                                  <WhatsAppIcon className="w-3.5 h-3.5 text-[#15803D] shrink-0" />
                                  <span>WA</span>
                                </a>
                              ) : (
                                <span
                                  title="Nomor WhatsApp belum terdaftar"
                                  className="px-2.5 py-1 rounded border border-slate-200 bg-slate-50 text-slate-500 text-[11px] cursor-not-allowed"
                                >
                                  WA Kosong
                                </span>
                              )}

                              {loan.emailLink && (
                                <a
                                  href={loan.emailLink}
                                  aria-label="Kirim Pengingat Email"
                                  title="Kirim Pengingat Email"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold text-[11px] transition-colors"
                                >
                                  <EmailIcon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                  <span>Email</span>
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
              </div>
            </>
          )}
        </div>

        {/* Navigasi Paging Panah Kiri / Kanan */}
        {loans.length > pageSize && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-1">
            <span>
              Halaman <strong className="text-slate-900">{page}</strong> dari <strong className="text-slate-900">{Math.ceil(loans.length / pageSize) || 1}</strong> ({loans.length} item)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="min-w-[40px] h-10 sm:min-w-[28px] sm:h-7 px-2 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 font-bold cursor-pointer"
                title="Halaman Sebelumnya"
                aria-label="Halaman Sebelumnya"
              >
                &lt;
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(Math.ceil(loans.length / pageSize) || 1, p + 1))}
                disabled={page >= (Math.ceil(loans.length / pageSize) || 1)}
                className="min-w-[40px] h-10 sm:min-w-[28px] sm:h-7 px-2 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 font-bold cursor-pointer"
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
