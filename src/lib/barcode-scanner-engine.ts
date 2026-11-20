/**
 * Pure keyboard-wedge USB Barcode Scanner detection engine.
 * Separates fast HID scanner bursts (< maxIntervalMs between chars + Enter)
 * from normal manual typing and ignores events targeting editable form fields.
 */

export interface BarcodeKeyEventLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  timeStamp?: number;
  isEditableTarget?: boolean;
}

export interface BarcodeScannerEngineOptions {
  /** Minimum characters required to qualify as a barcode scan (default: 4) */
  minLength?: number;
  /** Maximum milliseconds allowed between consecutive scanner keystrokes (default: 80) */
  maxIntervalMs?: number;
  /** Maximum milliseconds allowed between the last character and terminator key (default: 150) */
  enterTimeoutMs?: number;
  /** Terminator keys emitted by HID scanners at end of barcode (default: ['Enter', 'Tab']) */
  terminatorKeys?: readonly string[];
  /** Callback fired with normalized uppercase scanned barcode string */
  onScan: (code: string) => void;
}

export interface BarcodeKeyProcessResult {
  matched: boolean;
  scannedCode: string | null;
  shouldPreventDefault: boolean;
}

const IGNORED_MODIFIER_KEYS = new Set([
  'Shift',
  'CapsLock',
  'NumLock',
  'ScrollLock',
  'AltGraph',
  'Dead',
]);

const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'submit',
  'reset',
  'checkbox',
  'radio',
  'file',
  'image',
  'range',
  'color',
]);

/**
 * Checks whether an event target is a text-editable form field where manual
 * typing or an element's own Enter handler should take precedence.
 */
export function isEditableElement(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false;
  const el = target as {
    tagName?: string;
    type?: string;
    isContentEditable?: boolean;
    getAttribute?: (name: string) => string | null;
  };

  if (el.isContentEditable) return true;
  if (typeof el.getAttribute === 'function' && el.getAttribute('contenteditable') === 'true') {
    return true;
  }

  const tag = (el.tagName || '').toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const inputType = (el.type || 'text').toLowerCase();
    return !NON_TEXT_INPUT_TYPES.has(inputType);
  }
  return false;
}

export function createBarcodeBufferProcessor(options: BarcodeScannerEngineOptions) {
  const minLength = options.minLength ?? 4;
  const maxIntervalMs = options.maxIntervalMs ?? 80;
  const enterTimeoutMs = options.enterTimeoutMs ?? 150;
  const terminatorSet = new Set(options.terminatorKeys ?? ['Enter', 'Tab']);

  let buffer = '';
  let lastCharTime = 0;

  const reset = () => {
    buffer = '';
    lastCharTime = 0;
  };

  const handleKeyDown = (
    event: BarcodeKeyEventLike,
    nowMs?: number
  ): BarcodeKeyProcessResult => {
    // Do not hijack keystrokes while user is typing in a text input, textarea, select, or contenteditable
    if (event.isEditableTarget) {
      reset();
      return { matched: false, scannedCode: null, shouldPreventDefault: false };
    }

    // Ignore keyboard shortcuts (Ctrl+C, Cmd+K, Alt+Tab, etc.)
    if (event.ctrlKey || event.metaKey || event.altKey) {
      reset();
      return { matched: false, scannedCode: null, shouldPreventDefault: false };
    }

    // USB scanners send Shift before uppercase letters/symbols — skip without breaking buffer
    if (IGNORED_MODIFIER_KEYS.has(event.key)) {
      return { matched: false, scannedCode: null, shouldPreventDefault: false };
    }

    const now = nowMs ?? (typeof event.timeStamp === 'number' && event.timeStamp > 0 ? event.timeStamp : Date.now());

    if (terminatorSet.has(event.key)) {
      const elapsed = lastCharTime > 0 ? now - lastCharTime : Number.POSITIVE_INFINITY;
      const candidate = buffer.trim().toUpperCase();
      reset();

      if (candidate.length >= minLength && elapsed <= enterTimeoutMs) {
        options.onScan(candidate);
        return { matched: true, scannedCode: candidate, shouldPreventDefault: true };
      }

      return { matched: false, scannedCode: null, shouldPreventDefault: false };
    }

    // Printable single character
    if (event.key.length === 1) {
      const elapsed = lastCharTime > 0 ? now - lastCharTime : 0;
      if (buffer.length > 0 && elapsed > maxIntervalMs) {
        // Previous keystroke was too slow (manual stray press) — start fresh buffer
        buffer = event.key;
      } else {
        buffer += event.key;
      }
      lastCharTime = now;
      return { matched: false, scannedCode: null, shouldPreventDefault: false };
    }

    // Any other navigation/control key (Escape, Backspace, Tab, Arrows) resets buffer
    reset();
    return { matched: false, scannedCode: null, shouldPreventDefault: false };
  };

  return {
    handleKeyDown,
    reset,
    getBuffer: () => buffer,
  };
}
