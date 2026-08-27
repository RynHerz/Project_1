import { BoundingBox, DetectionResult, PlateCandidate, WhitelistRule } from './types';
import { createCanvasFromSource, locatePlateCandidates } from './platePreprocessor';
import { recognizePlateFromCanvas, playDetectionAudioBeep } from './ocrEngine';
import { detectPlatesWithOnnx, getOnnxStatus } from './onnxDetector';
import { predictCharactersFromPlate, isCharDetectorLoaded } from './charDetector';
import { createDefaultCargoManifest } from './sampleData';

/**
 * Executes multi-plate ALPR pipeline on an image or video element,
 * returning ALL detected plates in the scene (e.g. 2, 3, or more vehicles/motorbikes)
 */
export async function runAlprPipelineMulti(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  whitelistRules: WhitelistRule[] = [],
  enableSound: boolean = true
): Promise<DetectionResult[]> {
  const startTime = performance.now();

  // Create canvas from source
  const sourceCanvas = createCanvasFromSource(source);
  const sourceDataUrl = sourceCanvas.toDataURL('image/jpeg', 0.85);

  let candidates: PlateCandidate[] = [];
  let detectionMethod: DetectionResult['method'] = 'cv_contour';

  // Step 1: Detect Plate Bounding Boxes (Stage 1 YOLO ONNX)
  const onnxStatus = getOnnxStatus();
  if (onnxStatus.loaded) {
    try {
      const onnxCandidates = await detectPlatesWithOnnx(sourceCanvas, 0.35);
      if (onnxCandidates.length > 0) {
        candidates = onnxCandidates;
        detectionMethod = 'onnx_yolo';
      }
    } catch (err) {
      console.warn('Stage 1 ONNX inference notice:', err);
    }
  }

  // Combine with Classical Multi-Scale CV candidates to ensure no vehicles/motorcycles are missed
  const cvCandidates = locatePlateCandidates(sourceCanvas, 12);
  if (candidates.length === 0) {
    candidates = cvCandidates;
    detectionMethod = 'cv_contour';
  } else {
    // Add distinct CV candidates if they don't overlap with ONNX boxes
    for (const cvCand of cvCandidates) {
      const overlaps = candidates.some((c) => {
        const xOverlap = Math.max(0, Math.min(c.bbox.x + c.bbox.width, cvCand.bbox.x + cvCand.bbox.width) - Math.max(c.bbox.x, cvCand.bbox.x));
        const yOverlap = Math.max(0, Math.min(c.bbox.y + c.bbox.height, cvCand.bbox.y + cvCand.bbox.height) - Math.max(c.bbox.y, cvCand.bbox.y));
        const inter = xOverlap * yOverlap;
        const union = c.bbox.width * c.bbox.height + cvCand.bbox.width * cvCand.bbox.height - inter;
        return (inter / Math.max(1, union)) > 0.35;
      });
      if (!overlaps) {
        candidates.push(cvCand);
      }
    }
  }

  // Step 2: Recognize Characters on all candidates
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

    // 2.2 Fallback to Multi-Pass Tesseract OCR
    if (!ocr || !ocr.isValidFormat || ocr.confidence < 50) {
      const ocrTarget = candidate.canvas;
      const tesseractResult = await recognizePlateFromCanvas(ocrTarget);
      if (!ocr || (tesseractResult.isValidFormat && tesseractResult.confidence > (ocr?.confidence || 0))) {
        ocr = tesseractResult;
      }
    }

    // Strict format check to reject random asphalt / background texture noise
    if (!ocr || !ocr.isValidFormat || ocr.confidence < 45) {
      continue;
    }

    const cleanPlateUpper = ocr.formattedPlate.replace(/\s+/g, '').toUpperCase();
    // Must have at least 4 characters (e.g. B 1 A) and not generic fallback
    if (cleanPlateUpper.length < 4 || cleanPlateUpper === 'TIDAKTERDETEKSI' || cleanPlateUpper === 'TIDAKTERBACA') {
      continue;
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
      confidence: ocr.confidence,
      bbox: candidate.bbox,
      method: candidate.sourceType === 'onnx_yolo' ? 'onnx_yolo' : detectionMethod,
      vehicleType: autoVehicleType,
      status,
      notes,
      processingTimeMs: Math.round(performance.now() - startTime),
      cargoManifest: manifest,
    });
  }

  // If no valid plates parsed, fallback to first raw candidate if available
  if (validDetections.length === 0 && candidates.length > 0) {
    const candidate = candidates[0];
    validDetections.push({
      id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      sourceImage: sourceDataUrl,
      plateCropImage: candidate.dataUrl,
      enhancedPlateImage: candidate.enhancedDataUrl,
      plateNumber: 'TIDAK TERDETEKSI',
      formattedPlate: 'TIDAK TERDETEKSI',
      confidence: 0,
      bbox: candidate.bbox,
      method: detectionMethod,
      vehicleType: 'Mobil',
      status: 'unknown',
      notes: 'Plat kurang jelas atau tidak terdeteksi',
      processingTimeMs: Math.round(performance.now() - startTime),
      cargoManifest: createDefaultCargoManifest('TIDAK TERDETEKSI'),
    });
  }

  if (validDetections.length === 0) {
    throw new Error('Gagal memproses gambar plat nomor.');
  }

  if (enableSound && validDetections.some((d) => d.confidence >= 50)) {
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
