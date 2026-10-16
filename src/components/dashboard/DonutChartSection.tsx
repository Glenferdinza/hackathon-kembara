'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DonutItem {
  name: string;
  value: number;
  color: string;
}

interface DonutChartSectionProps {
  data: DonutItem[];
}

export function DonutChartSection({ data }: DonutChartSectionProps) {
  const total = data.reduce((acc, cur) => acc + cur.value, 0);
  const availableItem = data.find((d) => d.name === 'Stok Tersedia');
  const availablePercent = total > 0 ? (((availableItem?.value || 0) / total) * 100).toFixed(1) : '0';

  return (
    <div className="py-2">
      <div className="pb-2 border-b border-slate-200">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Kamar Stok (Komposisi Fisik Barang)
        </h2>
        <p className="text-[11px] text-slate-500">
          Status aktual seluruh aset perkakas &amp; inventaris terdaftar
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mt-3">
        {/* Donut Chart with center percentage */}
        <div className="relative w-44 h-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '4px',
                  fontSize: '11px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold text-slate-900 tabular-nums">
              {availablePercent}%
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Tersedia</span>
          </div>
        </div>

        {/* Legend list matching ERP Titian */}
        <div className="flex-1 w-full space-y-2">
          {data.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between text-xs py-1 px-1 border-b border-slate-50"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-600 font-medium truncate">{item.name}</span>
              </div>
              <span className="font-bold text-slate-900 tabular-nums">
                {item.value.toLocaleString('id-ID')}
              </span>
            </div>
          ))}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-semibold px-1">
            <span className="text-slate-500">Total Unit Terdata</span>
            <span className="text-slate-900 tabular-nums">
              {total.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
