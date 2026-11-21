'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type MouseHandlerDataParam,
} from 'recharts';

interface BarData {
  name: string;
  total: number;
  available: number;
  borrowed: number;
}

interface BarChartSectionProps {
  data: BarData[];
}

type ViewMode = 'horizontal' | 'vertical' | 'table';

function getShortCategoryName(name: string): string {
  if (name.includes('Arbor') || name.includes('Toolholder')) return 'Toolholder';
  if (name.includes('Insert Holders') || name.includes('Bars')) return 'Insert Holder';
  if (name.includes('Pull Studs') || name.includes('Retention')) return 'Pull Studs';
  if (name.includes('Collet')) return 'Collet';
  if (name.includes('Clamping') || name.includes('Vise') || name.includes('Jigs')) return 'Clamping';
  if (name.includes('Fastener') || name.includes('Keys') || name.includes('Wrenches')) return 'Kunci Pas';
  if (name.includes('Measuring') || name.includes('QC')) return 'Alat Ukur';
  if (name.includes('Hand Tools')) return 'Hand Tools';
  if (name.includes('Pneumatic') || name.includes('Power')) return 'Pneumatic';
  if (name.includes('Carbide') || name.includes('Tips')) return 'Carbide Tips';
  if (name.includes('Workshop') || name.includes('Facilities') || name.includes('Storage')) return 'Storage';
  if (name.length > 14) return name.slice(0, 12) + '..';
  return name;
}

interface FormattedBarItem extends BarData {
  shortName: string;
  fullName: string;
  percentAvailable: string;
}

interface BarTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: FormattedBarItem }>;
}

function BarCustomTooltip({ active, payload }: BarTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-white px-3 py-2.5 border border-slate-300 rounded shadow-md text-xs min-w-[210px] z-50 pointer-events-none">
        <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2 leading-snug">
          {item.fullName}
        </div>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between text-slate-600">
            <span>Total Unit</span>
            <span className="font-bold text-slate-900 tabular-nums">
              {item.total.toLocaleString('id-ID')} unit
            </span>
          </div>
          <div className="flex items-center justify-between text-[#1E40AF]">
            <span>Stok Tersedia</span>
            <span className="font-bold tabular-nums">
              {item.available.toLocaleString('id-ID')} unit ({item.percentAvailable}%)
            </span>
          </div>
          <div className="flex items-center justify-between text-amber-700">
            <span>Sedang Dipinjam</span>
            <span className="font-bold tabular-nums">
              {item.borrowed.toLocaleString('id-ID')} unit
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function BarChartSection({ data }: BarChartSectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('horizontal');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Format, calculate percentage, and sort descending by total stock
  const formattedData: FormattedBarItem[] = [...data]
    .map((d) => {
      const shortName = getShortCategoryName(d.name);
      const percentAvailable = d.total > 0 ? ((d.available / d.total) * 100).toFixed(1) : '0';
      return {
        ...d,
        shortName,
        fullName: d.name,
        percentAvailable,
      };
    })
    .sort((a, b) => b.total - a.total);

  const selectedItem = selectedCategory
    ? formattedData.find((d) => d.name === selectedCategory) ?? null
    : null;

  const handleChartClick = (state: MouseHandlerDataParam) => {
    let clickedName: string | null = null;
    if (state.activeLabel !== undefined && state.activeLabel !== null) {
      clickedName =
        formattedData.find((d) => d.shortName === String(state.activeLabel))?.name ?? null;
    }
    if (!clickedName && state.activeTooltipIndex !== undefined && state.activeTooltipIndex !== null) {
      const idx = Number(state.activeTooltipIndex);
      if (Number.isInteger(idx) && idx >= 0 && idx < formattedData.length) {
        clickedName = formattedData[idx].name;
      }
    }
    if (!clickedName) return;
    setSelectedCategory((prev) => (prev === clickedName ? null : clickedName));
  };

  return (
    <div className="w-full">
      {/* Header with Title and View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-slate-200 gap-2">
        <div className="min-w-0">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Distribusi Stok per Kategori
          </h2>
          <p className="text-[11px] text-slate-500">
            Unit siap pakai &amp; dipinjam
          </p>
        </div>

        {/* View Mode Dropdown (Single-Color Neutral) */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
          <label className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
            Tampilan
          </label>
          <select
            value={viewMode}
            onChange={(e) => {
              setViewMode(e.target.value as ViewMode);
              setSelectedCategory(null);
            }}
            className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1E40AF] cursor-pointer"
          >
            <option value="horizontal">Grafik Horizontal</option>
            <option value="vertical">Grafik Vertikal</option>
            <option value="table">Tabel Rincian</option>
          </select>
        </div>
      </div>

      {/* VIEW 1: HORIZONTAL BAR CHART (Recommended for long category names - Zero collision) */}
      {viewMode === 'horizontal' && (
        <div className="h-[380px] mt-3 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={formattedData}
              margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
              accessibilityLayer={false}
              onClick={handleChartClick}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={true} vertical={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="shortName"
                width={110}
                interval={0}
                tick={{ fontSize: 11, fill: '#334155', fontWeight: 500 }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <Tooltip
                content={<BarCustomTooltip />}
                isAnimationActive={false}
                allowEscapeViewBox={{ x: false, y: true }}
                cursor={{ fill: '#F1F5F9' }}
                wrapperStyle={{ zIndex: 50, pointerEvents: 'none' }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                iconType="square"
              />
              <Bar dataKey="available" stackId="stok" name="Stok Tersedia" fill="#1E40AF" barSize={16} cursor="pointer" />
              <Bar dataKey="borrowed" stackId="stok" name="Sedang Dipinjam" fill="#D97706" radius={[0, 2, 2, 0]} barSize={16} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* VIEW 2: VERTICAL BAR CHART (Rotated -35deg ticks to prevent horizontal collision) */}
      {viewMode === 'vertical' && (
        <div className="h-[380px] mt-3 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={formattedData}
              margin={{ top: 10, right: 10, left: 0, bottom: 25 }}
              accessibilityLayer={false}
              onClick={handleChartClick}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="shortName"
                tick={{ fontSize: 9.5, fill: '#475569', fontWeight: 500 }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={70}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
              />
              <YAxis
                width={35}
                tick={{ fontSize: 10, fill: '#64748B' }}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
              />
              <Tooltip
                content={<BarCustomTooltip />}
                isAnimationActive={false}
                allowEscapeViewBox={{ x: false, y: true }}
                cursor={{ fill: '#F1F5F9' }}
                wrapperStyle={{ zIndex: 50, pointerEvents: 'none' }}
              />
              <Legend
                verticalAlign="top"
                wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                iconType="square"
              />
              <Bar dataKey="available" stackId="stok" name="Stok Tersedia" fill="#1E40AF" barSize={20} cursor="pointer" />
              <Bar dataKey="borrowed" stackId="stok" name="Sedang Dipinjam" fill="#D97706" radius={[2, 2, 0, 0]} barSize={20} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Reserved 1-line inspection bar below chart so plot position never shifts on click */}
      {viewMode !== 'table' && (
        <div className="mt-2 pt-2 border-t border-slate-100 min-h-[34px] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          {selectedItem ? (
            <>
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1 min-w-0">
                <span
                  className="font-semibold text-slate-900 truncate"
                  title={selectedItem.fullName}
                >
                  {selectedItem.fullName}
                </span>
                <span className="text-slate-700 tabular-nums whitespace-nowrap shrink-0">
                  Total <strong className="text-slate-900">{selectedItem.total.toLocaleString('id-ID')}</strong>
                </span>
                <span className="text-[#1E40AF] tabular-nums whitespace-nowrap shrink-0">
                  Tersedia <strong>{selectedItem.available.toLocaleString('id-ID')}</strong> ({selectedItem.percentAvailable}%)
                </span>
                <span className="text-amber-700 tabular-nums whitespace-nowrap shrink-0">
                  Dipinjam <strong>{selectedItem.borrowed.toLocaleString('id-ID')}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="px-2.5 py-0.5 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 cursor-pointer shrink-0 self-end sm:self-auto whitespace-nowrap"
              >
                Tutup
              </button>
            </>
          ) : (
            <span className="text-[11px] text-slate-500">
              Klik batang kategori untuk mengunci rincian
            </span>
          )}
        </div>
      )}

      {/* VIEW 3: TABULAR MATRIX VIEW (Industrial standard for precise numbers) */}
      {viewMode === 'table' && (
        <div className="mt-3 h-[380px] overflow-auto border border-slate-200 rounded bg-white">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold font-heading">
                <th className="py-2 px-3 w-10 text-center">NO</th>
                <th className="py-2 px-3">KATEGORI BARANG</th>
                <th className="py-2 px-3 text-right whitespace-nowrap">TOTAL ASLI</th>
                <th className="py-2 px-3 text-right whitespace-nowrap text-[#1E40AF]">TERSEDIA</th>
                <th className="py-2 px-3 text-right whitespace-nowrap text-slate-700">DIPINJAM</th>
                <th className="py-2 px-3 w-40 text-left">SIAP PAKAI (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {formattedData.map((row, idx) => (
                <tr key={row.name} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-900">
                    <div>{row.name}</div>
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-slate-800 tabular-nums">
                    {row.total.toLocaleString('id-ID')}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-[#1E40AF] tabular-nums">
                    {row.available.toLocaleString('id-ID')}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-700 tabular-nums">
                    {row.borrowed.toLocaleString('id-ID')}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#1E40AF] h-full rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, parseFloat(row.percentAvailable)))}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 tabular-nums w-11 text-right">
                        {row.percentAvailable}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
