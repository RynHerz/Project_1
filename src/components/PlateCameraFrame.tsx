'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  SwitchCamera,
  Upload,
  Check,
  RotateCcw,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  X,
  Eye,
  Sliders,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface PlateCaptureResult {
  /** Base64 Data URL gambar area plat yang di-crop dari bingkai */
  croppedDataUrl: string;
  /** Blob binary dari gambar crop */
  croppedBlob: Blob;
  /** Elemen HTMLCanvasElement hasil crop untuk manipulasi lanjutan */
  croppedCanvas: HTMLCanvasElement;
  /** (Opsional) Data URL gambar penuh seluruh frame kamera */
  fullDataUrl?: string;
  /** (Opsional) Canvas penuh seluruh frame kamera */
  fullCanvas?: HTMLCanvasElement;
  /** Timestamp waktu pengambilan gambar (ms) */
  timestamp: number;
  /** Lebar pixel gambar hasil crop */
  width: number;
  /** Tinggi pixel gambar hasil crop */
  height: number;
}

export interface PlateCameraFrameProps {
  /** Callback saat foto berhasil diambil (sebelum atau tanpa konfirmasi manual) */
  onCapture?: (result: PlateCaptureResult) => void;
  /** Callback saat pengguna menekan tombol "Gunakan Foto" */
  onConfirm?: (result: PlateCaptureResult) => void;
  /** Callback saat pengguna membatalkan/menutup kamera */
  onCancel?: () => void;
  /** State eksternal untuk mengubah warna bingkai (true = hijau/aligned, false = amber/default) */
  isAligned?: boolean;
  /** Teks panduan kustom (jika tidak diisi, menggunakan pesan otomatis) */
  hintText?: string;
  /** Rasio aspek bingkai (default: 3.5 untuk proporsi plat nomor kendaraan Indonesia) */
  aspectRatio?: number;
  /** Tampilkan tombol upload galeri sebagai alternatif (default: true) */
  showGalleryButton?: boolean;
  /** Tampilkan tombol ganti kamera depan/belakang (default: true) */
  showSwitchCamera?: boolean;
  /** Tampilkan tombol senter/flashlight jika didukung (default: true) */
  showTorch?: boolean;
  /** Otomatis konfirmasi tanpa perlu menekan tombol "Gunakan Foto" (default: false) */
  autoConfirm?: boolean;
  /** Kelas CSS tambahan untuk container */
  className?: string;
}

export const PlateCameraFrame: React.FC<PlateCameraFrameProps> = ({
  onCapture,
  onConfirm,
  onCancel,
  isAligned = false,
  hintText,
  aspectRatio = 3.5,
  showGalleryButton = true,
  showSwitchCamera = true,
  showTorch = true,
  autoConfirm = false,
  className,
}) => {
  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const guideFrameRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // States
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorchSupport, setHasTorchSupport] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedResult, setCapturedResult] = useState<PlateCaptureResult | null>(null);
  const [showFullPreview, setShowFullPreview] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Stop camera stream safely
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setTorchOn(false);
  }, []);

  // Start camera stream
  const startCameraStream = useCallback(async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsStreaming(true);

      // Check flashlight/torch support
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities?.() as any) || {};
        setHasTorchSupport(Boolean(capabilities.torch));
      }
    } catch (err: any) {
      console.error('PlateCameraFrame camera error:', err);
      let errorMsg = 'Tidak dapat mengakses perangkat kamera. Pastikan kamera terpasang dan tidak digunakan aplikasi lain.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Izin kamera ditolak. Silakan izinkan akses kamera pada pengaturan browser Anda.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'Tidak ditemukan perangkat kamera pada perangkat ini.';
      }
      setCameraError(errorMsg);
      setIsStreaming(false);
    }
  }, [facingMode]);

  // Lifecycle: start camera when not in preview mode
  useEffect(() => {
    if (!capturedResult) {
      startCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [startCameraStream, stopCameraStream, capturedResult]);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorchSupport) {
      try {
        const nextState = !torchOn;
        await (track.applyConstraints as any)({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.error('Gagal mengatur torch:', err);
      }
    }
  };

  // Switch facing mode (Front / Back)
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  /**
   * Helper: Melakukan crop akurat dari frame video berdasarkan posisi guide frame di layar
   */
  const extractCroppedPlate = useCallback(
    (videoEl: HTMLVideoElement): Promise<PlateCaptureResult | null> => {
      return new Promise((resolve) => {
        const container = containerRef.current;
        const guideFrame = guideFrameRef.current;

        if (!container || !guideFrame || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
          resolve(null);
          return;
        }

        const containerRect = container.getBoundingClientRect();
        const frameRect = guideFrame.getBoundingClientRect();

        const vw = videoEl.videoWidth;
        const vh = videoEl.videoHeight;
        const cw = containerRect.width;
        const ch = containerRect.height;

        // Hitung skala video dengan object-fit: cover
        const scale = Math.max(cw / vw, ch / vh);
        const renderedW = vw * scale;
        const renderedH = vh * scale;

        const offsetX = (cw - renderedW) / 2;
        const offsetY = (ch - renderedH) / 2;

        // Posisi guide frame relatif terhadap video rendered
        const frameRelX = frameRect.left - containerRect.left - offsetX;
        const frameRelY = frameRect.top - containerRect.top - offsetY;

        // Koordinat pixel natural pada video asli
        const cropX = Math.max(0, Math.round(frameRelX / scale));
        const cropY = Math.max(0, Math.round(frameRelY / scale));
        const cropW = Math.min(vw - cropX, Math.round(frameRect.width / scale));
        const cropH = Math.min(vh - cropY, Math.round(frameRect.height / scale));

        // 1. Buat Canvas Hasil Crop (Area Plat Saja)
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = Math.max(1, cropW);
        croppedCanvas.height = Math.max(1, cropH);
        const cropCtx = croppedCanvas.getContext('2d');

        if (!cropCtx) {
          resolve(null);
          return;
        }

        cropCtx.drawImage(
          videoEl,
          cropX,
          cropY,
          cropW,
          cropH,
          0,
          0,
          croppedCanvas.width,
          croppedCanvas.height
        );

        // 2. Buat Canvas Penuh Seluruh Frame
        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = vw;
        fullCanvas.height = vh;
        const fullCtx = fullCanvas.getContext('2d');
        if (fullCtx) {
          fullCtx.drawImage(videoEl, 0, 0, vw, vh);
        }

        const croppedDataUrl = croppedCanvas.toDataURL('image/jpeg', 0.96);
        const fullDataUrl = fullCanvas.toDataURL('image/jpeg', 0.92);

        croppedCanvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(null);
              return;
            }

            const result: PlateCaptureResult = {
              croppedDataUrl,
              croppedBlob: blob,
              croppedCanvas,
              fullDataUrl,
              fullCanvas,
              timestamp: Date.now(),
              width: croppedCanvas.width,
              height: croppedCanvas.height,
            };

            resolve(result);
          },
          'image/jpeg',
          0.96
        );
      });
    },
    []
  );

  // Capture Manual Trigger
  const handleCapturePhoto = async () => {
    if (!videoRef.current || isCapturing) return;
    setIsCapturing(true);

    try {
      const result = await extractCroppedPlate(videoRef.current);
      if (result) {
        stopCameraStream();
        setCapturedResult(result);
        onCapture?.(result);

        if (autoConfirm) {
          onConfirm?.(result);
        }
      }
    } catch (err) {
      console.error('Error saat capture foto:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle Gallery Upload Alternative
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Silakan pilih file format gambar (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const vw = img.naturalWidth || img.width;
        const vh = img.naturalHeight || img.height;

        // Crop area proporsional di tengah gambar dengan aspek rasio yang diminta
        let cropW = Math.round(vw * 0.82);
        let cropH = Math.round(cropW / aspectRatio);

        if (cropH > vh * 0.85) {
          cropH = Math.round(vh * 0.85);
          cropW = Math.round(cropH * aspectRatio);
        }

        const cropX = Math.round((vw - cropW) / 2);
        const cropY = Math.round((vh - cropH) / 2);

        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = cropW;
        croppedCanvas.height = cropH;
        const cropCtx = croppedCanvas.getContext('2d');

        if (cropCtx) {
          cropCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        }

        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = vw;
        fullCanvas.height = vh;
        const fullCtx = fullCanvas.getContext('2d');
        if (fullCtx) {
          fullCtx.drawImage(img, 0, 0);
        }

        const croppedDataUrl = croppedCanvas.toDataURL('image/jpeg', 0.96);
        const fullDataUrl = fullCanvas.toDataURL('image/jpeg', 0.92);

        croppedCanvas.toBlob(
          (blob) => {
            if (!blob) return;
            const result: PlateCaptureResult = {
              croppedDataUrl,
              croppedBlob: blob,
              croppedCanvas,
              fullDataUrl,
              fullCanvas,
              timestamp: Date.now(),
              width: cropW,
              height: cropH,
            };

            stopCameraStream();
            setCapturedResult(result);
            onCapture?.(result);

            if (autoConfirm) {
              onConfirm?.(result);
            }
          },
          'image/jpeg',
          0.96
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);

    // Reset input value agar bisa memilih file yang sama jika diinginkan
    e.target.value = '';
  };

  // Retake photo action
  const handleRetake = () => {
    setCapturedResult(null);
    setShowFullPreview(false);
  };

  // Confirm photo action
  const handleConfirm = () => {
    if (capturedResult) {
      onConfirm?.(capturedResult);
    }
  };

  // Dynamic Hint Text Message
  const currentHint =
    hintText ||
    (isAligned
      ? 'Posisi sejajar! Siap untuk diambil.'
      : 'Posisikan plat nomor di dalam bingkai');

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-between w-full max-w-2xl mx-auto rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl text-zinc-100 select-none min-h-[460px] sm:min-h-[520px]',
        className
      )}
    >
      {/* CSS Keyframes for Scan Line Animation */}
      <style jsx>{`
        @keyframes scanVertical {
          0% {
            top: 6px;
            opacity: 0.8;
          }
          50% {
            top: calc(100% - 8px);
            opacity: 1;
          }
          100% {
            top: 6px;
            opacity: 0.8;
          }
        }
        .animate-plate-scan {
          animation: scanVertical 2.2s ease-in-out infinite;
        }
      `}</style>

      {/* Hidden File Input for Gallery Alternative */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* TOP BAR / HEADER CONTROLS */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-2">
          <Badge
            variant={capturedResult ? 'info' : isAligned ? 'success' : 'warning'}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs backdrop-blur-md bg-opacity-80"
          >
            {capturedResult ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Hasil Foto</span>
              </>
            ) : isAligned ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Plat Sejajar</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Kamera Plat Nomor</span>
              </>
            )}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Torch Toggle (Mobile Only) */}
          {!capturedResult && hasTorchSupport && showTorch && (
            <Button
              type="button"
              variant="outline"
              size="iconSm"
              onClick={toggleTorch}
              className={cn(
                'rounded-full bg-black/60 backdrop-blur border-zinc-700 hover:bg-zinc-800 text-zinc-300',
                torchOn && 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              )}
              title={torchOn ? 'Matikan Senter' : 'Nyalakan Senter'}
            >
              {torchOn ? <Zap className="w-4 h-4 text-amber-400 fill-amber-400" /> : <ZapOff className="w-4 h-4" />}
            </Button>
          )}

          {/* Close/Cancel Button */}
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="iconSm"
              onClick={onCancel}
              className="rounded-full bg-black/60 backdrop-blur border-zinc-700 hover:bg-zinc-800 text-zinc-300"
              title="Tutup Kamera"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* MAIN VIEWPORT / VIDEO FEED & GUIDE FRAME */}
      <div
        ref={containerRef}
        className="relative w-full h-[380px] sm:h-[430px] flex items-center justify-center overflow-hidden bg-zinc-950"
      >
        {/* State 1: Live Video Camera Feed */}
        {!capturedResult && !cameraError && (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* State 2: Camera Error / Permission Denied Fallback */}
        {cameraError && !capturedResult && (
          <div className="relative z-20 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive-foreground">
              <AlertCircle className="w-7 h-7 text-red-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-semibold text-zinc-200">Akses Kamera Bermasalah</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">{cameraError}</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startCameraStream}
                className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Coba Lagi
              </Button>
              {showGalleryButton && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-amber-600 hover:bg-amber-500 text-white border-0"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Pilih dari Galeri
                </Button>
              )}
            </div>
          </div>
        )}

        {/* State 3: Captured Photo Preview Mode */}
        {capturedResult && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-zinc-950/95">
            <div className="relative max-w-full flex flex-col items-center justify-center">
              {/* Cropped Plate Preview Card */}
              <div className="relative border-2 border-emerald-500/80 rounded-xl overflow-hidden shadow-2xl shadow-emerald-950/40 bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={showFullPreview && capturedResult.fullDataUrl ? capturedResult.fullDataUrl : capturedResult.croppedDataUrl}
                  alt="Hasil Foto Plat Nomor"
                  className={cn(
                    'object-contain max-h-[220px] sm:max-h-[260px] rounded-lg transition-all duration-200',
                    showFullPreview ? 'max-w-full' : 'w-full aspect-[3.5/1]'
                  )}
                />

                {/* Badge Ukuran / Rasio */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/75 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-zinc-300 border border-white/10">
                  <span>{capturedResult.width} × {capturedResult.height} px</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-emerald-400 font-semibold">{showFullPreview ? 'Full Frame' : 'Cropped'}</span>
                </div>
              </div>

              {/* Toggle Full / Cropped Preview Button */}
              {capturedResult.fullDataUrl && (
                <button
                  type="button"
                  onClick={() => setShowFullPreview((prev) => !prev)}
                  className="mt-2 text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2.5 rounded bg-zinc-900/60 border border-zinc-800"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{showFullPreview ? 'Lihat Area Plat (Crop)' : 'Lihat Gambar Penuh (Full Frame)'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* OVERLAY: GUIDE FRAME & SCANNING LINE (Active during live stream) */}
        {!capturedResult && !cameraError && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
            {/* Dark Mask Vignette outside the plate frame */}
            <div className="absolute inset-0 bg-black/35 backdrop-blur-[0.5px]" />

            {/* DYNAMIC HINT TEXT */}
            <div className="relative z-20 mb-3 sm:mb-4 transition-all duration-300">
              <div
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium tracking-wide flex items-center gap-2 backdrop-blur-md shadow-lg border transition-all duration-300',
                  isAligned
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-emerald-950/50 scale-105'
                    : 'bg-black/75 text-amber-300 border-amber-500/35 shadow-black/40'
                )}
              >
                {isAligned ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span>{currentHint}</span>
              </div>
            </div>

            {/* 3.5 : 1 GUIDE FRAME CONTAINER */}
            <div
              ref={guideFrameRef}
              style={{ aspectRatio: `${aspectRatio} / 1` }}
              className={cn(
                'relative z-20 w-[88%] sm:w-[82%] max-w-[460px] rounded-lg transition-all duration-300 flex items-center justify-center',
                isAligned
                  ? 'border-2 border-emerald-400/90 shadow-[0_0_25px_rgba(52,211,153,0.35)]'
                  : 'border border-dashed border-amber-400/70 shadow-[0_0_18px_rgba(251,191,36,0.2)]'
              )}
            >
              {/* Clear center transparent hole */}
              <div className="absolute inset-0 bg-transparent rounded-lg" />

              {/* CORNER BRACKETS (4 SUDUT BINGKAI) */}
              {/* Top-Left */}
              <div
                className={cn(
                  'absolute -top-1.5 -left-1.5 w-5 h-5 sm:w-6 sm:h-6 border-t-3 border-l-3 rounded-tl-sm transition-colors duration-300',
                  isAligned ? 'border-emerald-400' : 'border-amber-400'
                )}
              />
              {/* Top-Right */}
              <div
                className={cn(
                  'absolute -top-1.5 -right-1.5 w-5 h-5 sm:w-6 sm:h-6 border-t-3 border-r-3 rounded-tr-sm transition-colors duration-300',
                  isAligned ? 'border-emerald-400' : 'border-amber-400'
                )}
              />
              {/* Bottom-Left */}
              <div
                className={cn(
                  'absolute -bottom-1.5 -left-1.5 w-5 h-5 sm:w-6 sm:h-6 border-b-3 border-l-3 rounded-bl-sm transition-colors duration-300',
                  isAligned ? 'border-emerald-400' : 'border-amber-400'
                )}
              />
              {/* Bottom-Right */}
              <div
                className={cn(
                  'absolute -bottom-1.5 -right-1.5 w-5 h-5 sm:w-6 sm:h-6 border-b-3 border-r-3 rounded-br-sm transition-colors duration-300',
                  isAligned ? 'border-emerald-400' : 'border-amber-400'
                )}
              />

              {/* CENTER CROSSHAIR / ALIGNMENT GUIDE */}
              <div className="absolute w-2.5 h-2.5 rounded-full border border-white/20 opacity-40 pointer-events-none" />

              {/* ANIMATED SCAN LINE */}
              <div
                className={cn(
                  'absolute left-2 right-2 h-[2px] rounded-full animate-plate-scan pointer-events-none shadow-md transition-colors duration-300',
                  isAligned
                    ? 'bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399]'
                    : 'bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_10px_#fbbf24]'
                )}
              />

              {/* WATERMARK LABEL */}
              <span
                className={cn(
                  'absolute bottom-1 right-2 text-[9px] font-mono tracking-widest uppercase transition-colors',
                  isAligned ? 'text-emerald-400/70 font-semibold' : 'text-amber-400/50'
                )}
              >
                AREA PLAT ({aspectRatio}:1)
              </span>
            </div>

            {/* SUB-HINT BELOW FRAME */}
            <div className="relative z-20 mt-3 text-[11px] text-zinc-400 tracking-wide font-normal">
              Pastikan seluruh karakter nomor plat berada di dalam sudut kuning
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS BAR */}
      <div className="w-full z-30 p-4 sm:p-5 bg-zinc-900/90 backdrop-blur-md border-t border-zinc-800 flex items-center justify-between gap-3">
        {/* Left Action: Upload Gallery Alternative */}
        <div className="flex-1 flex justify-start">
          {showGalleryButton && !capturedResult && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="bg-zinc-800/80 border-zinc-700 hover:bg-zinc-700 text-zinc-300 text-xs gap-1.5"
              title="Unggah foto plat dari galeri perangkat"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Dari Galeri</span>
            </Button>
          )}

          {capturedResult && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetake}
              className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300 text-xs gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Ambil Ulang</span>
            </Button>
          )}
        </div>

        {/* Center Action: Shutter Button or Confirm Button */}
        <div className="flex items-center justify-center">
          {!capturedResult ? (
            <button
              type="button"
              disabled={isCapturing || !isStreaming}
              onClick={handleCapturePhoto}
              aria-label="Ambil Foto Plat Nomor"
              className={cn(
                'relative w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer focus:outline-none focus:ring-4',
                isAligned
                  ? 'bg-emerald-500 text-white ring-emerald-500/40 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(52,211,153,0.5)]'
                  : 'bg-amber-500 text-zinc-950 ring-amber-500/30 hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(251,191,36,0.4)]',
                (isCapturing || !isStreaming) && 'opacity-50 cursor-not-allowed transform-none'
              )}
            >
              {/* Outer Ring */}
              <div className="absolute inset-[-4px] rounded-full border-2 border-white/30 pointer-events-none" />
              {/* Inner Circle / Icon */}
              <Camera className="w-7 h-7 sm:w-8 sm:h-8" />
            </button>
          ) : (
            <Button
              type="button"
              variant="default"
              size="lg"
              onClick={handleConfirm}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-900/40 text-sm sm:text-base px-6 sm:px-8 py-2.5 rounded-xl gap-2 cursor-pointer border-0"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>Gunakan Foto</span>
            </Button>
          )}
        </div>

        {/* Right Action: Switch Camera or Empty Placeholder */}
        <div className="flex-1 flex justify-end">
          {!capturedResult && showSwitchCamera && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleFacingMode}
              disabled={!isStreaming}
              className="bg-zinc-800/80 border-zinc-700 hover:bg-zinc-700 text-zinc-300 text-xs gap-1.5"
              title="Ganti Kamera Depan / Belakang"
            >
              <SwitchCamera className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Ganti Kamera</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
