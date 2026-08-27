import { BoundingBox, PlateCandidate } from './types';

/**
 * Creates an in-memory canvas from an image, video, or existing canvas
 */
export function createCanvasFromSource(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  targetWidth?: number,
  targetHeight?: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const width = targetWidth || (source instanceof HTMLVideoElement ? source.videoWidth : source.width);
  const height = targetHeight || (source instanceof HTMLVideoElement ? source.videoHeight : source.height);

  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

/**
 * High-definition plate crop with generous safety padding and preserving native HD resolution
 */
export function cropCanvas(
  sourceCanvas: HTMLCanvasElement,
  bbox: BoundingBox,
  targetHeight: number = 200
): HTMLCanvasElement {
  const cropCanvas = document.createElement('canvas');
  
  // 12% horizontal and 15% vertical padding to ensure edge letters (e.g. 'A', 'Q', 'DK') are never clipped
  const padX = Math.round(bbox.width * 0.12);
  const padY = Math.round(bbox.height * 0.15);

  const startX = Math.max(0, bbox.x - padX);
  const startY = Math.max(0, bbox.y - padY);
  const cropW = Math.min(sourceCanvas.width - startX, bbox.width + padX * 2);
  const cropH = Math.min(sourceCanvas.height - startY, bbox.height + padY * 2);

  const aspect = cropW / Math.max(1, cropH);
  // Maintain native HD resolution if the original crop is already high-res, otherwise upscale to crisp 200px
  const finalH = Math.max(cropH, targetHeight);
  const finalW = Math.round(finalH * aspect);

  cropCanvas.width = finalW;
  cropCanvas.height = finalH;

  const ctx = cropCanvas.getContext('2d', { willReadFrequently: true });
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, startX, startY, cropW, cropH, 0, 0, finalW, finalH);
  }

  // Apply gentle unsharp mask to crisp up blurry edges
  return applySharpenFilter(cropCanvas);
}

/**
 * Unsharp mask convolution filter to sharpen character strokes and reduce blur
 */
export function applySharpenFilter(inputCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const width = inputCanvas.width;
  const height = inputCanvas.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return inputCanvas;

  ctx.drawImage(inputCanvas, 0, 0);
  const srcData = ctx.getImageData(0, 0, width, height);
  const src = srcData.data;

  const outData = ctx.createImageData(width, height);
  const dst = outData.data;

  // 3x3 sharpening kernel
  // [ 0, -0.35,  0 ]
  // [-0.35, 2.4, -0.35]
  // [ 0, -0.35,  0 ]
  const centerWeight = 2.4;
  const edgeWeight = -0.35;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        const top = src[((y - 1) * width + x) * 4 + c];
        const bottom = src[((y + 1) * width + x) * 4 + c];
        const left = src[(y * width + (x - 1)) * 4 + c];
        const right = src[(y * width + (x + 1)) * 4 + c];
        const center = src[idx + c];

        const val = center * centerWeight + (top + bottom + left + right) * edgeWeight;
        dst[idx + c] = Math.min(255, Math.max(0, Math.round(val)));
      }
      dst[idx + 3] = 255;
    }
  }

  // Fill borders
  for (let x = 0; x < width; x++) {
    const topIdx = x * 4;
    const botIdx = ((height - 1) * width + x) * 4;
    for (let c = 0; c < 4; c++) {
      dst[topIdx + c] = src[topIdx + c];
      dst[botIdx + c] = src[botIdx + c];
    }
  }
  for (let y = 0; y < height; y++) {
    const lIdx = (y * width) * 4;
    const rIdx = (y * width + (width - 1)) * 4;
    for (let c = 0; c < 4; c++) {
      dst[lIdx + c] = src[lIdx + c];
      dst[rIdx + c] = src[rIdx + c];
    }
  }

  ctx.putImageData(outData, 0, 0);
  return canvas;
}

/**
 * Isolates top 72% of the plate image (containing only the main plate number, eliminating the tax date below)
 */
export function cropTopLineRoi(inputCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const targetW = inputCanvas.width;
  const targetH = Math.round(inputCanvas.height * 0.72);

  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(inputCanvas, 0, 0, targetW, targetH, 0, 0, targetW, targetH);
  }
  return canvas;
}

/**
 * High-precision contrast enhancement & Local Adaptive Binarization
 * Does NOT create large black blobs from background shadows or screw holes
 */
export function enhancePlateForOcr(inputCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const width = inputCanvas.width;
  const height = inputCanvas.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return inputCanvas;

  ctx.drawImage(inputCanvas, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const gray = new Uint8ClampedArray(width * height);

  // 1. Convert to Luminance Grayscale
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    gray[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // 2. Contrast Stretching with 2% Saturation Clip
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;

  const total = width * height;
  const clipLow = total * 0.02;
  const clipHigh = total * 0.98;

  let count = 0;
  let minVal = 0;
  let maxVal = 255;

  for (let i = 0; i < 256; i++) {
    count += hist[i];
    if (count >= clipLow && minVal === 0) minVal = i;
    if (count >= clipHigh) { maxVal = i; break; }
  }

  const range = maxVal - minVal || 1;
  for (let i = 0; i < gray.length; i++) {
    const stretched = Math.round(((gray[i] - minVal) / range) * 255);
    gray[i] = Math.min(255, Math.max(0, stretched));
  }

  // 3. Detect background polarity (Classic black plate with white text vs Modern white plate with black text)
  let borderSum = 0;
  let borderCount = 0;
  for (let x = 0; x < width; x += 4) {
    borderSum += gray[x] + gray[(height - 1) * width + x];
    borderCount += 2;
  }
  for (let y = 0; y < height; y += 4) {
    borderSum += gray[y * width] + gray[y * width + (width - 1)];
    borderCount += 2;
  }
  const avgBorder = borderSum / (borderCount || 1);
  const isDarkBackground = avgBorder < 118;

  // 4. Integral Image for Fast Local Adaptive Mean Thresholding (Block size ~25px)
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += gray[y * width + x];
      integral[(y + 1) * (width + 1) + (x + 1)] = integral[y * (width + 1) + (x + 1)] + rowSum;
    }
  }

  const blockSize = Math.max(9, Math.round(width * 0.08) | 1); // Odd block size
  const halfBlock = Math.floor(blockSize / 2);
  const cOffset = 7; // Constant offset

  for (let y = 0; y < height; y++) {
    const y1 = Math.max(0, y - halfBlock);
    const y2 = Math.min(height, y + halfBlock + 1);

    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - halfBlock);
      const x2 = Math.min(width, x + halfBlock + 1);

      const countArea = (x2 - x1) * (y2 - y1);
      const sum =
        integral[y2 * (width + 1) + x2] -
        integral[y1 * (width + 1) + x2] -
        integral[y2 * (width + 1) + x1] +
        integral[y1 * (width + 1) + x1];

      const localMean = sum / countArea;
      const pixelVal = gray[y * width + x];

      let binaryVal: number;
      if (isDarkBackground) {
        // Invert: white characters become crisp black, black background becomes pure white
        binaryVal = pixelVal > (localMean - cOffset) ? 0 : 255;
      } else {
        // White plate: dark characters remain black, white background remains pure white
        binaryVal = pixelVal < (localMean - cOffset) ? 0 : 255;
      }

      const idx = (y * width + x) * 4;
      data[idx] = binaryVal;
      data[idx + 1] = binaryVal;
      data[idx + 2] = binaryVal;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Computer Vision Algorithm to locate candidate license plate bounding boxes in an image
 */
export function locatePlateCandidates(
  sourceCanvas: HTMLCanvasElement,
  maxCandidates: number = 12
): PlateCandidate[] {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const candidates: PlateCandidate[] = [];

  const searchScale = Math.min(1.0, 960 / Math.max(width, height));
  const sW = Math.round(width * searchScale);
  const sH = Math.round(height * searchScale);

  const workCanvas = document.createElement('canvas');
  workCanvas.width = sW;
  workCanvas.height = sH;
  const ctx = workCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return candidates;

  ctx.drawImage(sourceCanvas, 0, 0, sW, sH);
  const imgData = ctx.getImageData(0, 0, sW, sH);
  const data = imgData.data;

  // 1. Grayscale & Sobel Edge Detection
  const gray = new Uint8ClampedArray(sW * sH);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  const edges = new Uint8ClampedArray(sW * sH);
  for (let y = 1; y < sH - 1; y++) {
    for (let x = 1; x < sW - 1; x++) {
      const gx =
        -gray[(y - 1) * sW + (x - 1)] + gray[(y - 1) * sW + (x + 1)] +
        -2 * gray[y * sW + (x - 1)] + 2 * gray[y * sW + (x + 1)] +
        -gray[(y + 1) * sW + (x - 1)] + gray[(y + 1) * sW + (x + 1)];

      edges[y * sW + x] = Math.abs(gx) > 48 ? 255 : 0;
    }
  }

  // 2. Morphological Closing (Bridge vertical characters together)
  const closed = new Uint8ClampedArray(sW * sH);
  const kernelX = 11;
  const kernelY = 3;

  for (let y = kernelY; y < sH - kernelY; y++) {
    for (let x = kernelX; x < sW - kernelX; x++) {
      let hasEdge = false;
      for (let dy = -kernelY; dy <= kernelY && !hasEdge; dy++) {
        for (let dx = -kernelX; dx <= kernelX; dx++) {
          if (edges[(y + dy) * sW + (x + dx)] === 255) {
            hasEdge = true;
            break;
          }
        }
      }
      closed[y * sW + x] = hasEdge ? 255 : 0;
    }
  }

  // 3. Multi-scale sliding window search (Car plates + Motorcycle plates)
  const stepX = Math.max(6, Math.round(sW / 36));
  const stepY = Math.max(5, Math.round(sH / 36));

  const boxSizes = [
    // Mobil / Truk (Aspect ratio ~2.8 - 3.2)
    { w: Math.round(sW * 0.48), h: Math.round(sW * 0.48 / 3.0), vType: 'Mobil' },
    { w: Math.round(sW * 0.34), h: Math.round(sW * 0.34 / 2.9), vType: 'Mobil' },
    { w: Math.round(sW * 0.24), h: Math.round(sW * 0.24 / 2.8), vType: 'Mobil' },
    { w: Math.round(sW * 0.16), h: Math.round(sW * 0.16 / 2.7), vType: 'Mobil' },
    { w: Math.round(sW * 0.10), h: Math.round(sW * 0.10 / 2.6), vType: 'Mobil' },

    // Motor (Plat motor lebih ramping/kotak, Aspect ratio ~1.4 - 1.9)
    { w: Math.round(sW * 0.28), h: Math.round(sW * 0.28 / 1.7), vType: 'Motor' },
    { w: Math.round(sW * 0.20), h: Math.round(sW * 0.20 / 1.65), vType: 'Motor' },
    { w: Math.round(sW * 0.14), h: Math.round(sW * 0.14 / 1.6), vType: 'Motor' },
    { w: Math.round(sW * 0.09), h: Math.round(sW * 0.09 / 1.55), vType: 'Motor' },
    { w: Math.round(sW * 0.06), h: Math.round(sW * 0.06 / 1.5), vType: 'Motor' },
  ];

  interface ScoredBox {
    x: number;
    y: number;
    w: number;
    h: number;
    score: number;
    vType?: string;
  }

  const scoredBoxes: ScoredBox[] = [];

  for (const size of boxSizes) {
    const bw = size.w;
    const bh = size.h;
    if (bw >= sW || bh >= sH || bw < 16 || bh < 10) continue;

    for (let y = Math.round(sH * 0.08); y < sH - bh - 2; y += stepY) {
      for (let x = 2; x < sW - bw - 2; x += stepX) {
        let edgeCount = 0;
        const total = bw * bh;

        for (let wy = 0; wy < bh; wy += 2) {
          for (let wx = 0; wx < bw; wx += 2) {
            if (closed[(y + wy) * sW + (x + wx)] === 255) {
              edgeCount += 4;
            }
          }
        }

        const density = edgeCount / total;
        if (density > 0.14 && density < 0.88) {
          const verticalWeight = (y + bh / 2) / sH;
          const score = density * 100 * (0.8 + 0.4 * verticalWeight);
          scoredBoxes.push({ x, y, w: bw, h: bh, score, vType: size.vType });
        }
      }
    }
  }

  scoredBoxes.sort((a, b) => b.score - a.score);

  // Non-Maximum Suppression to allow multiple non-overlapping plates
  const selectedBoxes: ScoredBox[] = [];
  for (const box of scoredBoxes) {
    let overlap = false;
    for (const sel of selectedBoxes) {
      const xOverlap = Math.max(0, Math.min(box.x + box.w, sel.x + sel.w) - Math.max(box.x, sel.x));
      const yOverlap = Math.max(0, Math.min(box.y + box.h, sel.y + sel.h) - Math.max(box.y, sel.y));
      const intersection = xOverlap * yOverlap;
      const union = box.w * box.h + sel.w * sel.h - intersection;
      const iou = intersection / union;

      if (iou > 0.28) {
        overlap = true;
        break;
      }
    }

    if (!overlap) {
      selectedBoxes.push(box);
      if (selectedBoxes.length >= maxCandidates) break;
    }
  }

  for (const box of selectedBoxes) {
    const origBbox: BoundingBox = {
      x: Math.max(0, Math.round(box.x / searchScale)),
      y: Math.max(0, Math.round(box.y / searchScale)),
      width: Math.min(width, Math.round(box.w / searchScale)),
      height: Math.min(height, Math.round(box.h / searchScale)),
    };

    const cropped = cropCanvas(sourceCanvas, origBbox, 150);
    const enhanced = enhancePlateForOcr(cropped);

    candidates.push({
      bbox: origBbox,
      confidence: Math.min(95, Math.round(box.score)),
      canvas: cropped,
      dataUrl: cropped.toDataURL('image/jpeg', 0.95),
      enhancedCanvas: enhanced,
      enhancedDataUrl: enhanced.toDataURL('image/png'),
      sourceType: 'cv_contour',
    });
  }

  // Always include full image candidate if it is already a single cropped plate
  const isDirectPlateCrop = width / height >= 1.3 && width / height <= 5.5;
  if (isDirectPlateCrop || candidates.length === 0) {
    const fullBbox: BoundingBox = { x: 0, y: 0, width, height };
    const cropped = cropCanvas(sourceCanvas, fullBbox, 150);
    const enhanced = enhancePlateForOcr(cropped);
    candidates.unshift({
      bbox: fullBbox,
      confidence: 90,
      canvas: cropped,
      dataUrl: cropped.toDataURL('image/jpeg', 0.95),
      enhancedCanvas: enhanced,
      enhancedDataUrl: enhanced.toDataURL('image/png'),
      sourceType: 'manual_crop',
    });
  }

  return candidates;
}
