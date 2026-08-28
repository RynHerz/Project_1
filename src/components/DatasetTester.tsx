'use client';

import React, { useState, useRef } from 'react';
import {
  FolderUp,
  Play,
  Download,
  CheckCircle2,
  XCircle,
  FileCode2,
  Copy,
  Check,
  Layers,
} from 'lucide-react';
import { DatasetItem, DetectionResult, WhitelistRule } from '../lib/alpr/types';
import { runAlprPipeline } from '../lib/alpr/pipeline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DatasetTesterProps {
  onNewDetection: (result: DetectionResult) => void;
  whitelistRules: WhitelistRule[];
  soundEnabled: boolean;
  onOpenPlateDetail: (result: DetectionResult) => void;
}

export const DatasetTester: React.FC<DatasetTesterProps> = ({
  onNewDetection,
  whitelistRules,
  soundEnabled,
  onOpenPlateDetail,
}) => {
  const [items, setItems] = useState<DatasetItem[]>([]);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [activeSubTab, setActiveSubTab] = useState<'tester' | 'training_guide'>('tester');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'match' | 'mismatch'>('all');

  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const filesInputRef = useRef<HTMLInputElement | null>(null);

  // Parse inferred ground-truth from filename (e.g., "B1234ABC.jpg" or "B_1234_ABC_front.png")
  const extractGroundTruthFromFileName = (fileName: string): string => {
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    const clean = baseName.toUpperCase().replace(/[_\-]/g, ' ').replace(/[^A-Z0-9\s]/g, '').trim();
    const match = clean.match(/([A-Z]{1,2})\s*([0-9]{1,4})\s*([A-Z]{1,3})/);
    if (match) {
      return `${match[1]} ${match[2]} ${match[3]}`;
    }
    return '';
  };

  // Handle file selection from folder or multiple images
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: DatasetItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const url = URL.createObjectURL(file);
      const groundTruth = extractGroundTruthFromFileName(file.name);

      newItems.push({
        id: `ds_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
        fileName: file.name,
        imageUrl: url,
        fileSize: file.size,
        groundTruth: groundTruth || undefined,
        status: 'idle',
        thumbnailUrl: url,
      });
    }

    setItems(newItems);
    setProgress(0);
  };

  // Run Batch Evaluation
  const runBatchEvaluation = async () => {
    if (items.length === 0 || isEvaluating) return;
    setIsEvaluating(true);
    setProgress(0);

    const updatedItems = [...items];

    for (let i = 0; i < updatedItems.length; i++) {
      const current = updatedItems[i];
      current.status = 'processing';
      setItems([...updatedItems]);

      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = current.imageUrl;

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const startTime = performance.now();
        const detection = await runAlprPipeline(img, whitelistRules, false);
        const elapsed = Math.round(performance.now() - startTime);

        current.detectedPlate = detection.formattedPlate;
        current.confidence = detection.confidence;
        current.processingTimeMs = elapsed;
        current.status = 'success';

        if (current.groundTruth) {
          const normGt = current.groundTruth.replace(/\s+/g, '').toUpperCase();
          const normDet = detection.formattedPlate.replace(/\s+/g, '').toUpperCase();
          current.isCorrect = normGt === normDet;
        } else {
          current.isCorrect = detection.confidence >= 60;
        }

        onNewDetection(detection);
      } catch (err) {
        current.status = 'failed';
        current.detectedPlate = 'Gagal';
        current.confidence = 0;
        current.isCorrect = false;
      }

      setProgress(Math.round(((i + 1) / updatedItems.length) * 100));
      setItems([...updatedItems]);
    }

    setIsEvaluating(false);
  };

  // Export report to CSV
  const exportReportToCsv = () => {
    if (items.length === 0) return;

    const headers = ['No', 'Nama File', 'Ground Truth', 'Hasil Terdeteksi', 'Confidence (%)', 'Waktu (ms)', 'Status Match'];
    const rows = items.map((item, idx) => [
      idx + 1,
      item.fileName,
      item.groundTruth || '-',
      item.detectedPlate || '-',
      item.confidence ?? '-',
      item.processingTimeMs ?? '-',
      item.isCorrect ? 'SESUAI' : 'TIDAK SESUAI',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dataset_alpr_report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Calculate statistics
  const processedCount = items.filter((i) => i.status === 'success' || i.status === 'failed').length;
  const correctCount = items.filter((i) => i.isCorrect).length;
  const accuracyRate = processedCount > 0 ? Math.round((correctCount / processedCount) * 100) : 0;
  const avgConfidence =
    processedCount > 0
      ? Math.round(
          items.filter((i) => i.confidence !== undefined).reduce((acc, curr) => acc + (curr.confidence || 0), 0) /
            processedCount
        )
      : 0;

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filterStatus === 'match') return item.isCorrect === true;
    if (filterStatus === 'mismatch') return item.isCorrect === false && item.status !== 'idle';
    return true;
  });

  const pythonTrainingSnippet = `# =========================================================================
# SCRIPT TRAINING DATASET PLAT NOMOR DENGAN YOLOv8 & EXPORT KE ONNX
# Jalankan script ini di Google Colab atau terminal Python lokal Anda
# =========================================================================

!pip install ultralytics onnx

import os
from ultralytics import YOLO

# Siapkan dataset.yaml
yaml_config = """
path: ./dataset_plat
train: images/train
val: images/val
names:
  0: license_plate
"""
with open('data.yaml', 'w') as f:
    f.write(yaml_config)

# Train model YOLOv8 Nano
model = YOLO('yolov8n.pt')
results = model.train(
    data='data.yaml',
    epochs=50,
    imgsz=640,
    batch=16,
    device='0'
)

# Export bobot model ke format ONNX
success = model.export(format='onnx', imgsz=640, opset=12)
print("Model berhasil diekspor! File tersimpan di: runs/detect/train/weights/best.onnx")

# Salin best.onnx ke public/models/plate_detector.onnx
`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(pythonTrainingSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Sub Tab Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
          <button
            onClick={() => setActiveSubTab('tester')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              activeSubTab === 'tester'
                ? 'bg-background text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Evaluator Dataset
          </button>
          <button
            onClick={() => setActiveSubTab('training_guide')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              activeSubTab === 'training_guide'
                ? 'bg-background text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Panduan Training YOLO
          </button>
        </div>

        {items.length > 0 && activeSubTab === 'tester' && (
          <Button
            variant="outline"
            size="sm"
            onClick={exportReportToCsv}
            disabled={processedCount === 0}
            className="text-xs gap-1.5 h-8"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        )}
      </div>

      {activeSubTab === 'tester' ? (
        <>
          {/* Top Actions: Upload Folder & Run Batch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => folderInputRef.current?.click()}
                size="sm"
                className="gap-2 text-xs font-semibold"
              >
                <FolderUp className="w-4 h-4" /> Masukkan Folder Dataset
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => filesInputRef.current?.click()}
                className="gap-2 text-xs"
              >
                <Layers className="w-4 h-4" /> Pilih Banyak File
              </Button>

              {/* Hidden Inputs */}
              {/* @ts-ignore */}
              <input
                ref={folderInputRef}
                type="file"
                // @ts-ignore
                webkitdirectory="true"
                // @ts-ignore
                directory="true"
                multiple
                onChange={handleFilesSelected}
                className="hidden"
              />
              <input
                ref={filesInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesSelected}
                className="hidden"
              />

              {items.length > 0 && (
                <span className="text-xs text-muted-foreground pl-2 font-mono">
                  {items.length} file dimuat
                </span>
              )}
            </div>

            <div>
              <Button
                onClick={runBatchEvaluation}
                disabled={items.length === 0 || isEvaluating}
                size="sm"
                className="w-full sm:w-auto gap-2 text-xs font-semibold"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isEvaluating ? 'Sedang Mengevaluasi...' : 'Jalankan Pengujian Batch'}
              </Button>
            </div>
          </div>

          {/* Progress Bar when Evaluating */}
          {isEvaluating && (
            <Card className="p-4">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
                <span>Memproses dataset di browser (Client-side AI)...</span>
                <span className="font-mono text-foreground font-bold">{progress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </Card>
          )}

          {/* Accuracy & Performance Summary Cards */}
          {items.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-4">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Total Gambar</span>
                <div className="text-2xl font-bold font-mono text-foreground mt-1">{items.length}</div>
              </Card>
              <Card className="p-4">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Selesai Diuji</span>
                <div className="text-2xl font-bold font-mono text-foreground mt-1">
                  {processedCount} <span className="text-xs font-normal text-muted-foreground">/ {items.length}</span>
                </div>
              </Card>
              <Card className="p-4">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Akurasi Pembacaan</span>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{accuracyRate}%</div>
              </Card>
              <Card className="p-4">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Rata-rata Confidence</span>
                <div className="text-2xl font-bold font-mono text-foreground mt-1">{avgConfidence}%</div>
              </Card>
            </div>
          )}

          {/* Dataset Table */}
          {items.length > 0 ? (
            <Card>
              {/* Table Filter Tabs */}
              <CardHeader className="p-4 pb-3 border-b border-border flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md border border-border">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                      filterStatus === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Semua ({items.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('match')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                      filterStatus === 'match' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Sesuai ({correctCount})
                  </button>
                  <button
                    onClick={() => setFilterStatus('mismatch')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                      filterStatus === 'mismatch' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Koreksi ({processedCount - correctCount})
                  </button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[500px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow className="text-[11px] hover:bg-transparent">
                        <TableHead className="py-3 px-4">Preview</TableHead>
                        <TableHead className="py-3 px-4">Nama File</TableHead>
                        <TableHead className="py-3 px-4">Ground Truth</TableHead>
                        <TableHead className="py-3 px-4">Hasil OCR</TableHead>
                        <TableHead className="py-3 px-4">Confidence</TableHead>
                        <TableHead className="py-3 px-4">Waktu</TableHead>
                        <TableHead className="py-3 px-4">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id} className="text-xs">
                          <TableCell className="py-2 px-4">
                            <div className="w-12 h-8 rounded bg-muted border border-border overflow-hidden flex items-center justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={item.imageUrl} alt={item.fileName} className="w-full h-full object-cover" />
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-4 font-mono text-muted-foreground max-w-[150px] truncate text-[11px]">
                            {item.fileName}
                          </TableCell>
                          <TableCell className="py-2 px-4 font-mono font-semibold text-foreground">
                            {item.groundTruth || '-'}
                          </TableCell>
                          <TableCell className="py-2 px-4 font-mono font-bold text-foreground">
                            {item.detectedPlate || '-'}
                          </TableCell>
                          <TableCell className="py-2 px-4 font-mono text-muted-foreground">
                            {item.confidence !== undefined ? `${item.confidence}%` : '-'}
                          </TableCell>
                          <TableCell className="py-2 px-4 font-mono text-muted-foreground text-[11px]">
                            {item.processingTimeMs !== undefined ? `${item.processingTimeMs} ms` : '-'}
                          </TableCell>
                          <TableCell className="py-2 px-4">
                            {item.status === 'processing' ? (
                              <span className="text-muted-foreground font-medium animate-pulse text-[11px]">Memproses...</span>
                            ) : item.isCorrect === true ? (
                              <Badge variant="success" className="text-[10px] gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Sesuai
                              </Badge>
                            ) : item.status === 'success' ? (
                              <Badge variant="warning" className="text-[10px] gap-1">
                                <XCircle className="w-3 h-3" /> Berbeda
                              </Badge>
                            ) : item.status === 'failed' ? (
                              <Badge variant="destructive" className="text-[10px] gap-1">
                                <XCircle className="w-3 h-3" /> Gagal
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">Menunggu</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed p-12 text-center">
              <FolderUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">Belum Ada Dataset yang Dimuat</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
                Klik tombol <b>Masukkan Folder Dataset</b> di atas untuk memasukkan folder gambar plat kendaraan Anda untuk evaluasi akurasi serentak.
              </p>
            </Card>
          )}
        </>
      ) : (
        /* Training & ONNX Export Guide Tab */
        <Card className="p-6 space-y-5">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-muted-foreground" /> Panduan Training Dataset ke Web ONNX
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Jalankan langkah ini untuk melatih model AI YOLOv8 dengan dataset plat kendaraan Anda sendiri:
            </CardDescription>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/40 border border-border">
              <div className="w-6 h-6 rounded-md bg-secondary text-secondary-foreground font-bold flex items-center justify-center text-xs mb-2">
                1
              </div>
              <h4 className="text-xs font-semibold text-foreground mb-1">Labeling Dataset</h4>
              <p className="text-xs text-muted-foreground">
                Beri label kotak plat nomor pada dataset Anda (format YOLO).
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/40 border border-border">
              <div className="w-6 h-6 rounded-md bg-secondary text-secondary-foreground font-bold flex items-center justify-center text-xs mb-2">
                2
              </div>
              <h4 className="text-xs font-semibold text-foreground mb-1">Jalankan Training</h4>
              <p className="text-xs text-muted-foreground">
                Copy script Python di bawah dan jalankan untuk mengekspor ke file <code className="text-foreground">.onnx</code>.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/40 border border-border">
              <div className="w-6 h-6 rounded-md bg-secondary text-secondary-foreground font-bold flex items-center justify-center text-xs mb-2">
                3
              </div>
              <h4 className="text-xs font-semibold text-foreground mb-1">Letakkan di Next.js</h4>
              <p className="text-xs text-muted-foreground">
                Copy hasil export ke folder: <code className="text-foreground font-mono text-[11px]">public/models/plate_detector.onnx</code>
              </p>
            </div>
          </div>

          {/* Python Code Snippet Box */}
          <div className="rounded-lg bg-black/60 border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
              <span className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                <FileCode2 className="w-3.5 h-3.5" /> train_and_export_onnx.py
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopySnippet}
                className="h-7 text-xs gap-1.5"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Tersalin' : 'Copy Script'}
              </Button>
            </div>
            <pre className="p-4 text-xs font-mono text-muted-foreground overflow-x-auto leading-relaxed">
              {pythonTrainingSnippet}
            </pre>
          </div>
        </Card>
      )}
    </div>
  );
};
