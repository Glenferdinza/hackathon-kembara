'use client';

import React, { useState } from 'react';
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = data.reduce((acc, cur) => acc + cur.value, 0);

  const formatPct = (value: number, totalUnits: number) => {
    if (!totalUnits || totalUnits <= 0 || value <= 0) return '0%';
    const pct = (value / totalUnits) * 100;
    if (pct > 0 && pct < 0.1) return '<0,1%';
    if (pct > 99.9 && pct < 100) return '99,9%';
    return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1).replace('.', ',')}%`;
  };

  const availableItem = data.find((d) => d.name === 'Stok Tersedia');
  const availablePercent = formatPct(availableItem?.value || 0, total);

  // Custom Opaque Tooltip that floats cleanly without ghost text underneath
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percent = formatPct(item.value, total);
      return (
        <div className="bg-white px-3 py-2 border border-slate-300 rounded shadow-md text-xs pointer-events-none z-50">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-xs inline-block shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-bold text-slate-900">{item.name}</span>
          </div>
          <div className="text-slate-600 font-medium mt-1 tabular-nums">
            <span className="font-bold text-[#1E40AF]">{item.value.toLocaleString('id-ID')}</span> Unit
            <span className="text-slate-500 text-[11px] ml-1">({percent})</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full flex flex-col justify-between">
      <div className="pb-2.5 border-b border-slate-200">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider whitespace-nowrap">
          Komposisi Fisik Barang
        </h2>
        <p className="text-[11px] text-slate-500 whitespace-nowrap">
          Status aktual seluruh aset perkakas &amp; inventaris
        </p>
      </div>

      <div className="pt-2 flex flex-col items-center">
        {/* Donut Chart with center percentage */}
        <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={46}
                outerRadius={64}
                paddingAngle={3}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke={activeIndex === index ? '#0F172A' : '#FFFFFF'}
                    strokeWidth={activeIndex === index ? 2 : 1}
                    className="transition-all duration-150 cursor-pointer"
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.65}
                  />
                ))}
              </Pie>
              <Tooltip
                content={<CustomTooltip />}
                wrapperStyle={{ zIndex: 50 }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center text: smoothly hides during hover so the tooltip box NEVER collides with center numbers */}
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-150 ${
              activeIndex !== null ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <span className="text-lg font-bold text-slate-900 tabular-nums leading-tight">
              {availablePercent}
            </span>
            <span className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
              Tersedia
            </span>
          </div>
        </div>

        {/* Legend list with full width and clear unclipped text */}
        <div className="w-full mt-2 pt-2 border-t border-slate-100 space-y-1">
          {data.map((item, index) => {
            const itemPct = formatPct(item.value, total);
            return (
              <div
                key={item.name}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                className={`flex items-center justify-between text-xs py-1 px-2 rounded transition-colors cursor-pointer ${
                  activeIndex === index
                    ? 'bg-slate-100 font-semibold'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-800 font-medium whitespace-nowrap">{item.name}</span>
                </div>
                <div className="flex items-center gap-1.5 tabular-nums whitespace-nowrap">
                  <span className="font-bold text-slate-900">
                    {item.value.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 w-12 text-right">
                    ({itemPct})
                  </span>
                </div>
              </div>
            );
          })}

          <div className="pt-2 mt-1 border-t border-slate-200 flex items-center justify-between text-xs font-semibold px-2">
            <span className="text-slate-500 whitespace-nowrap">Total Fisik Terdata</span>
            <span className="text-slate-900 tabular-nums whitespace-nowrap">
              {total.toLocaleString('id-ID')} Unit
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
