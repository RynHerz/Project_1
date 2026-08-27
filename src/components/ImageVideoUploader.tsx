'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Video as VideoIcon,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  FileCheck,
  Eye,
  Sliders,
} from 'lucide-react';
import { DetectionResult, WhitelistRule } from '../lib/alpr/types';
import { runAlprPipeline } from '../lib/alpr/pipeline';
import { DEMO_SAMPLES, DemoSample } from '../lib/alpr/sampleData';

interface ImageVideoUploaderProps {
  onNewDetection: (result: DetectionResult) => void;
  whitelistRules: WhitelistRule[];
  soundEnabled: boolean;
  onOpenPlateDetail: (result: DetectionResult) => void;
}

export const ImageVideoUploader: React.FC<ImageVideoUploaderProps> = ({
  onNewDetection,
  whitelistRules,
  soundEnabled,
  onOpenPlateDetail,
}) => {
  const [selectedFileType, setSelectedFileType] = useState<'image' | 'video' | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement | null>(null);

  // Handle local file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isVideo) {
      alert('Format file tidak didukung. Harap upload gambar (JPG, PNG, WebP) atau video (MP4, WebM).');
      return;
    }

    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setSelectedFileType(isVideo ? 'video' : 'image');
    setDetectionResult(null);
    setStatusMessage(null);
  };

  // Handle selecting built-in demo sample
  const handleSelectSample = (sample: DemoSample) => {
    setFileUrl(sample.dataUrl);
    setSelectedFileType('image');
    setDetectionResult(null);
    setStatusMessage(null);
  };

  // Run detection on current loaded image
  const processImage = async () => {
    if (!imageElementRef.current) return;
    setIsProcessing(true);
    setStatusMessage('Memproses ekstraksi plat nomor & OCR...');

    try {
      const result = await runAlprPipeline(imageElementRef.current, whitelistRules, soundEnabled);
      setDetectionResult(result);
      onNewDetection(result);
      setStatusMessage(`Selesai! Terdeteksi dalam ${result.processingTimeMs} ms.`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Gagal mendeteksi plat: ' + (err.message || 'Error tidak diketahui'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Run detection on current video frame
  const processVideoFrame = async () => {
    if (!videoElementRef.current) return;
    setIsProcessing(true);
    setStatusMessage('Menganalisis frame video...');

    try {
      const result = await runAlprPipeline(videoElementRef.current, whitelistRules, soundEnabled);
      setDetectionResult(result);
      onNewDetection(result);
      setStatusMessage(`Frame terbaca dalam ${result.processingTimeMs} ms.`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Gagal membaca frame video.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Upload Zone & Previewer */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        {/* Dropzone & Preview Container */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-6 shadow-xl min-h-[380px] flex flex-col items-center justify-center">
          {fileUrl ? (
            <div className="relative w-full flex flex-col items-center">
              {selectedFileType === 'image' ? (
                <div className="relative max-h-[480px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imageElementRef}
                    src={fileUrl}
                    alt="Preview kendaraan"
                    onLoad={processImage}
                    className="max-h-[440px] w-auto object-contain"
                  />
                  <canvas ref={canvasOverlayRef} className="absolute inset-0 pointer-events-none" />
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  <video
                    ref={videoElementRef}
                    src={fileUrl}
                    controls
                    playsInline
                    className="max-h-[440px] w-full rounded-xl border border-slate-800 bg-slate-950 object-contain"
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={processVideoFrame}
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition flex items-center gap-2"
                    >
                      {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                      Pindai Frame Video Ini
                    </button>
                  </div>
                </div>
              )}

              {/* Replace / Change File Button */}
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" /> Ganti File
                </button>
                {selectedFileType === 'image' && (
                  <button
                    onClick={processImage}
                    disabled={isProcessing}
                    className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition flex items-center gap-2"
                  >
                    {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Pindai Ulang
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Upload Placeholder */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-8 sm:p-12 text-center cursor-pointer transition bg-slate-950/40 hover:bg-slate-950/70 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 group-hover:bg-cyan-950 border border-slate-700 group-hover:border-cyan-500/40 flex items-center justify-center mx-auto mb-4 text-slate-400 group-hover:text-cyan-400 transition shadow-inner">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">
                Upload Foto atau Video Kendaraan
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                Tarik & letakkan file foto (JPG, PNG, WebP) atau rekaman CCTV (MP4, WebM) ke sini untuk langsung dideteksi.
              </p>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 group-hover:bg-cyan-600 text-slate-200 group-hover:text-white text-xs font-semibold border border-slate-700 group-hover:border-cyan-500 transition shadow-md">
                <ImageIcon className="w-4 h-4" /> Pilih File dari Komputer
              </span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Built-in Sample Selector for Instant Testing */}
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Coba Contoh Plat Bawaan (1-Click Test):
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {DEMO_SAMPLES.map((sample) => (
              <button
                key={sample.id}
                onClick={() => handleSelectSample(sample)}
                className="flex flex-col items-start p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition text-left group"
              >
                <span className="font-mono text-xs font-bold text-cyan-400 group-hover:text-cyan-300">
                  {sample.plate}
                </span>
                <span className="text-[10px] text-slate-400 truncate w-full mt-0.5">{sample.name}</span>
                <span className="text-[9px] text-slate-500 mt-1 uppercase">
                  {sample.type === 'white_modern' ? 'Plat Putih' : 'Plat Hitam'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* OCR Result Sidebar */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-cyan-400" /> Hasil Analisis OCR
            </h3>
            {isProcessing && (
              <span className="text-[11px] text-cyan-400 font-mono flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Memproses...
              </span>
            )}
          </div>

          {detectionResult ? (
            <div className="flex flex-col gap-4 mt-4">
              {/* Indonesian License Plate Display Box */}
              <div className="relative overflow-hidden rounded-xl border-4 border-slate-950 bg-slate-950 p-4 shadow-inner text-center">
                <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500 mb-1">
                  PLAT NOMOR TERVERIFIKASI
                </div>
                <div className="font-mono text-2xl sm:text-3xl font-black tracking-wider text-white select-all">
                  {detectionResult.formattedPlate}
                </div>
                {detectionResult.expiryDate && (
                  <div className="mt-1 text-xs font-mono font-semibold text-slate-400 tracking-widest">
                    Masa Berlaku: {detectionResult.expiryDate}
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Status Gerbang:</span>
                {detectionResult.status === 'vip' ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    VIP ACCESS
                  </span>
                ) : detectionResult.status === 'registered' ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    TERDAFTAR
                  </span>
                ) : detectionResult.status === 'blacklist' ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    DIBLOKIR / BLACKLIST
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    UMUM / TAMU
                  </span>
                )}
              </div>

              {/* Plate Preprocessing Visual Comparison */}
              <div className="space-y-2">
                <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                  <span>Hasil Crop Asli:</span>
                  <span>Enhancement (Otsu Binary):</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-1 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={detectionResult.plateCropImage}
                      alt="Crop Asli"
                      className="max-h-16 w-auto object-contain rounded"
                    />
                  </div>
                  <div className="p-1 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={detectionResult.enhancedPlateImage || detectionResult.plateCropImage}
                      alt="Binarized"
                      className="max-h-16 w-auto object-contain rounded bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                {detectionResult.notes && (
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400">Wilayah / Info:</span>
                    <span className="font-medium text-slate-200 text-right">{detectionResult.notes}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Confidence Score:</span>
                  <span className="font-mono font-semibold text-emerald-400">{detectionResult.confidence}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Kecepatan Inference:</span>
                  <span className="font-mono text-slate-300">{detectionResult.processingTimeMs} ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Model:</span>
                  <span className="font-mono text-slate-300 text-[11px]">Tesseract WASM + CV</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onOpenPlateDetail(detectionResult)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                Lihat Detail Lengkap
              </button>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500">
              <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-3 text-slate-600">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium text-slate-400">Pilih gambar atau contoh plat di sebelah kiri</p>
              <p className="text-[11px] text-slate-500 mt-1">Sistem akan mengekstrak dan membaca karakter plat secara otomatis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
