'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

export function BarChartSection({ data }: BarChartSectionProps) {
  // Format short names to guarantee zero label collision
  const cleanData = data.map((d) => {
    let shortName = d.name;
    if (d.name.includes('Cutting')) shortName = 'Cutting';
    else if (d.name.includes('Measuring')) shortName = 'Measuring';
    else if (d.name.includes('Mould')) shortName = 'Moulding';
    else if (d.name.includes('Pneumatic')) shortName = 'Pneumatic';
    else if (d.name.includes('Safety')) shortName = 'Safety';
    else if (d.name.includes('Hardware')) shortName = 'Hardware';
    return {
      ...d,
      shortName,
      fullName: d.name,
    };
  });

  return (
    <div className="py-2">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Distribusi Stok per Kategori
          </h2>
          <p className="text-[11px] text-slate-500">
            Perbandingan total unit, stok siap pakai, dan sedang dipinjam
          </p>
        </div>
      </div>

      <div className="h-64 mt-3 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={cleanData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="shortName"
              tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
              interval={0}
              height={30}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#64748B' }}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
            />
            <Tooltip
              formatter={(value, name) => [value, name === 'total' ? 'Total Unit' : name === 'available' ? 'Stok Tersedia' : 'Sedang Dipinjam']}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E8F0',
                borderRadius: '4px',
                fontSize: '11px',
                boxShadow: '0 2px 4px rgb(0 0 0 / 0.08)',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              iconType="square"
            />
            <Bar dataKey="total" name="Total Unit" fill="#94A3B8" />
            <Bar dataKey="available" name="Stok Tersedia" fill="#1E40AF" />
            <Bar dataKey="borrowed" name="Sedang Dipinjam" fill="#475569" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
