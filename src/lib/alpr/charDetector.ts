import * as ort from 'onnxruntime-web';
import { BoundingBox, OcrResult } from './types';
import { parseIndonesianPlate } from './plateParser';

let charSession: ort.InferenceSession | null = null;
let isCharLoading = false;
let charLoadError: string | null = null;

// Exact Roboflow Alphabetic Export Class Mapping from char_detector.onnx metadata
const ROBFLOW_CHAR_MAPPING: Record<number, string> = {
  0: '0', 1: '1', 2: 'A', 3: 'B', 4: 'C', 5: 'D', 6: 'E', 7: 'F', 8: 'G', 9: 'H',
  10: 'I', 11: 'J', 12: '2', 13: 'K', 14: 'L', 15: 'M', 16: 'N', 17: 'O', 18: 'P', 19: 'Q',
  20: 'R', 21: 'S', 22: 'T', 23: '3', 24: 'U', 25: 'V', 26: 'W', 27: 'X', 28: 'Y', 29: 'Z',
  30: '4', 31: '5', 32: '6', 33: '7', 34: '8', 35: '9'
};

export async function loadCharDetector(modelSource: string | ArrayBuffer = '/models/char_detector.onnx'): Promise<ort.InferenceSession> {
  if (charSession) {
    return charSession;
  }

  isCharLoading = true;
  charLoadError = null;

  const sessionOptions: ort.InferenceSession.SessionOptions = {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  };

  const candidateUrls =
    typeof modelSource === 'string'
      ? [modelSource, '/models/char_best.onnx', '/models/char_detector.onnx']
      : [modelSource];

  let lastError: any = null;

  for (const url of candidateUrls) {
    try {
      const session =
        typeof url === 'string'
          ? await ort.InferenceSession.create(url, sessionOptions)
          : await ort.InferenceSession.create(new Uint8Array(url), sessionOptions);

      charSession = session;
      isCharLoading = false;
      console.log('✅ Berhasil memuat model karakter ONNX:', url);
      return session;
    } catch (err) {
      lastError = err;
    }
  }

  isCharLoading = false;
  charLoadError = lastError?.message || 'Gagal memuat model karakter ONNX';
  console.warn('Char Detector load notice:', charLoadError);
  throw lastError || new Error(charLoadError!);
}

export function isCharDetectorLoaded(): boolean {
  return !!charSession;
}

interface DetectedChar {
  char: string;
  conf: number;
  bbox: BoundingBox;
  centerX: number;
  centerY: number;
}

/**
 * Predicts all characters inside a cropped license plate using 2-Stage YOLO Neural Network (320x320)
 */
export async function predictCharactersFromPlate(
  plateCanvas: HTMLCanvasElement,
  confThreshold: number = 0.22
): Promise<OcrResult | null> {
  if (!charSession) return null;

  // Model was trained on 320x320 imgsz
  const modelInputSize = 320;
  const inputCanvas = document.createElement('canvas');
  inputCanvas.width = modelInputSize;
  inputCanvas.height = modelInputSize;
  const ctx = inputCanvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(plateCanvas, 0, 0, modelInputSize, modelInputSize);
  const imgData = ctx.getImageData(0, 0, modelInputSize, modelInputSize);
  const data = imgData.data;

  const float32Data = new Float32Array(3 * modelInputSize * modelInputSize);
  const channelSize = modelInputSize * modelInputSize;

  for (let i = 0; i < channelSize; i++) {
    float32Data[i] = data[i * 4] / 255.0;
    float32Data[channelSize + i] = data[i * 4 + 1] / 255.0;
    float32Data[2 * channelSize + i] = data[i * 4 + 2] / 255.0;
  }

  const inputTensor = new ort.Tensor('float32', float32Data, [1, 3, modelInputSize, modelInputSize]);
  const inputName = charSession.inputNames[0];
  const feeds: Record<string, ort.Tensor> = {};
  feeds[inputName] = inputTensor;

  const results = await charSession.run(feeds);
  const outputName = charSession.outputNames[0];
  const outputTensor = results[outputName];
  const outputData = outputTensor.data as Float32Array;

  // Tensor shape: [1, 40, 2100]
  const numPredictions = 2100;
  const numClasses = 36;

  const rawChars: DetectedChar[] = [];
  const scaleX = plateCanvas.width / modelInputSize;
  const scaleY = plateCanvas.height / modelInputSize;

  for (let i = 0; i < numPredictions; i++) {
    let maxScore = -1;
    let maxCls = -1;

    for (let c = 0; c < numClasses; c++) {
      const score = outputData[(4 + c) * numPredictions + i];
      if (score > maxScore) {
        maxScore = score;
        maxCls = c;
      }
    }

    if (maxScore >= confThreshold && maxCls >= 0 && ROBFLOW_CHAR_MAPPING[maxCls]) {
      const cx = outputData[0 * numPredictions + i];
      const cy = outputData[1 * numPredictions + i];
      const w = outputData[2 * numPredictions + i];
      const h = outputData[3 * numPredictions + i];

      const x = Math.max(0, Math.round((cx - w / 2) * scaleX));
      const y = Math.max(0, Math.round((cy - h / 2) * scaleY));
      const width = Math.min(plateCanvas.width - x, Math.round(w * scaleX));
      const height = Math.min(plateCanvas.height - y, Math.round(h * scaleY));

      rawChars.push({
        char: ROBFLOW_CHAR_MAPPING[maxCls],
        conf: maxScore,
        bbox: { x, y, width, height },
        centerX: cx * scaleX,
        centerY: cy * scaleY,
      });
    }
  }

  // Non-Maximum Suppression (NMS)
  rawChars.sort((a, b) => b.conf - a.conf);
  const selectedChars: DetectedChar[] = [];

  for (const charItem of rawChars) {
    let overlap = false;
    for (const sel of selectedChars) {
      const xOverlap = Math.max(0, Math.min(charItem.bbox.x + charItem.bbox.width, sel.bbox.x + sel.bbox.width) - Math.max(charItem.bbox.x, sel.bbox.x));
      const yOverlap = Math.max(0, Math.min(charItem.bbox.y + charItem.bbox.height, sel.bbox.y + sel.bbox.height) - Math.max(charItem.bbox.y, sel.bbox.y));
      const intersection = xOverlap * yOverlap;
      const union = charItem.bbox.width * charItem.bbox.height + sel.bbox.width * sel.bbox.height - intersection;
      const iou = intersection / union;

      if (iou > 0.30) {
        overlap = true;
        break;
      }
    }

    if (!overlap) {
      selectedChars.push(charItem);
    }
  }

  if (selectedChars.length === 0) return null;

  // Separate Top Line (Main Plate Number) vs Bottom Line (Tax Expiry Date)
  const plateHeight = plateCanvas.height;
  const mainChars: DetectedChar[] = [];
  const taxChars: DetectedChar[] = [];

  for (const c of selectedChars) {
    if (c.centerY > plateHeight * 0.68 && selectedChars.length > 5) {
      taxChars.push(c);
    } else {
      mainChars.push(c);
    }
  }

  const activeMainChars = mainChars.length > 0 ? mainChars : selectedChars;

  // Sort left-to-right by X coordinate
  activeMainChars.sort((a, b) => a.centerX - b.centerX);
  taxChars.sort((a, b) => a.centerX - b.centerX);

  // Construct plate string with natural whitespace gap detection
  let plateString = '';
  let prevRight: number | null = null;
  const avgCharWidth = activeMainChars.reduce((sum, c) => sum + c.bbox.width, 0) / activeMainChars.length;

  for (const c of activeMainChars) {
    if (prevRight !== null) {
      const gap = c.bbox.x - prevRight;
      if (gap > avgCharWidth * 0.40) {
        plateString += ' ';
      }
    }
    plateString += c.char;
    prevRight = c.bbox.x + c.bbox.width;
  }

  let taxDateString = taxChars.map((c) => c.char).join('');
  if (taxDateString.length >= 4) {
    taxDateString = `${taxDateString.slice(0, 2)}.${taxDateString.slice(2, 4)}`;
  }

  const avgConfidence = Math.round((activeMainChars.reduce((sum, c) => sum + c.conf, 0) / activeMainChars.length) * 100);

  const parsed = parseIndonesianPlate(plateString, avgConfidence);
  if (taxDateString && !parsed.expiryDate) {
    parsed.expiryDate = taxDateString;
  }

  return parsed;
}
