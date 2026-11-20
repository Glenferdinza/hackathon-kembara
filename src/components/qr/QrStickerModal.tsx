'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import { Code128Svg } from '@/components/barcode/Code128Svg';

export type BarcodeStickerLayout = 'RINGKAS' | 'STANDAR';

export interface PrintableToolUnit {
  id: string;
  unitCode: string;
  supplierCode?: string | null;
  maxLifeMinutes: number;
  remainingLifeMinutes: number;
}

interface BarcodeStickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolCode: string;
  toolName: string;
  toolSpecs?: string | null;
  units: PrintableToolUnit[];
}

function BarcodeStickerModalContent({
  onClose,
  toolCode,
  toolName,
  toolSpecs,
  units,
}: Omit<BarcodeStickerModalProps, 'isOpen'>) {
  // Default: Mode Ringkas / Tool Kecil (hanya garis barcode + kode unit)
  const [layoutMode, setLayoutMode] = useState<BarcodeStickerLayout>('RINGKAS');

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.add('ypti-printing-barcodes');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('ypti-printing-barcodes');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handlePrint = () => {
    if (typeof window !== 'undefined' && units.length > 0) {
      window.print();
    }
  };

  const isCompact = layoutMode === 'RINGKAS';

  const modalNode = (
    <div
      className="ypti-barcode-print-root fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs print:static print:bg-white print:p-0"
      onClick={onClose}
    >
      <div
        className="bg-white rounded border border-slate-300 shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden print:border-0 print:shadow-none print:max-w-none print:max-h-none print:overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 print:hidden">
          <div>
            <h3 className="text-xs font-bold font-heading text-slate-900 uppercase tracking-wider">
              Pratinjau Cetak Stiker Barcode 1D ({units.length} Label)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {toolCode} — {toolName} | Format Code 128
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={units.length === 0}
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Stiker Barcode</span>
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

        {/* Pilihan Ukuran Stiker: Ringkas (Default) vs Standar */}
        <div className="px-4 py-2.5 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs print:hidden">
          <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded border border-slate-200 self-start">
            <button
              type="button"
              onClick={() => setLayoutMode('RINGKAS')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                isCompact
                  ? 'bg-white text-[#1E40AF] border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ringkas / Tool Kecil (Default)
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('STANDAR')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                !isCompact
                  ? 'bg-white text-[#1E40AF] border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Standar / Kotak Besar
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            {isCompact
              ? 'Mode Ringkas: Hanya garis Barcode 1D (Code 128) & kode unit — ideal untuk wadah kecil dan tabung melengkung.'
              : 'Mode Standar: Menampilkan Barcode 1D (Code 128), kode unit, nama tool, dan batas umur pakai untuk kotak besar.'}
          </p>
        </div>

        {/* Area Pratinjau & Cetak Stiker */}
        <div className="p-4 overflow-y-auto bg-slate-100/60 print:bg-white print:p-0 print:overflow-visible">
          {units.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              Tidak ada unit barcode yang dipilih untuk dicetak.
            </div>
          ) : (
            <div
              id="ypti-barcode-print-area"
              className={
                isCompact
                  ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 print:grid-cols-4 print:gap-1.5'
                  : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2'
              }
            >
              {units.map((u) =>
                isCompact ? (
                  /* MODE RINGKAS / TOOL KECIL: Hanya garis barcode 1D + kode unit */
                  <div
                    key={u.id}
                    className="bg-white border border-slate-300 px-2 py-2 flex flex-col items-center justify-center break-inside-avoid print:border-slate-900"
                  >
                    <Code128Svg
                      value={u.unitCode}
                      barHeight={38}
                      quietZoneModules={10}
                      className="w-full h-9"
                      ariaLabel={`Barcode ${u.unitCode}`}
                    />
                    <div className="mt-1 text-[11px] font-mono font-bold text-slate-950 tracking-wider leading-none text-center">
                      {u.unitCode}
                    </div>
                  </div>
                ) : (
                  /* MODE STANDAR / KOTAK BESAR: Barcode 1D + kode unit + nama tool + batas umur pakai */
                  <div
                    key={u.id}
                    className="bg-white border border-slate-300 px-3 py-2.5 flex flex-col justify-between gap-1.5 break-inside-avoid print:border-slate-900"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
                        PT YPTI TOOL ROOM
                      </span>
                      <span className="text-[10px] font-semibold text-[#1E40AF] tabular-nums">
                        Umur: {u.maxLifeMinutes.toLocaleString('id-ID')} mnt
                      </span>
                    </div>

                    <div className="py-0.5">
                      <Code128Svg
                        value={u.unitCode}
                        barHeight={46}
                        quietZoneModules={10}
                        className="w-full h-11"
                        ariaLabel={`Barcode ${u.unitCode}`}
                      />
                      <div className="mt-1 text-xs font-mono font-bold text-slate-950 tracking-wider text-center">
                        {u.unitCode}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-1 space-y-0.5">
                      <div className="text-[11px] font-semibold text-slate-900 truncate">
                        {toolName}
                      </div>
                      {toolSpecs && (
                        <div className="text-[10px] text-slate-500 truncate">
                          {toolSpecs}
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalNode, document.body);
}

export function BarcodeStickerModal({
  isOpen,
  onClose,
  toolCode,
  toolName,
  toolSpecs,
  units,
}: BarcodeStickerModalProps) {
  if (!isOpen) return null;
  return (
    <BarcodeStickerModalContent
      onClose={onClose}
      toolCode={toolCode}
      toolName={toolName}
      toolSpecs={toolSpecs}
      units={units}
    />
  );
}

// Backward-compatible export alias
export { BarcodeStickerModal as QrStickerModal };
