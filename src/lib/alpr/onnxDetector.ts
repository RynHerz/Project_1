import * as ort from 'onnxruntime-web';
import { BoundingBox, PlateCandidate } from './types';
import { cropCanvas, enhancePlateForOcr } from './platePreprocessor';

let onnxSession: ort.InferenceSession | null = null;
let isModelLoading = false;
let modelLoadError: string | null = null;

// Configure ONNX WebAssembly environment paths
if (typeof window !== 'undefined') {
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.simd = true;
}

/**
 * Loads an ONNX model from a URL or ArrayBuffer
 */
export async function loadOnnxModel(modelSource: string | ArrayBuffer): Promise<ort.InferenceSession> {
  if (onnxSession && typeof modelSource === 'string' && modelSource === '/models/plate_detector.onnx') {
    return onnxSession;
  }

  isModelLoading = true;
  modelLoadError = null;

  try {
    const sessionOptions: ort.InferenceSession.SessionOptions = {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    };

    const session =
      typeof modelSource === 'string'
        ? await ort.InferenceSession.create(modelSource, sessionOptions)
        : await ort.InferenceSession.create(new Uint8Array(modelSource), sessionOptions);

    onnxSession = session;
    isModelLoading = false;
    return session;
  } catch (err: any) {

    isModelLoading = false;
    modelLoadError = err?.message || 'Gagal memuat model ONNX';
    console.warn('ONNX Model Load Notice:', modelLoadError);
    throw err;
  }
}


export function getOnnxStatus(): { loaded: boolean; loading: boolean; error: string | null } {
  return {
    loaded: !!onnxSession,
    loading: isModelLoading,
    error: modelLoadError,
  };
}

/**
 * Runs YOLOv8 ONNX model inference on a source canvas
 */
export async function detectPlatesWithOnnx(
  sourceCanvas: HTMLCanvasElement,
  confidenceThreshold: number = 0.4
): Promise<PlateCandidate[]> {
  if (!onnxSession) {
    throw new Error('Model ONNX belum dimuat.');
  }

  const modelInputSize = 640;
  const inputCanvas = document.createElement('canvas');
  inputCanvas.width = modelInputSize;
  inputCanvas.height = modelInputSize;
  const ctx = inputCanvas.getContext('2d');
  if (!ctx) return [];

  ctx.drawImage(sourceCanvas, 0, 0, modelInputSize, modelInputSize);
  const imgData = ctx.getImageData(0, 0, modelInputSize, modelInputSize);
  const data = imgData.data;

  // Preprocess: NCHW format, float32, normalized [0, 1]
  const float32Data = new Float32Array(3 * modelInputSize * modelInputSize);
  const channelSize = modelInputSize * modelInputSize;

  for (let i = 0; i < channelSize; i++) {
    const r = data[i * 4] / 255.0;
    const g = data[i * 4 + 1] / 255.0;
    const b = data[i * 4 + 2] / 255.0;

    float32Data[i] = r;
    float32Data[channelSize + i] = g;
    float32Data[2 * channelSize + i] = b;
  }

  const inputTensor = new ort.Tensor('float32', float32Data, [1, 3, modelInputSize, modelInputSize]);
  const inputName = onnxSession.inputNames[0];
  const feeds: Record<string, ort.Tensor> = {};
  feeds[inputName] = inputTensor;

  const results = await onnxSession.run(feeds);
  const outputName = onnxSession.outputNames[0];
  const outputTensor = results[outputName];
  const outputData = outputTensor.data as Float32Array;

  // YOLOv8 output format: [1, 5, 8400] -> (cx, cy, w, h, conf)
  const numPredictions = 8400;
  const candidates: PlateCandidate[] = [];

  const scaleX = sourceCanvas.width / modelInputSize;
  const scaleY = sourceCanvas.height / modelInputSize;

  for (let i = 0; i < numPredictions; i++) {
    const conf = outputData[4 * numPredictions + i];
    if (conf >= confidenceThreshold) {
      const cx = outputData[0 * numPredictions + i];
      const cy = outputData[1 * numPredictions + i];
      const w = outputData[2 * numPredictions + i];
      const h = outputData[3 * numPredictions + i];

      const x = Math.max(0, Math.round((cx - w / 2) * scaleX));
      const y = Math.max(0, Math.round((cy - h / 2) * scaleY));
      const width = Math.min(sourceCanvas.width - x, Math.round(w * scaleX));
      const height = Math.min(sourceCanvas.height - y, Math.round(h * scaleY));

      const bbox: BoundingBox = { x, y, width, height };
      const cropped = cropCanvas(sourceCanvas, bbox);
      const enhanced = enhancePlateForOcr(cropped);

      candidates.push({
        bbox,
        confidence: Math.round(conf * 100),
        canvas: cropped,
        dataUrl: cropped.toDataURL('image/jpeg', 0.9),
        enhancedCanvas: enhanced,
        enhancedDataUrl: enhanced.toDataURL('image/png'),
        sourceType: 'onnx_yolo',
      });
    }
  }

  return candidates;
}
