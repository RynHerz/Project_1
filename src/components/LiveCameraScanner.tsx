'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  SwitchCamera,
  Play,
  Square,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MapPin,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { DetectionResult, WhitelistRule } from '../lib/alpr/types';
import { runAlprPipeline } from '../lib/alpr/pipeline';

interface LiveCameraScannerProps {
  onNewDetection: (result: DetectionResult) => void;
  whitelistRules: WhitelistRule[];
  soundEnabled: boolean;
  onOpenPlateDetail: (result: DetectionResult) => void;
}

export const LiveCameraScanner: React.FC<LiveCameraScannerProps> = ({
  onNewDetection,
  whitelistRules,
  soundEnabled,
  onOpenPlateDetail,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [autoScan, setAutoScan] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorchSupport, setHasTorchSupport] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [currentDetection, setCurrentDetection] = useState<DetectionResult | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [scanSpeedMs, setScanSpeedMs] = useState<number>(1200);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
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

      // Check flashlight / torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities?.() as any) || {};
        setHasTorchSupport(!!capabilities.torch);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Silakan izinkan akses kamera pada browser Anda.'
          : 'Tidak dapat mengakses perangkat kamera. Pastikan kamera terpasang dan tidak dipakai aplikasi lain.'
      );
      setIsStreaming(false);
    }
  }, [facingMode]);

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsStreaming(false);
    setTorchOn(false);
  }, []);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorchSupport) {
      try {
        const newTorchState = !torchOn;
        await (track.applyConstraints as any)({
          advanced: [{ torch: newTorchState }],
        });
        setTorchOn(newTorchState);
      } catch (err) {
        console.error('Torch error:', err);
      }
    }
  };

  // Switch Facing Camera (Front / Rear)
  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Run single scan frame
  const processCurrentFrame = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState < 2 || isScanning) return;

    try {
      setIsScanning(true);
      const scanStart = performance.now();

      const result = await runAlprPipeline(videoRef.current, whitelistRules, soundEnabled);

      const elapsed = Math.round(performance.now() - scanStart);
      setFps(Math.round(1000 / Math.max(elapsed, 1)));

      if (result && result.plateNumber && result.plateNumber !== 'TIDAK TERDETEKSI' && result.confidence >= 60) {
        setCurrentDetection(result);
        onNewDetection(result);
      }
    } catch (err) {
      // Background scan frame ignore error
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, onNewDetection, soundEnabled, whitelistRules]);

  // Start / restart camera when facing mode changes
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Auto scan interval loop
  useEffect(() => {
    if (!isStreaming || !autoScan) {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      return;
    }

    scanIntervalRef.current = setInterval(() => {
      processCurrentFrame();
    }, scanSpeedMs);

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [isStreaming, autoScan, scanSpeedMs, processCurrentFrame]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Video Viewport & Controls */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        {/* Main Camera Card */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl shadow-cyan-950/20 aspect-video sm:aspect-[16/10] flex items-center justify-center">
          {/* Error Message */}
          {cameraError && (
            <div className="p-6 text-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Gagal Mengakses Kamera</h3>
              <p className="text-xs text-slate-400 mb-4">{cameraError}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 transition flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="w-4 h-4" /> Coba Lagi
              </button>
            </div>
          )}

          {/* Video Stream Element */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isStreaming && !cameraError ? 'opacity-100' : 'opacity-0 absolute'
            }`}
          />

          {/* HUD Overlay when streaming */}
          {isStreaming && !cameraError && (
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6">
              {/* Top HUD Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-emerald-300 font-semibold uppercase">LIVE FEED</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400 font-mono">{facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs font-mono text-cyan-300">
                    {isScanning ? (
                      <span className="flex items-center gap-1.5 text-cyan-400">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Scanning...
                      </span>
                    ) : (
                      <span>{fps > 0 ? `${fps} FPS` : 'Siaga'}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Center License Plate Targeting Guide Box */}
              <div className="relative self-center w-[75%] sm:w-[55%] aspect-[3/1] max-w-sm rounded-lg border border-dashed border-cyan-400/40 bg-cyan-500/5 flex items-center justify-center">
                {/* Target Corners */}
                <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
                <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
                <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />

                {/* Animated Scanner Laser Bar */}
                {isScanning && (
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-bounce" />
                )}

                <div className="text-[11px] text-cyan-300/80 font-medium tracking-wide bg-slate-950/70 px-2 py-0.5 rounded backdrop-blur-sm">
                  Posisikan Plat di Dalam Kotak
                </div>
              </div>

              {/* Bottom HUD Hint */}
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="bg-slate-950/80 px-2 py-1 rounded backdrop-blur-sm">
                  ⚡ Auto-recognition aktif
                </span>
                <span className="bg-slate-950/80 px-2 py-1 rounded backdrop-blur-sm">
                  Tesseract WASM Engine
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Camera Toolbar & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-2">
            {/* Start / Stop Stream */}
            {isStreaming ? (
              <button
                onClick={stopCamera}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-600/20 border border-rose-500/40 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold transition"
              >
                <Square className="w-3.5 h-3.5 fill-current" /> Stop Kamera
              </button>
            ) : (
              <button
                onClick={startCamera}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Aktifkan Kamera
              </button>
            )}

            {/* Switch Camera */}
            <button
              onClick={switchCamera}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              title="Ganti Kamera Depan / Belakang"
            >
              <SwitchCamera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ganti Kamera</span>
            </button>

            {/* Flashlight / Torch */}
            {hasTorchSupport && (
              <button
                onClick={toggleTorch}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition ${
                  torchOn
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
                title="Lampu Flash"
              >
                {torchOn ? <Zap className="w-3.5 h-3.5 fill-current" /> : <ZapOff className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Flash</span>
              </button>
            )}
          </div>

          {/* Right Action: Manual Trigger & Auto Scan Switch */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
              <input
                type="checkbox"
                checked={autoScan}
                onChange={(e) => setAutoScan(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-900"
              />
              <span>Auto-Scan ({scanSpeedMs / 1000}s)</span>
            </label>

            <button
              onClick={processCurrentFrame}
              disabled={!isStreaming || isScanning}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition"
            >
              <Camera className="w-4 h-4" />
              <span>Ambil & Pindai</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Detection Result Sidebar Card */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" /> Hasil Deteksi Terakhir
            </h3>
            {currentDetection && (
              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(currentDetection.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>

          {currentDetection ? (
            <div className="flex flex-col gap-4 mt-4">
              {/* Indonesian License Plate Display Box */}
              <div className="relative overflow-hidden rounded-xl border-4 border-slate-950 bg-slate-950 p-4 shadow-inner text-center">
                <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500 mb-1">
                  PLAT NOMOR KENDARAAN
                </div>
                <div className="font-mono text-2xl sm:text-3xl font-black tracking-wider text-white select-all">
                  {currentDetection.formattedPlate}
                </div>
                {currentDetection.expiryDate && (
                  <div className="mt-1 text-xs font-mono font-semibold text-slate-400 tracking-widest">
                    {currentDetection.expiryDate}
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Status Akses:</span>
                {currentDetection.status === 'vip' ? (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" /> VIP PASSED
                  </span>
                ) : currentDetection.status === 'registered' ? (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" /> DIIZINKAN
                  </span>
                ) : currentDetection.status === 'blacklist' ? (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <XCircle className="w-3.5 h-3.5" /> BLACKLIST / BLOKIR
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    <Info className="w-3.5 h-3.5" /> Terdeteksi
                  </span>
                )}
              </div>

              {/* Region and Details */}
              <div className="space-y-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                {currentDetection.notes && (
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Wilayah / Info:
                    </span>
                    <span className="font-medium text-slate-200 text-right">{currentDetection.notes}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Akurasi Confidence:</span>
                  <span className="font-mono font-semibold text-cyan-300">{currentDetection.confidence}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Waktu Proses:</span>
                  <span className="font-mono text-slate-300">{currentDetection.processingTimeMs} ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Metode Ekstraksi:</span>
                  <span className="font-mono text-slate-300 text-[11px] uppercase">
                    {currentDetection.method === 'onnx_yolo' ? 'YOLOv8 ONNX' : 'CV Edge Contour'}
                  </span>
                </div>
              </div>

              {/* Cropped Plate Image Thumbnail */}
              <div>
                <div className="text-[11px] font-medium text-slate-400 mb-1.5">Potongan Plat Terdeteksi:</div>
                <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 flex items-center justify-center p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentDetection.plateCropImage}
                    alt="Cropped Plate"
                    className="max-h-20 w-auto object-contain rounded"
                  />
                </div>
              </div>

              {/* View Full Detail Modal Button */}
              <button
                onClick={() => onOpenPlateDetail(currentDetection)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                Lihat Detail & Enhancement
              </button>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500">
              <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-3 text-slate-600">
                <Camera className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium text-slate-400">Belum ada plat yang terdeteksi</p>
              <p className="text-[11px] text-slate-500 mt-1">Arahkan kamera ke plat kendaraan atau klik tombol Pindai</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
