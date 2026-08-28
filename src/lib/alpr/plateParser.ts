import { OcrResult } from './types';
import { getRegionInfo, INDONESIAN_PLATE_REGIONS } from './indonesianRegions';

// Substitution mapping for MIDDLE NUMBERS (Letters mistaken for numbers)
export const CHAR_TO_NUM_MAP: Record<string, string> = {
  O: '0', D: '0', Q: '0', U: '0', C: '0',
  I: '1', L: '1', l: '1', '|': '1', J: '1', '/': '1',
  Z: '2',
  E: '3',
  A: '4',
  S: '5', s: '5',
  G: '6', b: '6',
  T: '7', Y: '7',
  B: '8',
  g: '9', q: '9', P: '9'
};

// Substitution mapping for PREFIX & SUFFIX LETTERS (Numbers mistaken for letters)
export const NUM_TO_CHAR_MAP: Record<string, string> = {
  '0': 'O',
  '1': 'I',
  '2': 'Z',
  '3': 'E',
  '4': 'A',
  '5': 'S',
  '6': 'G',
  '7': 'T',
  '8': 'B',
  '9': 'P'
};

// Common OCR misinterpretations for Indonesian plate prefixes
export const PREFIX_OCR_CORRECTIONS: Record<string, string> = {
  ')K': 'DK', '(K': 'DK', ']K': 'DK', '[K': 'DK', 'JK': 'DK',
  'PK': 'DK', '0K': 'DK', 'OK': 'DK', 'DX': 'DK', 'D<': 'DK', '1K': 'DK',
  '8E': 'BE', '0E': 'BE', '6E': 'BE',
  '8': 'B', '0': 'D', '5': 'S', '1': 'I'
};

export const VALID_INDONESIA_PREFIXES = new Set(Object.keys(INDONESIAN_PLATE_REGIONS));

export function cleanOcrText(rawText: string): string {
  if (!rawText) return '';
  let text = rawText.toUpperCase().replace(/[\r\n\t]+/g, ' ');
  // Strip frame brackets, pipes, quotes, and punctuation noise
  text = text.replace(/[\[\]\(\)\{\}\|_~"'\\]/g, ' ');
  text = text.replace(/[^A-Z0-9\s.\-]/g, ' ');
  return text.replace(/\s+/g, ' ').trim();
}

export function isTaxDateToken(token: string): boolean {
  const clean = token.trim();
  return /^[0-1]?[0-9][.\-\/\s][2-3][0-9]$/.test(clean);
}

export function repairPrefix(prefix: string): string {
  if (!prefix) return '';
  const p = prefix.toUpperCase().trim();
  if (PREFIX_OCR_CORRECTIONS[p]) return PREFIX_OCR_CORRECTIONS[p];

  let corrected = '';
  for (const ch of p) {
    if (NUM_TO_CHAR_MAP[ch]) {
      corrected += NUM_TO_CHAR_MAP[ch];
    } else if (/[A-Z]/.test(ch)) {
      corrected += ch;
    }
  }

  if (PREFIX_OCR_CORRECTIONS[corrected]) return PREFIX_OCR_CORRECTIONS[corrected];
  return corrected || p;
}

export function repairNumber(numStr: string): string {
  if (!numStr) return '';
  let corrected = '';
  for (const ch of numStr) {
    if (CHAR_TO_NUM_MAP[ch]) {
      corrected += CHAR_TO_NUM_MAP[ch];
    } else if (/[0-9]/.test(ch)) {
      corrected += ch;
    }
  }
  return corrected.slice(0, 4);
}

export function repairSuffix(sufStr: string): string {
  if (!sufStr) return '';
  let corrected = '';
  for (const ch of sufStr) {
    if (ch === 'Q') {
      corrected += 'G';
    } else if (NUM_TO_CHAR_MAP[ch]) {
      corrected += NUM_TO_CHAR_MAP[ch];
    } else if (/[A-Z]/.test(ch)) {
      corrected += ch;
    }
  }
  return corrected.slice(0, 3);
}

/**
 * Parses and formats raw OCR string with Samsat heuristic correction matrix
 */
export function parseIndonesianPlate(rawText: string, rawConfidence: number = 80): OcrResult {
  const cleaned = cleanOcrText(rawText);

  let expiryDate: string | undefined;
  const rawTokens = cleaned.split(' ').filter(Boolean);
  const plateTokens: string[] = [];

  for (const t of rawTokens) {
    if (isTaxDateToken(t)) {
      expiryDate = t.replace(/\s+/g, '.').replace(/-/g, '.');
    } else {
      plateTokens.push(t);
    }
  }

  let formattedPlate = '';
  let prefix = '';
  let number = '';
  let suffix = '';
  let isValid = false;
  let score = rawConfidence;

  // STRATEGY 1: 3 Tokens (e.g. ['BE', '1193', 'ALQ'] or ['B', '2581', 'GDC'])
  if (plateTokens.length === 3) {
    const p = repairPrefix(plateTokens[0]);
    const n = repairNumber(plateTokens[1]);
    const s = repairSuffix(plateTokens[2]);

    if (p.length >= 1 && n.length >= 1) {
      prefix = p;
      number = n;
      suffix = s;
      formattedPlate = `${p} ${n} ${s}`.trim();
      isValid = VALID_INDONESIA_PREFIXES.has(p) && /^[0-9]{1,4}$/.test(n);
      score = isValid ? Math.max(92, score + 10) : score;
    }
  }

  // STRATEGY 2: 2 Tokens (e.g. ['BE1945', 'F'] or ['B', '2581GDC'])
  if (!isValid && plateTokens.length === 2) {
    const [t1, t2] = plateTokens;

    // Case A: t1="BE1945", t2="F"
    const m1 = t1.match(/^([A-Z0-9]{1,2})([0-9A-Z]{1,4})$/);
    if (m1) {
      const p = repairPrefix(m1[1]);
      const n = repairNumber(m1[2]);
      const s = repairSuffix(t2);
      if (p && n) {
        prefix = p;
        number = n;
        suffix = s;
        formattedPlate = `${p} ${n} ${s}`.trim();
        isValid = VALID_INDONESIA_PREFIXES.has(p) && /^[0-9]{1,4}$/.test(n);
        score = isValid ? Math.max(88, score + 8) : score;
      }
    }

    // Case B: t1="B", t2="2581GDC"
    if (!isValid) {
      const m2 = t2.match(/^([0-9A-Z]{1,4})([A-Z0-9]{1,3})$/);
      if (m2) {
        const p = repairPrefix(t1);
        const n = repairNumber(m2[1]);
        const s = repairSuffix(m2[2]);
        if (p && n) {
          prefix = p;
          number = n;
          suffix = s;
          formattedPlate = `${p} ${n} ${s}`.trim();
          isValid = VALID_INDONESIA_PREFIXES.has(p) && /^[0-9]{1,4}$/.test(n);
          score = isValid ? Math.max(88, score + 8) : score;
        }
      }
    }
  }

  // STRATEGY 3: Compact string (e.g. "BE1945F" or "B2581GDC" or "DK5248HG")
  if (!isValid) {
    const compact = cleaned.replace(/[^A-Z0-9]/g, '');

    // Extract leading letters (1-2 chars), middle digits (1-4 chars), trailing letters (0-3 chars)
    const matchCompact = compact.match(/^([A-Z]{1,2})([0-9]{1,4})([A-Z]{0,3})$/);
    if (matchCompact) {
      const p = repairPrefix(matchCompact[1]);
      const n = matchCompact[2];
      const s = matchCompact[3] || '';
      prefix = p;
      number = n;
      suffix = s;
      formattedPlate = `${p} ${n} ${s}`.trim();
      isValid = VALID_INDONESIA_PREFIXES.has(p);
      score = isValid ? Math.max(90, score + 6) : score;
    } else {
      // Fuzzy extraction by finding digit group index
      const digitMatch = compact.match(/([0-9]{1,4})/);
      if (digitMatch && digitMatch.index !== undefined) {
        const startD = digitMatch.index;
        const endD = startD + digitMatch[0].length;

        const rawP = compact.slice(0, startD);
        const rawN = compact.slice(startD, endD);
        const rawS = compact.slice(endD);

        const p = repairPrefix(rawP);
        const n = repairNumber(rawN);
        const s = repairSuffix(rawS);

        if (p && n) {
          prefix = p;
          number = n;
          suffix = s;
          formattedPlate = `${p} ${n} ${s}`.trim();
          isValid = VALID_INDONESIA_PREFIXES.has(p) && /^[0-9]{1,4}$/.test(n);
          score = isValid ? Math.max(85, score) : score;
        }
      }
    }
  }

  // Fallback if unparsed
  if (!formattedPlate) {
    formattedPlate = cleaned || 'TIDAK TERBACA';
  }

  const region = prefix ? getRegionInfo(prefix) : null;

  return {
    rawText,
    cleanedText: cleaned,
    formattedPlate,
    expiryDate,
    confidence: Math.min(100, Math.max(isValid ? 75 : 40, score)),
    isValidFormat: isValid,
    regionCode: prefix || undefined,
    regionName: region ? `${region.name} (${region.island})` : undefined,
  };
}
