import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { CODE128_PATTERNS, encodeCode128, sanitizeCode128Text } from '../src/lib/code128';
import {
  createBarcodeBufferProcessor,
  isEditableElement,
} from '../src/lib/barcode-scanner-engine';

const require = createRequire(import.meta.url);
const ZXing = require('html5-qrcode/third_party/zxing-js.umd.js');

// ---------------------------------------------------------------------------
// 1. ISO/IEC 15417 Code 128 Table Structural Integrity
// ---------------------------------------------------------------------------
assert.equal(CODE128_PATTERNS.length, 107, 'Must have exactly 107 Code 128 patterns');

for (let i = 0; i <= 105; i++) {
  const digits = CODE128_PATTERNS[i].split('').map(Number);
  const total = digits.reduce((a, b) => a + b, 0);
  const barSum = digits[0] + digits[2] + digits[4];
  assert.equal(digits.length, 6, `Pattern ${i} must have 6 runs`);
  assert.equal(total, 11, `Pattern ${i} must sum to 11 modules`);
  assert.equal(barSum % 2, 0, `Pattern ${i} must have even bar parity`);
}

const stopDigits = CODE128_PATTERNS[106].split('').map(Number);
assert.equal(stopDigits.length, 7, 'STOP pattern must have 7 runs');
assert.equal(
  stopDigits.reduce((a, b) => a + b, 0),
  13,
  'STOP pattern must sum to 13 modules'
);

// ---------------------------------------------------------------------------
// 2. End-to-End Code 128 Decoding Verification via Real ZXing Code128Reader
// ---------------------------------------------------------------------------
const reader = new ZXing.Code128Reader();

function decodeEncodedWithZXing(raw: string, quietZone = 10): string {
  const enc = encodeCode128(raw, quietZone);
  assert.ok(enc, `Expected valid Code 128 encoding for "${raw}"`);

  // Render barcode bars into a 1D ZXing BitArray (2px per module)
  const scale = 2;
  const width = enc.totalModules * scale;
  const row = new ZXing.BitArray(width);
  for (const bar of enc.bars) {
    assert.ok(bar.x >= quietZone, 'Bar must not intrude into left quiet zone');
    assert.ok(
      bar.x + bar.width <= enc.totalModules - quietZone,
      'Bar must not intrude into right quiet zone'
    );
    for (let x = bar.x * scale; x < (bar.x + bar.width) * scale; x++) {
      row.set(x);
    }
  }

  const decoded = reader.decodeRow(0, row, null);
  return decoded.getText();
}

const allPrintableAscii = Array.from({ length: 95 }, (_, i) =>
  String.fromCharCode(32 + i)
).join('');

const code128TestCases = [
  'TOL-001-U01',
  'TOL-001-U99',
  'TOL-999-U123',
  'INV-042',
  'TRX-2026-0001',
  'REQ-2026-0012',
  'ENDMILL-D10-4FL',
  '0123456789',
  '12',
  '1234',
  '12345',
  '123456',
  'ABC123456DEF',
  'ABC1234567DEF',
  'TOL-20260001',
  'A',
  '  TOL-005-U02  ',
  allPrintableAscii.slice(0, 32),
  allPrintableAscii.slice(32, 64),
  allPrintableAscii.slice(64),
];

for (const tc of code128TestCases) {
  const decoded = decodeEncodedWithZXing(tc);
  assert.equal(decoded, tc.trim(), `ZXing decode mismatch for "${tc}"`);
}

// Verify Code C numeric compression actually reduces module count vs pure Code B
const numericEncoded = encodeCode128('0123456789', 10);
assert.ok(numericEncoded);
// Start C (1) + 5 digit pairs (5) + checksum (1) + stop (1) = 8 symbols
assert.equal(numericEncoded.values.length, 8, '10 digits should compress via Code Set C');

// Empty, whitespace, non-ASCII, and non-finite quietZone edge cases
assert.equal(encodeCode128(''), null, 'Empty string must return null');
assert.equal(encodeCode128('   '), null, 'Whitespace string must return null');
assert.equal(encodeCode128('\n\t\r'), null, 'Control-only string must return null');
assert.equal(encodeCode128(null as unknown as string), null, 'Null input must return null');
assert.equal(sanitizeCode128Text('TOL-001\u0007-U01✓'), 'TOL-001-U01');
assert.equal(decodeEncodedWithZXing('TOL-001\u0007-U01✓'), 'TOL-001-U01');

const nanQuiet = encodeCode128('TOL-001-U01', Number.NaN);
assert.ok(nanQuiet && Number.isFinite(nanQuiet.totalModules) && nanQuiet.quietZoneModules === 10);
const infQuiet = encodeCode128('TOL-001-U01', Number.POSITIVE_INFINITY);
assert.ok(infQuiet && Number.isFinite(infQuiet.totalModules) && infQuiet.quietZoneModules === 10);
const negQuiet = encodeCode128('TOL-001-U01', -5);
assert.ok(negQuiet && negQuiet.quietZoneModules === 0);

// ---------------------------------------------------------------------------
// 3. Global USB Keyboard-Wedge Scanner Engine Edge Cases
// ---------------------------------------------------------------------------
{
  // 3a. Fast USB scan with Shift modifiers + Enter
  const scanned: string[] = [];
  const proc = createBarcodeBufferProcessor({
    minLength: 4,
    maxIntervalMs: 80,
    onScan: (c) => scanned.push(c),
  });

  const payload = 'TOL-001-U01';
  let t = 1000;
  for (const ch of payload) {
    if (ch >= 'A' && ch <= 'Z') {
      const shiftRes = proc.handleKeyDown({ key: 'Shift', isEditableTarget: false }, t);
      assert.equal(shiftRes.matched, false);
      t += 2;
    }
    const res = proc.handleKeyDown({ key: ch, isEditableTarget: false }, t);
    assert.equal(res.matched, false);
    t += 15;
  }
  const enterRes = proc.handleKeyDown({ key: 'Enter', isEditableTarget: false }, t + 10);
  assert.equal(enterRes.matched, true);
  assert.equal(enterRes.scannedCode, 'TOL-001-U01');
  assert.equal(enterRes.shouldPreventDefault, true);
  assert.deepEqual(scanned, ['TOL-001-U01']);
}

{
  // 3b. Slow manual typing (140ms between chars) must NOT trigger scan
  const scanned: string[] = [];
  const proc = createBarcodeBufferProcessor({
    minLength: 4,
    maxIntervalMs: 80,
    onScan: (c) => scanned.push(c),
  });

  let t = 2000;
  for (const ch of 'TOL-001-U01') {
    proc.handleKeyDown({ key: ch, isEditableTarget: false }, t);
    t += 140;
  }
  const enterRes = proc.handleKeyDown({ key: 'Enter', isEditableTarget: false }, t + 20);
  assert.equal(enterRes.matched, false);
  assert.equal(enterRes.shouldPreventDefault, false);
  assert.deepEqual(scanned, []);
}

{
  // 3c. Editable target (input/textarea/select/contentEditable) must be ignored
  const scanned: string[] = [];
  const proc = createBarcodeBufferProcessor({
    minLength: 4,
    maxIntervalMs: 80,
    onScan: (c) => scanned.push(c),
  });

  let t = 3000;
  for (const ch of 'TOL-001-U01') {
    proc.handleKeyDown({ key: ch, isEditableTarget: true }, t);
    t += 10;
  }
  const enterRes = proc.handleKeyDown({ key: 'Enter', isEditableTarget: true }, t + 10);
  assert.equal(enterRes.matched, false);
  assert.deepEqual(scanned, []);

  assert.equal(isEditableElement({ tagName: 'INPUT', type: 'text' } as unknown as EventTarget), true);
  assert.equal(isEditableElement({ tagName: 'INPUT', type: 'search' } as unknown as EventTarget), true);
  assert.equal(isEditableElement({ tagName: 'INPUT', type: 'number' } as unknown as EventTarget), true);
  assert.equal(isEditableElement({ tagName: 'TEXTAREA' } as unknown as EventTarget), true);
  assert.equal(isEditableElement({ tagName: 'SELECT' } as unknown as EventTarget), true);
  assert.equal(isEditableElement({ tagName: 'DIV', isContentEditable: true } as unknown as EventTarget), true);
  assert.equal(isEditableElement({ tagName: 'BUTTON' } as unknown as EventTarget), false);
  assert.equal(isEditableElement({ tagName: 'INPUT', type: 'checkbox' } as unknown as EventTarget), false);
  assert.equal(isEditableElement({ tagName: 'BODY' } as unknown as EventTarget), false);
  assert.equal(isEditableElement(null), false);
}

{
  // 3d. Stray slow keystroke followed by rapid scan discards stray key
  const scanned: string[] = [];
  const proc = createBarcodeBufferProcessor({
    minLength: 4,
    maxIntervalMs: 80,
    onScan: (c) => scanned.push(c),
  });

  proc.handleKeyDown({ key: 'x', isEditableTarget: false }, 1000);
  let t = 2500; // 1.5s later
  for (const ch of 'tol-002-u05') {
    proc.handleKeyDown({ key: ch, isEditableTarget: false }, t);
    t += 12;
  }
  const res = proc.handleKeyDown({ key: 'Enter', isEditableTarget: false }, t + 12);
  assert.equal(res.matched, true);
  assert.equal(res.scannedCode, 'TOL-002-U05');
  assert.deepEqual(scanned, ['TOL-002-U05']);
}

{
  // 3e. Short burst (< minLength) and delayed Enter (> enterTimeoutMs) must NOT trigger
  const scanned: string[] = [];
  const proc = createBarcodeBufferProcessor({
    minLength: 4,
    maxIntervalMs: 80,
    enterTimeoutMs: 150,
    onScan: (c) => scanned.push(c),
  });

  proc.handleKeyDown({ key: 'A', isEditableTarget: false }, 100);
  proc.handleKeyDown({ key: 'B', isEditableTarget: false }, 110);
  proc.handleKeyDown({ key: 'C', isEditableTarget: false }, 120);
  assert.equal(proc.handleKeyDown({ key: 'Enter', isEditableTarget: false }, 130).matched, false);

  let t = 500;
  for (const ch of 'TOL-001-U01') {
    proc.handleKeyDown({ key: ch, isEditableTarget: false }, t);
    t += 10;
  }
  // Delayed Enter after 400ms
  assert.equal(proc.handleKeyDown({ key: 'Enter', isEditableTarget: false }, t + 400).matched, false);
  assert.deepEqual(scanned, []);
}

{
  // 3f. Ctrl/Meta shortcut or Escape clears buffer
  const scanned: string[] = [];
  const proc = createBarcodeBufferProcessor({
    minLength: 4,
    maxIntervalMs: 80,
    onScan: (c) => scanned.push(c),
  });
  proc.handleKeyDown({ key: 'T', isEditableTarget: false }, 100);
  proc.handleKeyDown({ key: 'O', isEditableTarget: false }, 110);
  proc.handleKeyDown({ key: 'Escape', isEditableTarget: false }, 120);
  assert.equal(proc.getBuffer(), '');
  proc.handleKeyDown({ key: 'L', isEditableTarget: false }, 130);
  proc.handleKeyDown({ key: 'v', ctrlKey: true, isEditableTarget: false }, 140);
  assert.equal(proc.getBuffer(), '');
  assert.deepEqual(scanned, []);
}

{
  // 3g. Tab-terminated USB/Bluetooth HID scanner burst works, while standalone Tab navigation passes through
  const scanned: string[] = [];
  const proc = createBarcodeBufferProcessor({
    minLength: 4,
    maxIntervalMs: 80,
    onScan: (c) => scanned.push(c),
  });

  // Standalone Tab navigation must NOT be intercepted
  const plainTab = proc.handleKeyDown({ key: 'Tab', isEditableTarget: false }, 100);
  assert.equal(plainTab.matched, false);
  assert.equal(plainTab.shouldPreventDefault, false);

  // Fast burst terminated by Tab MUST trigger scan and prevent default focus jump
  let t = 500;
  for (const ch of 'TOL-009-U04') {
    proc.handleKeyDown({ key: ch, isEditableTarget: false }, t);
    t += 14;
  }
  const tabScan = proc.handleKeyDown({ key: 'Tab', isEditableTarget: false }, t + 12);
  assert.equal(tabScan.matched, true);
  assert.equal(tabScan.scannedCode, 'TOL-009-U04');
  assert.equal(tabScan.shouldPreventDefault, true);

  // Consecutive rapid back-to-back scan after Tab scan
  t += 200;
  for (const ch of 'TOL-009-U05') {
    proc.handleKeyDown({ key: ch, isEditableTarget: false }, t);
    t += 14;
  }
  const secondScan = proc.handleKeyDown({ key: 'Enter', isEditableTarget: false }, t + 12);
  assert.equal(secondScan.matched, true);
  assert.equal(secondScan.scannedCode, 'TOL-009-U05');
  assert.deepEqual(scanned, ['TOL-009-U04', 'TOL-009-U05']);
}

console.log(
  `PASS: Verified 107 Code 128 patterns, ${code128TestCases.length} ZXing Code128Reader decode cases (including all 95 ASCII chars), and all USB auto-scanner engine edge cases.`
);
