'use client';

import React from 'react';
import Link from 'next/link';

interface ActionItem {
  id: string;
  type: string;
  title: string;
  description: string;
  link: string;
}

interface ActionItemsSectionProps {
  items: ActionItem[];
}

export function ActionItemsSection({ items }: ActionItemsSectionProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-md p-4 flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-xs font-bold font-heading text-slate-800 uppercase tracking-wider">
            Menunggu Tindakan
          </h2>
          <p className="text-[11px] text-slate-500">
            Daftar tugas operasional prioritas admin
          </p>
        </div>
        <span className="text-[11px] font-bold text-slate-600 tabular-nums">
          {items.length} Aksi
        </span>
      </div>

      <div className="divide-y divide-slate-100 flex-1">
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Seluruh transaksi dan pengembalian dalam kondisi tertib. Tidak ada aksi tertunda.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="py-3 flex items-start justify-between gap-3 group">
              <div className="flex items-start gap-2.5">
                {item.type === 'DANGER' && (
                  <span className="text-[10px] font-bold text-slate-900 uppercase shrink-0 mt-0.5">
                    Keterlambatan
                  </span>
                )}
                {item.type === 'WARNING' && (
                  <span className="text-[10px] font-bold text-slate-700 uppercase shrink-0 mt-0.5">
                    Jatuh Tempo
                  </span>
                )}
                {item.type === 'INFO' && (
                  <span className="text-[10px] font-bold text-[#1E40AF] uppercase shrink-0 mt-0.5">
                    Perawatan
                  </span>
                )}

                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-slate-900 leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {item.description}
                  </p>
                </div>
              </div>

              <Link
                href={item.link}
                className="text-xs font-semibold text-[#1E40AF] group-hover:text-[#1D4ED8] shrink-0 mt-0.5 transition-colors underline"
              >
                Proses
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
