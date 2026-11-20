'use client';

import { useEffect, useRef } from 'react';
import {
  createBarcodeBufferProcessor,
  isEditableElement,
} from '@/lib/barcode-scanner-engine';

interface UseBarcodeScannerOptions {
  /** Whether global USB scanner capture is currently active (default: true) */
  enabled?: boolean;
  /** Minimum characters required for a valid barcode scan (default: 4) */
  minLength?: number;
  /** Maximum milliseconds between scanner characters (default: 80) */
  maxIntervalMs?: number;
  /** Handler invoked with normalized uppercase barcode string */
  onScan: (code: string) => void;
}

/**
 * Global USB HID (Keyboard Wedge) Barcode Scanner hook.
 * Allows Tool Room admins to shoot a 1D barcode directly on operational pages
 * without clicking an input box or opening a modal first, while preserving normal
 * manual typing whenever a text input, textarea, select, or search bar is focused.
 */
export function useBarcodeScanner({
  enabled = true,
  minLength = 4,
  maxIntervalMs = 80,
  onScan,
}: UseBarcodeScannerOptions) {
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const processor = createBarcodeBufferProcessor({
      minLength,
      maxIntervalMs,
      onScan: (code) => {
        onScanRef.current(code);
      },
    });

    const listener = (e: KeyboardEvent) => {
      // Do not process background scans while a blocking modal dialog (e.g. ConfirmDialog) is active
      if (
        typeof document !== 'undefined' &&
        document.querySelector('[role="dialog"][aria-modal="true"]')
      ) {
        processor.reset();
        return;
      }

      const result = processor.handleKeyDown(
        {
          key: e.key,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          altKey: e.altKey,
          isEditableTarget: isEditableElement(e.target),
        },
        performance.now()
      );

      if (result.shouldPreventDefault) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', listener, true);
    return () => {
      window.removeEventListener('keydown', listener, true);
      processor.reset();
    };
  }, [enabled, minLength, maxIntervalMs]);
}
