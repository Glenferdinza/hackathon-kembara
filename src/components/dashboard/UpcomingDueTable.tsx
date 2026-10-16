'use client';

import React from 'react';
import Link from 'next/link';

interface UpcomingLoan {
  id: string;
  transactionNumber: string;
  borrowerName: string;
  borrowerNik: string;
  borrowerDept: string;
  borrowerPhone?: string;
  loanDate: string;
  expectedReturnDate: string;
  itemsCount: number;
  itemsSummary: string;
  status: string;
}

interface UpcomingDueTableProps {
  loans: UpcomingLoan[];
}

export function UpcomingDueTable({ loans }: UpcomingDueTableProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-md p-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Prioritas Pengembalian (Jatuh Tempo Terdekat)
          </h2>
          <p className="text-[11px] text-slate-500">
            Monitoring transaksi peminjaman aktif yang mendekati atau telah lewat batas waktu
          </p>
        </div>
        <Link
          href="/monitoring"
          className="text-xs font-medium text-[#1E40AF] hover:underline"
        >
          Lihat Semua
        </Link>
      </div>

      <div className="overflow-x-auto mt-2">
        <table className="w-full text-left text-xs min-w-[750px]">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 font-semibold font-heading uppercase bg-slate-50/50">
              <th className="py-2.5 px-3 whitespace-nowrap">NO. TRANSAKSI</th>
              <th className="py-2.5 px-3">PEMINJAM</th>
              <th className="py-2.5 px-3">BARANG DIPINJAM</th>
              <th className="py-2.5 px-3 whitespace-nowrap">TENGGAT KEMBALI</th>
              <th className="py-2.5 px-3 whitespace-nowrap">STATUS</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">TINDAKAN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loans.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  Tidak ada transaksi peminjaman aktif saat ini.
                </td>
              </tr>
            ) : (
              loans.map((loan) => (
                <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap tabular-nums">
                    {loan.transactionNumber}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">{loan.borrowerName}</div>
                    <div className="text-[10px] text-slate-500 tabular-nums">
                      {loan.borrowerNik} | {loan.borrowerDept}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 max-w-[200px] truncate text-slate-700">
                    {loan.itemsSummary}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap tabular-nums">
                    {new Date(loan.expectedReturnDate).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {loan.status === 'TERLAMBAT' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF2F2] text-[#D94841] border border-red-200">
                        Terlambat
                      </span>
                    )}
                    {loan.status === 'MENDEKATI_JATUH_TEMPO' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFFBEB] text-amber-700 border border-amber-200">
                        Hari Ini
                      </span>
                    )}
                    {loan.status === 'DIPINJAM' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#1E40AF] border border-blue-200">
                        Dipinjam
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <Link
                      href={`/returns?tx=${loan.transactionNumber}`}
                      className="inline-flex items-center px-2.5 py-1 rounded bg-[#1E40AF] text-white hover:bg-[#1D4ED8] text-[11px] font-semibold transition-colors"
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
  );
}
