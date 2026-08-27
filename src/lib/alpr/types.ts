export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlateCandidate {
  bbox: BoundingBox;
  confidence: number;
  canvas: HTMLCanvasElement;
  dataUrl: string;
  enhancedCanvas?: HTMLCanvasElement;
  enhancedDataUrl?: string;
  sourceType?: 'cv_contour' | 'onnx_yolo' | 'manual_crop' | 'center_roi';
}

export interface OcrResult {
  rawText: string;
  cleanedText: string;
  formattedPlate: string;
  expiryDate?: string;
  confidence: number;
  isValidFormat: boolean;
  regionCode?: string;
  regionName?: string;
}

export interface CargoItem {
  id: string;
  name: string;
  category: string; // 'Logistik & Sembako' | 'Material & Konstruksi' | 'Elektronik & Mesin' | 'Bahan Kimia & B3' | 'Paket & Dokumen' | 'Barang Pribadi' | 'Lainnya'
  quantity: number;
  unit: string; // 'Kg', 'Ton', 'Box / Dus', 'Pallet', 'Karung', 'Pcs', 'Unit', 'Liter'
  weightKg?: number;
  notes?: string;
}

export interface VehicleCargoManifest {
  driverName: string;
  driverPhone?: string;
  companyName?: string; // Ekspedisi / Perusahaan / Vendor
  destination?: string; // Tujuan / Gudang / Lokasi Bongkar
  documentNumber?: string; // No. Surat Jalan / Delivery Order (DO) / Resi
  cargoCategory?: string;
  loadStatus: 'Penuh (Full Load)' | 'Parsial (Half Load)' | 'Kosong (Empty)' | 'Muatan Khusus / B3';
  totalWeightKg?: number;
  totalItemsCount?: number;
  sealNumber?: string; // No. Segel Kontainer / Box
  inspectionStatus: 'Sesuai (Approved)' | 'Perlu Cek Fisik' | 'Ditolak (Rejected)' | 'Dalam Pemeriksaan';
  inspectorNotes?: string;
  items: CargoItem[];
  updatedAt?: number;
}

export interface DetectionResult {
  id: string;
  timestamp: number;
  sourceImage: string; // Base64 data URL or blob
  plateCropImage: string; // Base64 data URL
  enhancedPlateImage?: string; // Preprocessed binary/contrast image
  plateNumber: string;
  formattedPlate: string;
  expiryDate?: string;
  confidence: number;
  bbox: BoundingBox;
  method: 'cv_contour' | 'onnx_yolo' | 'center_roi' | 'manual';
  vehicleType?: 'Mobil' | 'Motor' | 'Truk / Bus' | 'Pickup / Box' | 'Lainnya';
  status: 'registered' | 'vip' | 'blacklist' | 'unknown';
  notes?: string;
  processingTimeMs: number;
  cargoManifest?: VehicleCargoManifest;
}

export interface DatasetItem {
  id: string;
  fileName: string;
  imageUrl: string;
  fileSize: number;
  groundTruth?: string;
  detectedPlate?: string;
  confidence?: number;
  isCorrect?: boolean;
  status: 'idle' | 'processing' | 'success' | 'failed';
  processingTimeMs?: number;
  thumbnailUrl?: string;
}

export interface DatasetEvaluationReport {
  totalImages: number;
  processedImages: number;
  correctDetections: number;
  accuracy: number;
  averageConfidence: number;
  averageTimeMs: number;
  items: DatasetItem[];
}

export interface WhitelistRule {
  plateNumber: string;
  ownerName: string;
  status: 'registered' | 'vip' | 'blacklist';
  vehicleType: string;
  notes?: string;
  addedAt: number;
}
