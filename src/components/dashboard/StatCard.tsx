'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext: string;
  badge?: string;
  badgeColor?: string;
}

export function StatCard({
  title,
  value,
  subtext,
  badge,
  badgeColor,
}: StatCardProps) {
  return (
    <div className="py-2 px-3 border-r border-slate-200 last:border-r-0">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase truncate">
          {title}
        </span>
        {badge && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-xs ${
              badgeColor || 'bg-slate-100 text-slate-700'
            }`}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="mt-1.5">
        <span className="text-2xl lg:text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
          {value}
        </span>
      </div>

      <div className="mt-1 text-[11px] text-slate-500 truncate">
        {subtext}
      </div>
    </div>
  );
}
