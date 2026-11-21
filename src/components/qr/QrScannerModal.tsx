'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScanBarcode, Camera, Keyboard } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  subtitle?: string;
  defaultMode?: 'USB' | 'CAMERA';
}

interface ScannerHandle {
  stop: () => Promise<void>;
  clear: () => void;
}

async function stopScannerInstance(instance: ScannerHandle | null) {
  if (!instance) return;
  try {
    await instance.stop();
  } catch {
    // ignore if already stopped or never started
  }
  try {
    instance.clear();
  } catch {
    // ignore
  }
}

function BarcodeScannerModalContent({
  onClose,
  onScan,
  title = 'Pemindai Barcode Unit Tool',
  subtitle = 'Gunakan scanner USB (auto-fokus & otomatis submit) atau aktifkan kamera untuk memindai Barcode 1D dan QR bawaan supplier.',
  defaultMode = 'USB',
}: Omit<BarcodeScannerModalProps, 'isOpen'>) {
  const [mode, setMode] = useState<'USB' | 'CAMERA'>(defaultMode);
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const usbInputRef = useRef<HTMLInputElement | null>(null);
  const scannerRef = useRef<ScannerHandle | null>(null);
  const decodedLockRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const stopActiveCamera = useCallback(async (skipStateUpdate = false) => {
    const active = scannerRef.current;
    scannerRef.current = null;
    await stopScannerInstance(active);
    if (!skipStateUpdate) {
      setCameraActive(false);
    }
  }, []);

  // Tutup modal saat tombol Escape ditekan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        void stopActiveCamera(true);
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stopActiveCamera]);

  // Pastikan kolom input USB selalu auto-fokus saat modal terbuka pada mode USB
  useEffect(() => {
    if (mode !== 'USB') return;
    const rafId = window.requestAnimationFrame(() => {
      usbInputRef.current?.focus();
    });
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [mode]);

  // Inisialisasi Kamera Wide-Box untuk Barcode 1D (Code 128/39/EAN/ITF) + QR supplier
  useEffect(() => {
    if (mode !== 'CAMERA') {
      return;
    }

    let cancelled = false;
    decodedLockRef.current = false;
    let localInstance: ScannerHandle | null = null;

    const startCamera = async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
        if (cancelled) return;

        const readerEl = document.getElementById('ypti-barcode-camera-region');
        if (!readerEl) return;

        const html5QrCode = new Html5Qrcode('ypti-barcode-camera-region', {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
        localInstance = html5QrCode;
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const safeMaxW = Math.max(50, Math.min(viewfinderWidth, viewfinderWidth - 16));
              const safeMaxH = Math.max(50, Math.min(viewfinderHeight, viewfinderHeight - 16));
              const targetW = Math.max(50, Math.min(320, Math.floor(viewfinderWidth * 0.88)));
              const targetH = Math.max(50, Math.min(125, Math.floor(viewfinderHeight * 0.42)));
              return {
                width: Math.min(targetW, safeMaxW),
                height: Math.min(targetH, safeMaxH),
              };
            },
          },
          (decodedText: string) => {
            if (decodedLockRef.current || cancelled) return;
            const clean = decodedText.trim().toUpperCase();
            if (clean) {
              decodedLockRef.current = true;
              void stopActiveCamera(true).then(() => {
                onScanRef.current(clean);
              });
            }
          },
          () => {
            // ignore frame decode miss
          }
        );

        if (cancelled) {
          // Stop local instance directly in case cleanup already cleared scannerRef
          if (scannerRef.current === html5QrCode) {
            scannerRef.current = null;
          }
          await stopScannerInstance(html5QrCode);
          return;
        }

        setCameraError('');
        setCameraActive(true);
      } catch (err) {
        if (!cancelled) {
          setCameraError(
            'Kamera tidak tersedia atau izin kamera belum diberikan. Gunakan mode Scanner USB / Input Manual.'
          );
          setCameraActive(false);
          console.warn('Barcode Camera init warning:', err);
        } else if (localInstance) {
          await stopScannerInstance(localInstance);
        }
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      const toStop = scannerRef.current || localInstance;
      scannerRef.current = null;
      void stopScannerInstance(toStop);
    };
  }, [mode, stopActiveCamera]);

  const handleCloseModal = () => {
    void stopActiveCamera(true);
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim().toUpperCase();
    if (!clean) return;
    setManualCode('');
    onScan(clean);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === 'USB') {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('button, input, a')) {
        usbInputRef.current?.focus();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      onClick={handleCloseModal}
    >
      <div
        className="bg-white rounded border border-slate-300 shadow-xl max-w-md w-full overflow-hidden"
        onClick={handleCardClick}
      >
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ScanBarcode className="w-4 h-4 text-[#1E40AF] shrink-0" />
            <span className="text-xs font-bold font-heading text-slate-900 uppercase truncate">
              {title}
            </span>
          </div>
          <span className="text-xs font-semibold text-[#1E40AF] shrink-0">
            {mode === 'CAMERA' && cameraActive ? 'KAMERA AKTIF' : 'SIAP SCAN'}
          </span>
        </div>

        <div className="p-4 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">{subtitle}</p>

          {/* Switch Mode Scanner USB vs Kamera Wide-Box */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded border border-slate-200">
            <button
              type="button"
              onClick={() => {
                void stopActiveCamera();
                setCameraError('');
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
              <span>Kamera Wide-Box</span>
            </button>
          </div>

          {mode === 'USB' ? (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700">
                  Kode Barcode Unit (contoh TOL-001-U01)
                </label>
                <input
                  ref={usbInputRef}
                  type="text"
                  autoFocus
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Tembak scanner barcode USB atau ketik kode unit..."
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2.5 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-[#1E40AF]"
                />
                <p className="text-[11px] text-slate-500">
                  Input otomatis fokus dan langsung memproses kode saat scanner USB mengirim Enter.
                </p>
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
              <div className="border border-slate-300 rounded bg-slate-900 overflow-hidden min-h-[220px] flex items-center justify-center">
                <div id="ypti-barcode-camera-region" className="w-full" />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Arahkan garis Barcode 1D secara horizontal ke kotak pemindai (mendukung Code 128, Code 39, EAN, ITF, dan QR bawaan supplier).
              </p>

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

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title,
  subtitle,
  defaultMode = 'USB',
}: BarcodeScannerModalProps) {
  if (!isOpen) return null;
  return (
    <BarcodeScannerModalContent
      key={defaultMode}
      onClose={onClose}
      onScan={onScan}
      title={title}
      subtitle={subtitle}
      defaultMode={defaultMode}
    />
  );
}

// Backward-compatible export alias
export { BarcodeScannerModal as QrScannerModal };
