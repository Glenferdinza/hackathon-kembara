/**
 * Pure ISO/IEC 15417 Code 128 (Auto Code Set B / Code Set C) Barcode Encoder.
 * Produces deterministic module run-lengths and SVG bar geometry with zero DOM dependency.
 */

// Official ISO/IEC 15417 Code 128 bar/space width patterns (indices 0..106).
// Symbols 0..105 have 6 elements (3 bars, 3 spaces) totaling 11 modules.
// Symbol 106 (STOP) has 7 elements (4 bars, 3 spaces) totaling 13 modules.
export const CODE128_PATTERNS: readonly string[] = [
  '212222', // 0
  '222122', // 1
  '222221', // 2
  '121223', // 3
  '121322', // 4
  '131222', // 5
  '122213', // 6
  '122312', // 7
  '132212', // 8
  '221213', // 9
  '221312', // 10
  '231212', // 11
  '112232', // 12
  '122132', // 13
  '122231', // 14
  '113222', // 15
  '123122', // 16
  '123221', // 17
  '223211', // 18
  '221132', // 19
  '221231', // 20
  '213212', // 21
  '223112', // 22
  '312131', // 23
  '311222', // 24
  '321122', // 25
  '321221', // 26
  '312212', // 27
  '322112', // 28
  '322211', // 29
  '212123', // 30
  '212321', // 31
  '232121', // 32
  '111323', // 33
  '131123', // 34
  '131321', // 35
  '112313', // 36
  '132113', // 37
  '132311', // 38
  '211313', // 39
  '231113', // 40
  '231311', // 41
  '112133', // 42
  '112331', // 43
  '132131', // 44
  '113123', // 45
  '113321', // 46
  '133121', // 47
  '313121', // 48
  '211331', // 49
  '231131', // 50
  '213113', // 51
  '213311', // 52
  '213131', // 53
  '311123', // 54
  '311321', // 55
  '331121', // 56
  '312113', // 57
  '312311', // 58
  '332111', // 59
  '314111', // 60
  '221411', // 61
  '431111', // 62
  '111224', // 63
  '111422', // 64
  '121124', // 65
  '121421', // 66
  '141122', // 67
  '141221', // 68
  '112214', // 69
  '112412', // 70
  '122114', // 71
  '122411', // 72
  '142112', // 73
  '142211', // 74
  '241211', // 75
  '221114', // 76
  '413111', // 77
  '241112', // 78
  '134111', // 79
  '111242', // 80
  '121142', // 81
  '121241', // 82
  '114212', // 83
  '124112', // 84
  '124211', // 85
  '411212', // 86
  '421112', // 87
  '421211', // 88
  '212141', // 89
  '214121', // 90
  '412121', // 91
  '111143', // 92
  '111341', // 93
  '131141', // 94
  '114113', // 95
  '114311', // 96
  '411113', // 97
  '411311', // 98
  '113141', // 99  (CODE C)
  '114131', // 100 (CODE B)
  '311141', // 101 (CODE A)
  '411131', // 102 (FNC 1)
  '211412', // 103 (START A)
  '211214', // 104 (START B)
  '211232', // 105 (START C)
  '2331112', // 106 (STOP)
];

const CODE_C_SWITCH = 99;
const CODE_B_SWITCH = 100;
const START_B = 104;
const START_C = 105;
const STOP_CODE = 106;

export interface BarcodeBarRect {
  x: number;
  width: number;
}

export interface EncodedCode128 {
  text: string;
  values: number[];
  bars: BarcodeBarRect[];
  totalModules: number;
  quietZoneModules: number;
}

/**
 * Keeps only printable ASCII characters (0x20..0x7E) supported by Code 128B/C.
 */
export function sanitizeCode128Text(input: string): string {
  const trimmed = input.trim();
  let result = '';
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (code >= 32 && code <= 126) {
      result += trimmed[i];
    }
  }
  return result;
}

function countConsecutiveDigits(text: string, startIndex: number): number {
  let count = 0;
  for (let i = startIndex; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c >= 48 && c <= 57) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Encodes printable ASCII text into optimal Code 128 (auto switching between Code B and Code C)
 * and returns crisp vector bar coordinates with ISO quiet zones.
 */
export function encodeCode128(rawInput: string, quietZoneModules = 10): EncodedCode128 | null {
  if (typeof rawInput !== 'string') return null;
  const text = sanitizeCode128Text(rawInput);
  if (!text) return null;

  const safeQuiet = Number.isFinite(quietZoneModules)
    ? Math.max(0, Math.floor(quietZoneModules))
    : 10;
  const values: number[] = [];

  // Choose initial Code Set: use Start C if entire string is 2 digits, or starts with 4+ digits.
  const leadingDigits = countConsecutiveDigits(text, 0);
  let mode: 'B' | 'C' =
    (text.length === 2 && leadingDigits === 2) || leadingDigits >= 4 ? 'C' : 'B';

  values.push(mode === 'C' ? START_C : START_B);

  let idx = 0;
  while (idx < text.length) {
    const digits = countConsecutiveDigits(text, idx);

    if (mode === 'C') {
      if (digits >= 2) {
        const pair = parseInt(text.slice(idx, idx + 2), 10);
        values.push(pair);
        idx += 2;
      } else {
        values.push(CODE_B_SWITCH);
        mode = 'B';
      }
    } else {
      // Switch from B to C if we have >= 4 consecutive digits (even count) or >= 6 digits
      const remaining = text.length - idx;
      if ((digits >= 4 && digits === remaining && digits % 2 === 0) || digits >= 6) {
        // If odd number of digits >= 6, emit first digit in B so remaining pair count is even
        if (digits % 2 === 1) {
          values.push(text.charCodeAt(idx) - 32);
          idx += 1;
        }
        values.push(CODE_C_SWITCH);
        mode = 'C';
      } else {
        values.push(text.charCodeAt(idx) - 32);
        idx += 1;
      }
    }
  }

  // Compute ISO/IEC 15417 modulo-103 checksum
  let weightedSum = values[0];
  for (let i = 1; i < values.length; i++) {
    weightedSum += values[i] * i;
  }
  const checksum = weightedSum % 103;
  values.push(checksum);
  values.push(STOP_CODE);

  // Convert symbol patterns into vector bar rects
  const bars: BarcodeBarRect[] = [];
  let cursor = safeQuiet;

  for (const val of values) {
    const pattern = CODE128_PATTERNS[val];
    for (let j = 0; j < pattern.length; j++) {
      const width = Number(pattern[j]);
      // Even indices (0, 2, 4, 6) are black bars; odd indices (1, 3, 5) are white spaces
      if (j % 2 === 0) {
        bars.push({ x: cursor, width });
      }
      cursor += width;
    }
  }

  const totalModules = cursor + safeQuiet;

  return {
    text,
    values,
    bars,
    totalModules,
    quietZoneModules: safeQuiet,
  };
}
