import React from 'react';

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export function SkeletonTable({
  rows = 5,
  cols = 8,
  className = '',
}: SkeletonTableProps) {
  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <table className="w-full text-left text-xs">
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, rIdx) => (
            <tr key={rIdx} className="animate-pulse">
              {Array.from({ length: cols }).map((_, cIdx) => (
                <td key={cIdx} className="py-3 px-3">
                  <div
                    className="h-3.5 bg-slate-200/80 rounded-xs"
                    style={{
                      width: cIdx === 0 ? '55%' : cIdx === 1 ? '85%' : cIdx === cols - 1 ? '45%' : '70%',
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

