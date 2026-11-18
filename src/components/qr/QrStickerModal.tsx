'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export interface PrintableToolUnit {
  id: string;
  unitCode: string;
  supplierCode?: string | null;
  maxLifeMinutes: number;
  remainingLifeMinutes: number;
}

interface QrStickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolCode: string;
  toolName: string;
  toolSpecs?: string | null;
  units: PrintableToolUnit[];
}

export function QrStickerModal({
  isOpen,
  onClose,
  toolCode,
  toolName,
  toolSpecs,
  units,
}: QrStickerModalProps) {
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen || units.length === 0) return;

    let cancelled = false;
    const generateAll = async () => {
      const nextMap: Record<string, string> = {};
      for (const u of units) {
        try {
          nextMap[u.id] = await QRCode.toDataURL(u.unitCode, {
            width: 240,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: {
              dark: '#0F172A',
              light: '#FFFFFF',
            },
          });
        } catch {
          // ignore individual failure
        }
      }
      if (!cancelled) {
        setQrMap(nextMap);
      }
    };

    generateAll();
    return () => {
      cancelled = true;
    };
  }, [isOpen, units]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs print:static print:bg-white print:p-0"
      onClick={onClose}
    >
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #ypti-qr-print-area,
          #ypti-qr-print-area * {
            visibility: visible;
          }
          #ypti-qr-print-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            padding: 8mm;
            background: #ffffff;
          }
        }
      `}</style>

      <div
        className="bg-white rounded border border-slate-300 shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden print:border-0 print:shadow-none print:max-w-none print:max-h-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between print:hidden">
          <div>
            <h3 className="text-xs font-bold font-heading text-slate-900 uppercase tracking-wider">
              Pratinjau Cetak Stiker QR Kotak Tool ({units.length} Label)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {toolCode} — {toolName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded transition-colors cursor-pointer"
            >
              Cetak Stiker QR
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-300 bg-white rounded transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto bg-slate-100/60 print:bg-white print:p-0 print:overflow-visible">
          <div
            id="ypti-qr-print-area"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2"
          >
            {units.map((u) => (
              <div
                key={u.id}
                className="bg-white border border-slate-300 rounded p-2.5 flex items-center gap-2.5 break-inside-avoid print:border-slate-800"
              >
                <div className="w-20 h-20 shrink-0 border border-slate-200 bg-white flex items-center justify-center p-0.5">
                  {qrMap[u.id] ? (
                    <img
                      src={qrMap[u.id]}
                      alt={`QR ${u.unitCode}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400">Memuat...</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    PT YPTI TOOL ROOM
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-900 truncate">
                    {u.unitCode}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-800 line-clamp-2 leading-tight">
                    {toolName}
                  </div>
                  {toolSpecs && (
                    <div className="text-[10px] text-slate-500 truncate">
                      {toolSpecs}
                    </div>
                  )}
                  <div className="text-[10px] font-semibold text-[#1E40AF] tabular-nums pt-0.5">
                    Batas Umur: {u.maxLifeMinutes.toLocaleString('id-ID')} mnt
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
