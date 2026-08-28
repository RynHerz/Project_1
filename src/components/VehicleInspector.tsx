'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  Image as ImageIcon,
  Play,
  RefreshCw,
  FileCheck,
  Edit3,
  Layers,
  ChevronRight,
  Check,
  Copy,
} from 'lucide-react';
import { DetectionResult, WhitelistRule, VehicleCargoManifest } from '../lib/alpr/types';
import { runAlprPipelineMulti } from '../lib/alpr/pipeline';
import { VehicleCargoForm } from './VehicleCargoForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
  const [copied, setCopied] = useState<boolean>(false);

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

  // Draw bounding boxes over image when results change
  const drawBoundingBoxes = (results: DetectionResult[], imgEl: HTMLImageElement) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || !imgEl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imgEl.naturalWidth || imgEl.width;
    canvas.height = imgEl.naturalHeight || imgEl.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    results.forEach((res, idx) => {
      const isSelected = idx === selectedVehicleIndex;
      const { x, y, width, height } = res.bbox;

      ctx.lineWidth = isSelected ? 4 : 2;
      ctx.strokeStyle = isSelected ? '#38bdf8' : '#22c55e';
      ctx.strokeRect(x, y, width, height);

      // Label background
      ctx.fillStyle = isSelected ? 'rgba(14, 165, 233, 0.9)' : 'rgba(22, 101, 52, 0.9)';
      const labelText = `#${idx + 1} ${res.formattedPlate}`;
      ctx.font = 'bold 16px monospace';
      const textWidth = ctx.measureText(labelText).width;

      const labelHeight = 26;
      const labelY = y > labelHeight ? y - labelHeight : y;
      ctx.fillRect(x, labelY, textWidth + 14, labelHeight);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, x + 7, labelY + 18);
    });
  };

  // Run full detection pipeline on loaded image
  const processImage = async () => {
    if (!imageElementRef.current) return;
    setIsProcessing(true);
    setStatusMessage('Memindai seluruh kendaraan & plat dalam foto...');

    try {
      const results = await runAlprPipelineMulti(imageElementRef.current, whitelistRules, soundEnabled);
      setDetectedResults(results);
      setSelectedVehicleIndex(0);
      setManualPlateText(results[0]?.formattedPlate || '');

      results.forEach((res) => {
        onNewDetection(res);
      });

      drawBoundingBoxes(results, imageElementRef.current);
      setStatusMessage(`Selesai: ${results.length} kendaraan/plat nomor teridentifikasi.`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Gagal menganalisis gambar. Coba lagi dengan pencahayaan yang lebih baik.');
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

  const handleCopyPlate = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Hidden file & camera inputs */}
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

      {/* Clean Top Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Inspeksi Plat & Muatan Kendaraan
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sistem pengenalan plat multi-kendaraan dengan integrasi manifes logistik.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => cameraCaptureInputRef.current?.click()}
            size="sm"
            className="gap-2 text-xs font-semibold"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Foto Kamera</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2 text-xs font-medium"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Foto</span>
          </Button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Media Preview & Vehicle Selection */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Media Card */}
          <Card className="overflow-hidden">
            <CardContent className="p-4 flex flex-col items-center justify-center min-h-[320px]">
              {fileUrl ? (
                <div className="relative w-full flex flex-col items-center">
                  {selectedFileType === 'image' ? (
                    <div className="relative max-h-[360px] w-full rounded-lg overflow-hidden border border-border bg-black/40 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        ref={imageElementRef}
                        src={fileUrl}
                        alt="Preview kendaraan"
                        onLoad={processImage}
                        className="max-h-[340px] w-auto object-contain rounded-md"
                      />

                      {/* Canvas overlay for multi-plate bounding boxes */}
                      <canvas
                        ref={overlayCanvasRef}
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                      />

                      {/* Scanning spinner overlay */}
                      {isProcessing && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center">
                          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
                          <span className="text-xs font-mono font-medium text-foreground">
                            Memproses OCR & Deteksi...
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
                        className="max-h-[340px] w-full rounded-lg border border-border bg-black/40 object-contain"
                      />
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          onClick={processVideoFrame}
                          disabled={isProcessing}
                          size="sm"
                          className="gap-2 text-xs"
                        >
                          {isProcessing ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                          Pindai Frame Video
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Media Control Toolbar */}
                  <div className="mt-3 w-full flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs gap-1.5 h-8"
                    >
                      <Upload className="w-3 h-3" /> Ganti Gambar
                    </Button>

                    {selectedFileType === 'image' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={processImage}
                        disabled={isProcessing}
                        className="text-xs gap-1.5 h-8"
                      >
                        <RefreshCw className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
                        Pindai Ulang
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-8 text-center cursor-pointer transition bg-muted/20 hover:bg-muted/40"
                >
                  <div className="w-12 h-12 rounded-lg bg-muted border border-border flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    Upload Foto / Video Kendaraan
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
                    Mendukung deteksi tunggal maupun multi-kendaraan dalam satu tangkapan gambar.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary" className="gap-1.5 text-xs pointer-events-none">
                      <ImageIcon className="w-3.5 h-3.5" /> Pilih File
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Multi-Vehicle Selector Tabs (If 2+ vehicles detected in photo) */}
          {detectedResults.length > 1 && (
            <Card className="border-primary/30">
              <CardHeader className="p-3.5 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <CardTitle className="text-xs font-semibold">
                      Ditemukan {detectedResults.length} Kendaraan dalam Foto
                    </CardTitle>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Pilih untuk kelola</span>
                </div>
              </CardHeader>
              <CardContent className="p-3.5 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                        className={`p-2.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-accent border-primary text-foreground ring-1 ring-primary'
                            : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Badge variant={isSelected ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                              #{idx + 1}
                            </Badge>
                            <span className="font-mono text-xs font-bold text-foreground">
                              {res.formattedPlate}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block pl-5">
                            {res.vehicleType || 'Kendaraan'} • {res.confidence}% Akurasi
                          </span>
                        </div>
                        <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Plate OCR Result Card */}
          {activeResult && (
            <Card>
              <CardHeader className="p-4 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-xs font-semibold">
                      Kendaraan Aktif: <span className="font-mono">#{selectedVehicleIndex + 1}</span>
                    </CardTitle>
                  </div>
                  <Badge variant="success" className="font-mono text-[10px]">
                    {activeResult.confidence}% Akurasi
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-0 space-y-3">
                {/* Plate display */}
                <div className="rounded-lg border border-border bg-muted/40 p-3.5 text-center">
                  {isEditingPlate ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={manualPlateText}
                        onChange={(e) => setManualPlateText(e.target.value)}
                        className="text-center font-mono text-lg font-bold"
                      />
                      <Button size="sm" onClick={handleSaveManualPlate} className="text-xs">
                        Simpan
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-mono text-2xl font-black tracking-wider text-foreground select-all">
                          {activeResult.formattedPlate}
                        </span>
                        <Button
                          variant="ghost"
                          size="iconSm"
                          onClick={() => handleCopyPlate(activeResult.formattedPlate)}
                          title="Salin Nomor Plat"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="iconSm"
                          onClick={() => {
                            setManualPlateText(activeResult.formattedPlate);
                            setIsEditingPlate(true);
                          }}
                          title="Koreksi Nomor Plat"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {activeResult.expiryDate && (
                        <div className="mt-1 text-[11px] font-mono text-muted-foreground">
                          MASA BERLAKU: {activeResult.expiryDate}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Gate Access Badge */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-muted-foreground">Hak Akses:</span>
                  <Badge
                    variant={
                      activeResult.status === 'vip'
                        ? 'vip'
                        : activeResult.status === 'registered'
                        ? 'success'
                        : activeResult.status === 'blacklist'
                        ? 'destructive'
                        : 'secondary'
                    }
                    className="uppercase text-[10px]"
                  >
                    {activeResult.status === 'vip'
                      ? 'VIP ACCESS'
                      : activeResult.status === 'registered'
                      ? 'TERDAFTAR'
                      : activeResult.status === 'blacklist'
                      ? 'BLACKLIST'
                      : 'TAMU / UMUM'}
                  </Badge>
                </div>

                {/* Plate Crop Preview */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2 rounded-md bg-muted/40 border border-border flex flex-col items-center">
                    <span className="text-[10px] text-muted-foreground mb-1">Crop Plat</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeResult.plateCropImage}
                      alt="Crop"
                      className="max-h-10 w-auto object-contain rounded"
                    />
                  </div>
                  <div className="p-2 rounded-md bg-muted/40 border border-border flex flex-col items-center">
                    <span className="text-[10px] text-muted-foreground mb-1">Binarized OCR</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeResult.enhancedPlateImage || activeResult.plateCropImage}
                      alt="Enhanced"
                      className="max-h-10 w-auto object-contain rounded bg-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Cargo Manifest Form */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {activeResult ? (
            <VehicleCargoForm
              key={activeResult.id || `${activeResult.formattedPlate}_${selectedVehicleIndex}`}
              plateNumber={activeResult.formattedPlate}
              initialManifest={activeResult.cargoManifest}
              onSaveManifest={handleSaveManifest}
              onOpenGatePassSlip={() => onOpenGatePassSlip(activeResult)}
            />
          ) : (
            <Card className="min-h-[420px] flex items-center justify-center text-center p-8">
              <div className="space-y-3 max-w-sm">
                <div className="w-12 h-12 rounded-lg bg-muted border border-border flex items-center justify-center mx-auto text-muted-foreground">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Formulir Manifes Siap
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pilih atau upload gambar kendaraan di sebelah kiri untuk mengisi data muatan, sopir, dan mencetak izin gerbang.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
