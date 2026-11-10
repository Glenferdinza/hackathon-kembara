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
  const availableItem = data.find((d) => d.name === 'Stok Tersedia');
  const availablePercent = total > 0 ? (((availableItem?.value || 0) / total) * 100).toFixed(1) : '0';

  // Custom Opaque Tooltip that floats cleanly without ghost text underneath
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
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
            <span className="text-slate-400 text-[11px] ml-1">({percent}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col justify-between">
      <div className="pb-2.5 border-b border-slate-200">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider whitespace-nowrap truncate">
          Kamar Stok (Komposisi Fisik Barang)
        </h2>
        <p className="text-[11px] text-slate-500 truncate">
          Status aktual seluruh aset perkakas &amp; inventaris terdaftar
        </p>
      </div>

      {/* Auto-layout responsive container: stacks cleanly on mobile, side-by-side on desktop */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-5 my-auto pt-4 pb-2 w-full">
        {/* Donut Chart with center percentage */}
        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={72}
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
            <span className="text-xl font-bold text-slate-900 tabular-nums leading-tight">
              {availablePercent}%
            </span>
            <span className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
              Tersedia
            </span>
          </div>
        </div>

        {/* Legend list with bidirectional hover and auto-layout */}
        <div className="flex-1 w-full min-w-0 space-y-1.5">
          {data.map((item, index) => (
            <div
              key={item.name}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`flex items-center justify-between text-xs py-1.5 px-2 rounded transition-colors cursor-pointer ${
                activeIndex === index
                  ? 'bg-slate-100 font-semibold'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-700 truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 tabular-nums whitespace-nowrap">
                <span className="font-bold text-slate-900">
                  {item.value.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  ({total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </div>
          ))}

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-semibold px-2">
            <span className="text-slate-500 whitespace-nowrap">Total Unit Terdata</span>
            <span className="text-slate-900 tabular-nums whitespace-nowrap">
              {total.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
