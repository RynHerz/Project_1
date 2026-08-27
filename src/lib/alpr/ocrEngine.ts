import { createWorker, Worker } from 'tesseract.js';
import { OcrResult } from './types';
import { parseIndonesianPlate } from './plateParser';
import { cropTopLineRoi, enhancePlateForOcr } from './platePreprocessor';

let ocrWorker: Worker | null = null;
let isInitializing = false;
let initPromise: Promise<Worker> | null = null;

/**
 * Initializes or retrieves the singleton Tesseract.js worker
 */
export async function getOcrWorker(): Promise<Worker> {
  if (ocrWorker) return ocrWorker;
  if (initPromise) return initPromise;

  isInitializing = true;
  initPromise = (async () => {
    try {
      const worker = await createWorker('eng', 1, {
        logger: () => {},
      });

      // PSM 6 = Assume a single uniform block of text (far superior for 2-line Indonesian license plates)
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.- ',
        tessedit_pageseg_mode: '6' as unknown as any,
      });

      ocrWorker = worker;
      isInitializing = false;
      return worker;
    } catch (err) {
      isInitializing = false;
      initPromise = null;
      console.error('Failed to initialize Tesseract OCR Worker:', err);
      throw err;
    }
  })();

  return initPromise;
}

/**
 * Runs OCR on multiple variations of the canvas (including Adaptive Binarized black-on-white)
 * and picks the most accurate Indonesian plate reading
 */
export async function recognizePlateFromCanvas(canvas: HTMLCanvasElement, enhancedCanvas?: HTMLCanvasElement): Promise<OcrResult> {
  const worker = await getOcrWorker();

  const binarized = enhancedCanvas || enhancePlateForOcr(canvas);
  const topLineBinarized = cropTopLineRoi(binarized);
  const topLineOriginal = cropTopLineRoi(canvas);

  // Multi-pass variants: Testing enhanced binarized first (optimal for black & white Indonesian plates)
  const variants: { name: string; canvas: HTMLCanvasElement }[] = [
    { name: 'enhanced_binarized', canvas: binarized },
    { name: 'enhanced_top_main_line', canvas: topLineBinarized },
    { name: 'original_natural', canvas },
    { name: 'top_main_line', canvas: topLineOriginal },
  ];

  const results: OcrResult[] = [];

  for (const variant of variants) {
    try {
      const res = await worker.recognize(variant.canvas);
      const rawText = res.data.text || '';
      const rawConf = res.data.confidence || 0;

      if (rawText.trim().length > 0) {
        const parsed = parseIndonesianPlate(rawText, rawConf);
        results.push(parsed);

        // If we found a valid plate format (e.g. DB 1392 BV or B 1234 ABC), return immediately
        if (parsed.isValidFormat && parsed.regionCode) {
          return parsed;
        }
      }
    } catch (e) {
      // Continue to next variant
    }
  }

  // Pick highest scoring result
  if (results.length > 0) {
    results.sort((a, b) => b.confidence - a.confidence);
    return results[0];
  }

  return parseIndonesianPlate('', 0);
}

/**
 * Plays audio feedback
 */
export function playDetectionAudioBeep(isSuccess: boolean = true) {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    
    if (isSuccess) {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    }
  } catch (err) {}
}
