'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Scan, Camera, Keyboard } from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  subtitle?: string;
}

export function QrScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Pemindai QR Code Unit Tool',
  subtitle = 'Gunakan alat scanner USB pada kotak perkakas atau aktifkan kamera perangkat.',
}: QrScannerModalProps) {
  const [mode, setMode] = useState<'USB' | 'CAMERA'>('USB');
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const decodedLockRef = useRef(false);

  const stopCamera = async (skipStateUpdate = false) => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore if already stopped
      }
      try {
        scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    if (!skipStateUpdate) {
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (!isOpen || mode !== 'CAMERA') {
      return;
    }

    let cancelled = false;
    decodedLockRef.current = false;

    const startCamera = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;

        const readerEl = document.getElementById('ypti-qr-camera-region');
        if (!readerEl) return;

        const html5QrCode = new Html5Qrcode('ypti-qr-camera-region');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => {
            if (decodedLockRef.current) return;
            const clean = decodedText.trim().toUpperCase();
            if (clean) {
              decodedLockRef.current = true;
              stopCamera().then(() => {
                onScan(clean);
              });
            }
          },
          () => {
            // ignore frame decode miss
          }
        );

        if (!cancelled) {
          setCameraError('');
          setCameraActive(true);
        } else {
          await stopCamera(true);
        }
      } catch (err) {
        if (!cancelled) {
          setCameraError(
            'Kamera tidak tersedia atau izin kamera belum diberikan. Gunakan mode Scanner USB / Ketik Kode.'
          );
          setCameraActive(false);
          console.warn('QR Camera init warning:', err);
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopCamera(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleCloseModal = () => {
    stopCamera();
    setManualCode('');
    setCameraError('');
    decodedLockRef.current = false;
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim().toUpperCase();
    if (!clean) return;
    setManualCode('');
    onScan(clean);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      onClick={handleCloseModal}
    >
      <div
        className="bg-white rounded border border-slate-300 shadow-xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scan className="w-4 h-4 text-[#1E40AF]" />
            <span className="text-xs font-bold font-heading text-slate-900 uppercase">
              {title}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {mode === 'CAMERA' && cameraActive ? 'KAMERA AKTIF' : 'SIAP SCAN'}
          </span>
        </div>

        <div className="p-4 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">{subtitle}</p>

          {/* Switch Mode Scanner USB vs Kamera Web */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded border border-slate-200">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setMode('USB');
              }}
              className={`py-1.5 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                mode === 'USB'
                  ? 'bg-white text-[#1E40AF] border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Scanner USB / Input</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('CAMERA')}
              className={`py-1.5 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                mode === 'CAMERA'
                  ? 'bg-white text-[#1E40AF] border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Kamera Webcam</span>
            </button>
          </div>

          {mode === 'USB' ? (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700">
                  Kode Unit QR (contoh TOL-001-U01)
                </label>
                <input
                  type="text"
                  autoFocus
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Arahkan scanner QR atau ketik kode unit..."
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2.5 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-[#1E40AF]"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3.5 py-1.5 font-medium text-slate-600 hover:text-slate-800 rounded transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="px-4 py-1.5 font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Proses Kode
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="border border-slate-300 rounded bg-slate-900 overflow-hidden min-h-[240px] flex items-center justify-center">
                <div id="ypti-qr-camera-region" className="w-full" />
              </div>

              {cameraError && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 font-medium">
                  {cameraError}
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3.5 py-1.5 font-medium text-slate-600 hover:text-slate-800 border border-slate-300 rounded transition-colors cursor-pointer"
                >
                  Tutup Kamera
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
