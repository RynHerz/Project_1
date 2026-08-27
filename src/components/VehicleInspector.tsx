'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Camera,
  Image as ImageIcon,
  Video as VideoIcon,
  Play,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  FileCheck,
  Eye,
  Sliders,
  ShieldCheck,
  Package,
  Printer,
  Edit3,
  Car,
  Truck,
  PlusCircle,
  Clock,
  Layers,
  ChevronRight,
  Save,
} from 'lucide-react';
import { DetectionResult, WhitelistRule, VehicleCargoManifest } from '../lib/alpr/types';
import { runAlprPipelineMulti } from '../lib/alpr/pipeline';
import { DEMO_SAMPLES, DemoSample, createDefaultCargoManifest } from '../lib/alpr/sampleData';
import { VehicleCargoForm } from './VehicleCargoForm';

interface VehicleInspectorProps {
  onNewDetection: (result: DetectionResult) => void;
  whitelistRules: WhitelistRule[];
  soundEnabled: boolean;
  onOpenPlateDetail: (result: DetectionResult) => void;
  onOpenGatePassSlip: (result: DetectionResult) => void;
}

export const VehicleInspector: React.FC<VehicleInspectorProps> = ({
  onNewDetection,
  whitelistRules,
  soundEnabled,
  onOpenPlateDetail,
  onOpenGatePassSlip,
}) => {
  const [selectedFileType, setSelectedFileType] = useState<'image' | 'video' | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [detectedResults, setDetectedResults] = useState<DetectionResult[]>([]);
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Manual plate editing state
  const [isEditingPlate, setIsEditingPlate] = useState<boolean>(false);
  const [manualPlateText, setManualPlateText] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeResult: DetectionResult | null =
    detectedResults.length > 0 ? detectedResults[selectedVehicleIndex] || detectedResults[0] : null;

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
    setDetectedResults([]);
    setSelectedVehicleIndex(0);
    setStatusMessage(null);
    setIsEditingPlate(false);
  };

  // Handle selecting built-in demo sample
  const handleSelectSample = (sample: DemoSample) => {
    setFileUrl(sample.dataUrl);
    setSelectedFileType('image');
    setDetectedResults([]);
    setSelectedVehicleIndex(0);
    setStatusMessage(null);
    setIsEditingPlate(false);
  };

  // Draw bounding boxes over image when results change
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    const img = imageElementRef.current;
    if (!canvas || !img || detectedResults.length === 0) {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detectedResults.forEach((res, idx) => {
      const isSelected = idx === selectedVehicleIndex;
      const b = res.bbox;

      // Box border
      ctx.lineWidth = isSelected ? 4 : 2.5;
      ctx.strokeStyle = isSelected ? '#06b6d4' : '#3b82f6';
      ctx.fillStyle = isSelected ? 'rgba(6, 182, 212, 0.20)' : 'rgba(59, 130, 246, 0.10)';

      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.width, b.height, 6);
      ctx.fill();
      ctx.stroke();

      // Label background & text
      const label = `#${idx + 1}: ${res.formattedPlate}`;
      ctx.font = 'bold 16px monospace';
      const textWidth = ctx.measureText(label).width;

      ctx.fillStyle = isSelected ? '#0891b2' : '#1e3a8a';
      ctx.beginPath();
      ctx.roundRect(b.x, Math.max(0, b.y - 26), textWidth + 16, 24, 4);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, b.x + 8, Math.max(16, b.y - 8));
    });
  }, [detectedResults, selectedVehicleIndex]);

  // Run multi-plate detection on current loaded image
  const processImage = async () => {
    if (!imageElementRef.current) return;
    setIsProcessing(true);
    setStatusMessage('Memindai seluruh kendaraan & plat nomor dalam foto...');

    try {
      const results = await runAlprPipelineMulti(imageElementRef.current, whitelistRules, soundEnabled);

      // Match demo manifests if available
      const enrichedResults: DetectionResult[] = results.map((result) => {
        const matchedSample = DEMO_SAMPLES.find(
          (s) => s.plate.replace(/\s+/g, '') === result.plateNumber.replace(/\s+/g, '')
        );

        const manifest =
          matchedSample?.defaultManifest ||
          createDefaultCargoManifest(result.formattedPlate, matchedSample?.name);

        return {
          ...result,
          vehicleType: matchedSample?.vehicle || result.vehicleType || 'Mobil',
          cargoManifest: manifest,
        };
      });

      setDetectedResults(enrichedResults);
      setSelectedVehicleIndex(0);
      setManualPlateText(enrichedResults[0]?.formattedPlate || '');

      // Send each detected vehicle to history log
      enrichedResults.forEach((res) => {
        onNewDetection(res);
      });

      setStatusMessage(
        `Sukses! Berhasil mendeteksi ${enrichedResults.length} plat kendaraan dalam ${enrichedResults[0]?.processingTimeMs || 0} ms.`
      );
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
      const results = await runAlprPipelineMulti(videoElementRef.current, whitelistRules, soundEnabled);
      setDetectedResults(results);
      setSelectedVehicleIndex(0);
      setManualPlateText(results[0]?.formattedPlate || '');

      results.forEach((res) => {
        onNewDetection(res);
      });

      setStatusMessage(`Frame terbaca: ${results.length} plat terdeteksi.`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Gagal membaca frame video.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle cargo manifest updates for currently active vehicle
  const handleSaveManifest = (updatedManifest: VehicleCargoManifest) => {
    if (!activeResult) return;
    const updatedResult: DetectionResult = {
      ...activeResult,
      cargoManifest: updatedManifest,
    };

    const updatedList = [...detectedResults];
    updatedList[selectedVehicleIndex] = updatedResult;

    setDetectedResults(updatedList);
    onNewDetection(updatedResult);
  };

  // Handle manual plate number edit
  const handleSaveManualPlate = () => {
    if (!activeResult || !manualPlateText.trim()) return;
    const updatedResult: DetectionResult = {
      ...activeResult,
      formattedPlate: manualPlateText.toUpperCase().trim(),
      plateNumber: manualPlateText.toUpperCase().replace(/\s+/g, ''),
    };

    const updatedList = [...detectedResults];
    updatedList[selectedVehicleIndex] = updatedResult;

    setDetectedResults(updatedList);
    setIsEditingPlate(false);
    onNewDetection(updatedResult);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                Multi-Vehicle Checkpoint
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Multi-Plate AI Scanner + Cargo Manifest
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Inspeksi Kendaraan, Deteksi Multi-Plat & Manajemen Muatan
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl">
              Mampu mendeteksi **banyak kendaraan / motor sekaligus** dalam satu foto, memeriksa status akses gerbang, dan menginput dokumen muatan masing-masing kendaraan.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => cameraCaptureInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Foto Langsung (Kamera HP)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Upload Foto Kendaraan</span>
            </button>
          </div>
        </div>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={cameraCaptureInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Media & Detection Selector */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Media Container */}
          <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-5 shadow-xl flex flex-col items-center justify-center min-h-[340px]">
            {fileUrl ? (
              <div className="relative w-full flex flex-col items-center">
                {selectedFileType === 'image' ? (
                  <div className="relative max-h-[380px] w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={imageElementRef}
                      src={fileUrl}
                      alt="Preview kendaraan"
                      onLoad={processImage}
                      className="max-h-[360px] w-auto object-contain rounded-lg"
                    />

                    {/* Canvas overlay for multi-plate bounding boxes */}
                    <canvas
                      ref={overlayCanvasRef}
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    />

                    {/* Animated Scanning Overlay when processing */}
                    {isProcessing && (
                      <div className="absolute inset-0 bg-cyan-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-2xl border-2 border-cyan-400 animate-spin flex items-center justify-center text-cyan-400 mb-2">
                          <RefreshCw className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-mono font-bold text-cyan-300 animate-pulse">
                          Mencari Semua Plat Nomor...
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <video
                      ref={videoElementRef}
                      src={fileUrl}
                      controls
                      playsInline
                      className="max-h-[360px] w-full rounded-xl border border-slate-800 bg-slate-950 object-contain"
                    />
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={processVideoFrame}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition flex items-center gap-2 cursor-pointer"
                      >
                        {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                        Pindai Frame Video Ini
                      </button>
                    </div>
                  </div>
                )}

                {/* Media Control Bar */}
                <div className="mt-4 w-full flex items-center justify-between gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Ganti Foto
                  </button>

                  {selectedFileType === 'image' && (
                    <button
                      onClick={processImage}
                      disabled={isProcessing}
                      className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                      Pindai Ulang
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-8 text-center cursor-pointer transition bg-slate-950/40 hover:bg-slate-950/70 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-800/80 group-hover:bg-cyan-950 border border-slate-700 group-hover:border-cyan-500/40 flex items-center justify-center mx-auto mb-3 text-slate-400 group-hover:text-cyan-400 transition shadow-inner">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  Upload Foto Kendaraan (Bisa 1 atau Banyak Kendaraan)
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mb-3">
                  Pilih foto kendaraan dari galeri atau potret langsung dengan kamera HP.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-semibold shadow-md">
                    <ImageIcon className="w-3.5 h-3.5" /> Pilih Gambar
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Multi-Vehicle Selector Tabs (If 2+ vehicles detected in photo) */}
          {detectedResults.length > 1 && (
            <div className="rounded-2xl bg-slate-900 border border-cyan-500/30 p-4 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <Layers className="w-4 h-4" /> Ditemukan {detectedResults.length} Kendaraan dalam Foto:
                </span>
                <span className="text-[10px] text-slate-400">Klik untuk pilih & edit muatan</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {detectedResults.map((res, idx) => {
                  const isSelected = idx === selectedVehicleIndex;
                  return (
                    <button
                      key={res.id || idx}
                      onClick={() => {
                        setSelectedVehicleIndex(idx);
                        setManualPlateText(res.formattedPlate);
                        setIsEditingPlate(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                          <span className="font-mono text-xs font-black text-white">
                            {res.formattedPlate}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block pl-6">
                          {res.vehicleType || 'Kendaraan'} • {res.confidence}% Akurasi
                        </span>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-600'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Plate OCR Result Card */}
          {activeResult && (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-cyan-400" /> Kendaraan Aktif:{' '}
                  <span className="text-cyan-300 font-mono">#{selectedVehicleIndex + 1}</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">
                  {activeResult.confidence}% Akurasi
                </span>
              </div>

              {/* License Plate Display */}
              <div className="relative rounded-xl border-4 border-slate-950 bg-slate-950 p-4 text-center shadow-inner">
                {isEditingPlate ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={manualPlateText}
                      onChange={(e) => setManualPlateText(e.target.value)}
                      className="w-full text-center font-mono text-xl font-black bg-slate-900 border border-cyan-500 text-white rounded-lg p-1.5 focus:outline-none"
                    />
                    <button
                      onClick={handleSaveManualPlate}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-bold cursor-pointer"
                    >
                      Simpan
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-center gap-2">
                      <div className="font-mono text-2xl sm:text-3xl font-black tracking-wider text-white select-all">
                        {activeResult.formattedPlate}
                      </div>
                      <button
                        onClick={() => {
                          setManualPlateText(activeResult.formattedPlate);
                          setIsEditingPlate(true);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-cyan-400 transition cursor-pointer"
                        title="Koreksi Nomor Plat Manual"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {activeResult.expiryDate && (
                      <div className="mt-1 text-[11px] font-mono font-semibold text-slate-400 tracking-widest">
                        MASA BERLAKU: {activeResult.expiryDate}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Hak Akses Gerbang:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[11px] ${
                    activeResult.status === 'vip'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : activeResult.status === 'registered'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : activeResult.status === 'blacklist'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {activeResult.status === 'vip'
                    ? 'VIP ACCESS'
                    : activeResult.status === 'registered'
                    ? 'TERDAFTAR'
                    : activeResult.status === 'blacklist'
                    ? 'BLACKLIST'
                    : 'TAMU / UMUM'}
                </span>
              </div>

              {/* Crop & Binarized Preview */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center">
                  <span className="text-[9px] text-slate-500 mb-1">Crop Potongan Plat</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeResult.plateCropImage}
                    alt="Crop"
                    className="max-h-12 w-auto object-contain rounded"
                  />
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center">
                  <span className="text-[9px] text-slate-500 mb-1">Enhanced OCR</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeResult.enhancedPlateImage || activeResult.plateCropImage}
                    alt="Enhanced"
                    className="max-h-12 w-auto object-contain rounded bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 1-Click Preset Samples for Instant Testing */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Contoh Armada Bawaan (1-Click Test):
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  className="flex flex-col items-start p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition text-left group cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-xs font-black text-cyan-400 group-hover:text-cyan-300">
                      {sample.plate}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                      {sample.vehicle}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-300 truncate w-full mt-1 font-medium">
                    {sample.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Cargo Manifest Form for Active Vehicle */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl">
            {activeResult ? (
              <VehicleCargoForm
                key={activeResult.id || `${activeResult.formattedPlate}_${selectedVehicleIndex}`}
                plateNumber={activeResult.formattedPlate}
                initialManifest={activeResult.cargoManifest}
                onSaveManifest={handleSaveManifest}
                onOpenGatePassSlip={() => onOpenGatePassSlip(activeResult)}
              />
            ) : (
              <div className="py-16 text-center text-slate-500 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                  <Package className="w-8 h-8 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-300">
                    Formulir Muatan & Barang Bawaan Siap
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    Upload foto kendaraan (termasuk foto dengan banyak motor/mobil) untuk memindai seluruh plat dan mengisi data muatan masing-masing.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
