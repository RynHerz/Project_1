import * as ort from 'onnxruntime-web';
import { BoundingBox, PlateCandidate } from './types';
import { cropCanvas, enhancePlateForOcr } from './platePreprocessor';

let onnxSession: ort.InferenceSession | null = null;
let isModelLoading = false;
let modelLoadError: string | null = null;
let activeModelName: string = 'none';

// Configure ONNX WebAssembly environment paths
if (typeof window !== 'undefined') {
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.simd = true;
}

/**
 * Loads the primary dedicated YOLO license plate detector model
 */
export async function loadOnnxModel(modelSource: string | ArrayBuffer = '/models/plate_detector.onnx'): Promise<ort.InferenceSession> {
  if (onnxSession) {
    return onnxSession;
  }

  isModelLoading = true;
  modelLoadError = null;

  const sessionOptions: ort.InferenceSession.SessionOptions = {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  };

  const candidateUrls =
    typeof modelSource === 'string'
      ? [modelSource, '/models/best.onnx', '/models/plate_detector.onnx']
      : [modelSource];

  let lastError: any = null;

  for (const url of candidateUrls) {
    try {
      const session =
        typeof url === 'string'
          ? await ort.InferenceSession.create(url, sessionOptions)
          : await ort.InferenceSession.create(new Uint8Array(url), sessionOptions);

      onnxSession = session;
      isModelLoading = false;
      activeModelName = typeof url === 'string' ? url : 'custom_buffer';
      console.log('✅ Berhasil memuat model Plat ONNX:', activeModelName);
      return session;
    } catch (err) {
      lastError = err;
    }
  }

  isModelLoading = false;
  modelLoadError = lastError?.message || 'Gagal memuat model Plat ONNX';
  console.warn('ONNX Model Load Notice:', modelLoadError);
  throw lastError || new Error(modelLoadError!);
}

export function getOnnxStatus(): { loaded: boolean; loading: boolean; error: string | null; modelName?: string } {
  return {
    loaded: !!onnxSession,
    loading: isModelLoading,
    error: modelLoadError,
    modelName: activeModelName,
  };
}

interface RawPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  conf: number;
  classId: number;
}

/**
 * Performs Non-Maximum Suppression (NMS) to eliminate overlapping lower-confidence plate boxes
 */
function applyNms(boxes: RawPrediction[], iouThreshold: number = 0.40): RawPrediction[] {
  boxes.sort((a, b) => b.conf - a.conf);
  const selected: RawPrediction[] = [];

  for (const box of boxes) {
    let overlap = false;
    for (const sel of selected) {
      const x1 = Math.max(box.x, sel.x);
      const y1 = Math.max(box.y, sel.y);
      const x2 = Math.min(box.x + box.width, sel.x + sel.width);
      const y2 = Math.min(box.y + box.height, sel.y + sel.height);

      const intersectionW = Math.max(0, x2 - x1);
      const intersectionH = Math.max(0, y2 - y1);
      const intersectionArea = intersectionW * intersectionH;

      const boxArea = box.width * box.height;
      const selArea = sel.width * sel.height;
      const unionArea = boxArea + selArea - intersectionArea;

      const iou = unionArea > 0 ? intersectionArea / unionArea : 0;
      if (iou > iouThreshold) {
        overlap = true;
        break;
      }
    }

    if (!overlap) {
      selected.push(box);
    }
  }

  return selected;
}

/**
 * High-accuracy Letterbox YOLOv8 ONNX Inference targeting ONLY vehicle license plates
 */
export async function detectPlatesWithOnnx(
  sourceCanvas: HTMLCanvasElement,
  confidenceThreshold: number = 0.25
): Promise<PlateCandidate[]> {
  if (!onnxSession) {
    throw new Error('Model ONNX Plat belum dimuat.');
  }

  const modelInputSize = 640;
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;

  // 1. Compute Letterbox Scale & Offsets (Preserve aspect ratio with gray 114 padding)
  const scale = Math.min(modelInputSize / srcW, modelInputSize / srcH);
  const newW = Math.round(srcW * scale);
  const newH = Math.round(srcH * scale);
  const padX = (modelInputSize - newW) / 2;
  const padY = (modelInputSize - newH) / 2;

  const letterboxCanvas = document.createElement('canvas');
  letterboxCanvas.width = modelInputSize;
  letterboxCanvas.height = modelInputSize;
  const ctx = letterboxCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  // Fill standard YOLO gray background
  ctx.fillStyle = '#727272'; // rgb(114, 114, 114)
  ctx.fillRect(0, 0, modelInputSize, modelInputSize);
  ctx.drawImage(sourceCanvas, 0, 0, srcW, srcH, Math.round(padX), Math.round(padY), newW, newH);

  const imgData = ctx.getImageData(0, 0, modelInputSize, modelInputSize);
  const data = imgData.data;

  // 2. Preprocess: NCHW format, float32, normalized [0, 1]
  const float32Data = new Float32Array(3 * modelInputSize * modelInputSize);
  const channelSize = modelInputSize * modelInputSize;

  for (let i = 0; i < channelSize; i++) {
    float32Data[i] = data[i * 4] / 255.0;
    float32Data[channelSize + i] = data[i * 4 + 1] / 255.0;
    float32Data[2 * channelSize + i] = data[i * 4 + 2] / 255.0;
  }

  const inputTensor = new ort.Tensor('float32', float32Data, [1, 3, modelInputSize, modelInputSize]);
  const inputName = onnxSession.inputNames[0];
  const feeds: Record<string, ort.Tensor> = {};
  feeds[inputName] = inputTensor;

  const results = await onnxSession.run(feeds);
  const outputName = onnxSession.outputNames[0];
  const outputTensor = results[outputName];
  const outputData = outputTensor.data as Float32Array;

  // Handle dynamic output dimensions: typically [1, channels, 8400] or [1, 8400, channels]
  const dims = outputTensor.dims;
  const isChannelsFirst = dims.length === 3 && dims[1] < dims[2];
  const numChannels = isChannelsFirst ? dims[1] : dims[2];
  const numAnchors = isChannelsFirst ? dims[2] : dims[1];
  const numClasses = Math.max(1, numChannels - 4);

  const rawPredictions: RawPrediction[] = [];

  for (let i = 0; i < numAnchors; i++) {
    let cx = 0, cy = 0, w = 0, h = 0, bestConf = 0, bestClass = 0;

    if (isChannelsFirst) {
      cx = outputData[0 * numAnchors + i];
      cy = outputData[1 * numAnchors + i];
      w = outputData[2 * numAnchors + i];
      h = outputData[3 * numAnchors + i];

      for (let c = 0; c < numClasses; c++) {
        const score = outputData[(4 + c) * numAnchors + i];
        if (score > bestConf) {
          bestConf = score;
          bestClass = c;
        }
      }
    } else {
      const offset = i * numChannels;
      cx = outputData[offset + 0];
      cy = outputData[offset + 1];
      w = outputData[offset + 2];
      h = outputData[offset + 3];

      for (let c = 0; c < numClasses; c++) {
        const score = outputData[offset + 4 + c];
        if (score > bestConf) {
          bestConf = score;
          bestClass = c;
        }
      }
    }

    // In a multi-class model (e.g. car=0, plate=1), ensure we ONLY take plate (classId 1 or single-class model)
    if (numClasses > 1 && bestClass === 0) {
      continue;
    }

    if (bestConf >= confidenceThreshold) {
      // Unpad and scale coordinates back to original source image
      const origCx = (cx - padX) / scale;
      const origCy = (cy - padY) / scale;
      const origW = w / scale;
      const origH = h / scale;

      const origX = Math.max(0, Math.round(origCx - origW / 2));
      const origY = Math.max(0, Math.round(origCy - origH / 2));
      const finalW = Math.min(srcW - origX, Math.round(origW));
      const finalH = Math.min(srcH - origY, Math.round(origH));

      // Filter: Vehicle license plates have typical aspect ratio between 1.3:1 (motorbike) and 5.5:1 (car/truck)
      const aspect = finalW / Math.max(1, finalH);

      if (
        finalW >= 36 &&
        finalH >= 12 &&
        finalW <= srcW * 0.95 &&
        finalH <= srcH * 0.95 &&
        aspect >= 1.3 &&
        aspect <= 5.8
      ) {
        rawPredictions.push({
          x: origX,
          y: origY,
          width: finalW,
          height: finalH,
          conf: bestConf,
          classId: bestClass,
        });
      }
    }
  }

  // 3. Apply NMS
  const nmsBoxes = applyNms(rawPredictions, 0.40);
  const candidates: PlateCandidate[] = [];

  for (const box of nmsBoxes) {
    const bbox: BoundingBox = {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    };

    // Crop from original native resolution with safety padding
    const cropped = cropCanvas(sourceCanvas, bbox, 200);
    const enhanced = enhancePlateForOcr(cropped);

    candidates.push({
      bbox,
      confidence: Math.round(box.conf * 100),
      canvas: cropped,
      dataUrl: cropped.toDataURL('image/jpeg', 0.95),
      enhancedCanvas: enhanced,
      enhancedDataUrl: enhanced.toDataURL('image/png'),
      sourceType: 'onnx_yolo',
    });
  }

  return candidates;
}
