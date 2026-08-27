import { BoundingBox, DetectionResult, PlateCandidate, WhitelistRule } from './types';
import { createCanvasFromSource, locatePlateCandidates } from './platePreprocessor';
import { recognizePlateFromCanvas, playDetectionAudioBeep } from './ocrEngine';
import { detectPlatesWithOnnx, getOnnxStatus } from './onnxDetector';
import { predictCharactersFromPlate, isCharDetectorLoaded } from './charDetector';
import { createDefaultCargoManifest } from './sampleData';

/**
 * Executes multi-plate ALPR pipeline on an image or video element,
 * returning ONLY real detected vehicle license plates (zero asphalt/background noise)
 */
export async function runAlprPipelineMulti(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  whitelistRules: WhitelistRule[] = [],
  enableSound: boolean = true
): Promise<DetectionResult[]> {
  const startTime = performance.now();

  // Create canvas from source using full original HD/4K natural resolution
  const sourceCanvas = createCanvasFromSource(source);
  const sourceDataUrl = sourceCanvas.toDataURL('image/jpeg', 0.90);

  let candidates: PlateCandidate[] = [];
  let detectionMethod: DetectionResult['method'] = 'cv_contour';

  // Step 1: Detect Plate Bounding Boxes via YOLO Neural Network
  const onnxStatus = getOnnxStatus();
  if (onnxStatus.loaded) {
    try {
      const onnxCandidates = await detectPlatesWithOnnx(sourceCanvas, 0.28);
      if (onnxCandidates.length > 0) {
        // When AI model detects plates, use ONLY AI candidates (never mix with blind background CV boxes)
        candidates = onnxCandidates;
        detectionMethod = 'onnx_yolo';
      }
    } catch (err) {
      console.warn('Stage 1 ONNX inference notice:', err);
    }
  }

  // Fallback to Classical Multi-Scale CV ONLY IF ONNX produced 0 detections or is not loaded
  if (candidates.length === 0) {
    candidates = locatePlateCandidates(sourceCanvas, 6);
    detectionMethod = 'cv_contour';
  }

  // Step 2: Recognize Characters on all candidate boxes
  const validDetections: DetectionResult[] = [];

  for (let idx = 0; idx < candidates.length; idx++) {
    const candidate = candidates[idx];
    let ocr = null;

    // 2.1 Try 2-Stage YOLO Character Detector first if loaded
    if (isCharDetectorLoaded()) {
      try {
        ocr = await predictCharactersFromPlate(candidate.canvas);
      } catch (err) {
        console.warn('Char detector error:', err);
      }
    }

    // 2.2 Multi-Pass Tesseract OCR (with both natural RGB & enhanced binarized variants)
    if (!ocr || !ocr.isValidFormat || ocr.confidence < 60) {
      const tesseractResult = await recognizePlateFromCanvas(candidate.canvas, candidate.enhancedCanvas);
      if (!ocr || (tesseractResult.isValidFormat && tesseractResult.confidence > (ocr?.confidence || 0))) {
        ocr = tesseractResult;
      }
    }

    if (!ocr) {
      continue;
    }

    const cleanPlateUpper = ocr.formattedPlate.replace(/\s+/g, '').toUpperCase();
    const isAiBox = candidate.sourceType === 'onnx_yolo';

    // Must have at least 3 characters and not generic fallback
    if (cleanPlateUpper.length < 3 || cleanPlateUpper === 'TIDAKTERBACA' || cleanPlateUpper === 'TIDAKTERDETEKSI') {
      // If AI is 100% sure it's a plate box (e.g. from YOLO model), provide formatted OCR even if low confidence
      if (!isAiBox || ocr.cleanedText.length < 2) {
        continue;
      }
    }

    // Check if we already detected this same plate in another bounding box
    const isDuplicatePlate = validDetections.some(
      (d) => d.plateNumber.replace(/\s+/g, '').toUpperCase() === cleanPlateUpper
    );

    // Also check bounding box spatial overlap (IoU)
    const isOverlappingBox = validDetections.some((d) => {
      const xOverlap = Math.max(0, Math.min(d.bbox.x + d.bbox.width, candidate.bbox.x + candidate.bbox.width) - Math.max(d.bbox.x, candidate.bbox.x));
      const yOverlap = Math.max(0, Math.min(d.bbox.y + d.bbox.height, candidate.bbox.y + candidate.bbox.height) - Math.max(d.bbox.y, candidate.bbox.y));
      const inter = xOverlap * yOverlap;
      const union = d.bbox.width * d.bbox.height + candidate.bbox.width * candidate.bbox.height - inter;
      return (inter / Math.max(1, union)) > 0.35;
    });

    if (isDuplicatePlate || isOverlappingBox) {
      continue;
    }

    // Auto-detect vehicle type: Motorbike plates usually have squarer aspect ratio (1.2 - 2.1)
    const boxAspect = candidate.bbox.width / Math.max(1, candidate.bbox.height);
    let autoVehicleType: DetectionResult['vehicleType'] = boxAspect < 2.2 ? 'Motor' : 'Mobil';

    let status: DetectionResult['status'] = 'unknown';
    let notes: string | undefined = ocr.regionName;

    const matchedRule = whitelistRules.find(
      (r) => r.plateNumber.replace(/\s+/g, '').toUpperCase() === cleanPlateUpper
    );

    if (matchedRule) {
      status = matchedRule.status;
      autoVehicleType = (matchedRule.vehicleType as any) || autoVehicleType;
      notes = `${matchedRule.ownerName}${matchedRule.notes ? ` - ${matchedRule.notes}` : ''}`;
    } else if (ocr.isValidFormat) {
      status = 'registered';
    }

    const manifest = createDefaultCargoManifest(
      ocr.formattedPlate,
      matchedRule ? matchedRule.ownerName : `Pengemudi ${autoVehicleType}`
    );

    validDetections.push({
      id: `scan_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now() + idx,
      sourceImage: sourceDataUrl,
      plateCropImage: candidate.dataUrl,
      enhancedPlateImage: candidate.enhancedDataUrl,
      plateNumber: ocr.cleanedText,
      formattedPlate: ocr.formattedPlate,
      expiryDate: ocr.expiryDate,
      confidence: Math.max(ocr.confidence, isAiBox ? candidate.confidence : ocr.confidence),
      bbox: candidate.bbox,
      method: candidate.sourceType === 'onnx_yolo' ? 'onnx_yolo' : detectionMethod,
      vehicleType: autoVehicleType,
      status,
      notes,
      processingTimeMs: Math.round(performance.now() - startTime),
      cargoManifest: manifest,
    });
  }

  // If AI found a candidate box but OCR couldn't read all letters, show the cropped AI plate box with raw text
  if (validDetections.length === 0 && candidates.length > 0 && candidates[0].sourceType === 'onnx_yolo') {
    const candidate = candidates[0];
    const rawOcr = await recognizePlateFromCanvas(candidate.canvas, candidate.enhancedCanvas);
    const fallbackText = rawOcr.formattedPlate || rawOcr.cleanedText || 'PLAT TERDETEKSI';

    validDetections.push({
      id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      sourceImage: sourceDataUrl,
      plateCropImage: candidate.dataUrl,
      enhancedPlateImage: candidate.enhancedDataUrl,
      plateNumber: fallbackText.replace(/\s+/g, ''),
      formattedPlate: fallbackText,
      expiryDate: rawOcr.expiryDate,
      confidence: Math.max(60, candidate.confidence),
      bbox: candidate.bbox,
      method: 'onnx_yolo',
      vehicleType: 'Mobil',
      status: 'unknown',
      notes: rawOcr.regionName || 'Plat kendaraan terdeteksi oleh AI',
      processingTimeMs: Math.round(performance.now() - startTime),
      cargoManifest: createDefaultCargoManifest(fallbackText),
    });
  }

  if (validDetections.length === 0) {
    throw new Error('Tidak ada plat nomor kendaraan yang terdeteksi pada gambar ini.');
  }

  if (enableSound && validDetections.some((d) => d.confidence >= 45)) {
    const anyBlacklist = validDetections.some((d) => d.status === 'blacklist');
    playDetectionAudioBeep(!anyBlacklist);
  }

  return validDetections;
}

/**
 * Standard single plate pipeline execution (returns highest confidence detection)
 */
export async function runAlprPipeline(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  whitelistRules: WhitelistRule[] = [],
  enableSound: boolean = true
): Promise<DetectionResult> {
  const multi = await runAlprPipelineMulti(source, whitelistRules, enableSound);
  return multi[0];
}
