'use client';

import React, { useState, useRef } from 'react';
import {
  FolderUp,
  Play,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Layers,
  FileCode2,
  Copy,
  Check,
  BarChart3,
  HelpCircle,
} from 'lucide-react';
import { DatasetItem, DatasetEvaluationReport, DetectionResult, WhitelistRule } from '../lib/alpr/types';
import { runAlprPipeline } from '../lib/alpr/pipeline';

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
        // Load image into HTMLImageElement
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

        // Check if ground truth matches
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

# 1. Install Ultralytics YOLO
!pip install ultralytics onnx

import os
from ultralytics import YOLO

# 2. Siapkan dataset.yaml yang mengarah ke folder gambar plat Anda
yaml_config = """
path: ./dataset_plat
train: images/train
val: images/val
names:
  0: license_plate
"""
with open('data.yaml', 'w') as f:
    f.write(yaml_config)

# 3. Train model YOLOv8 Nano (ringan & cepat untuk browser WebAssembly)
model = YOLO('yolov8n.pt')
results = model.train(
    data='data.yaml',
    epochs=50,
    imgsz=640,
    batch=16,
    device='0' # atau 'cpu'
)

# 4. Export bobot model ke format ONNX untuk Next.js
success = model.export(format='onnx', imgsz=640, opset=12)
print("Model berhasil diekspor! File tersimpan di: runs/detect/train/weights/best.onnx")

# 5. Langkah Terakhir:
# Copy file 'best.onnx' ke folder project Next.js Anda di:
# -> public/models/plate_detector.onnx
`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(pythonTrainingSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Sub Tab Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('tester')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'tester'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 Evaluator & Tester Dataset
          </button>
          <button
            onClick={() => setActiveSubTab('training_guide')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'training_guide'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            🧠 Panduan Training & Export ONNX
          </button>
        </div>

        {items.length > 0 && activeSubTab === 'tester' && (
          <button
            onClick={exportReportToCsv}
            disabled={processedCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" /> Export Laporan CSV
          </button>
        )}
      </div>

      {activeSubTab === 'tester' ? (
        <>
          {/* Top Actions: Upload Folder & Run Batch */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Input Dropzone Area */}
            <div className="md:col-span-8 flex flex-wrap items-center gap-3">
              {/* Select Folder Button */}
              <button
                onClick={() => folderInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/25 transition"
              >
                <FolderUp className="w-4 h-4" /> Masukkan Folder Dataset
              </button>

              {/* Select Multiple Files */}
              <button
                onClick={() => filesInputRef.current?.click()}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700 transition"
              >
                <Layers className="w-4 h-4 text-cyan-400" /> Pilih Banyak File Gambar
              </button>

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
                <span className="text-xs text-slate-400">
                  Total <span className="font-bold text-white">{items.length}</span> gambar dimuat
                </span>
              )}
            </div>

            {/* Run Batch Evaluation Button */}
            <div className="md:col-span-4 flex justify-end">
              <button
                onClick={runBatchEvaluation}
                disabled={items.length === 0 || isEvaluating}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition"
              >
                <Play className="w-4 h-4 fill-current" />
                {isEvaluating ? 'Sedang Mengevaluasi...' : 'Jalankan Pengujian Batch'}
              </button>
            </div>
          </div>

          {/* Progress Bar when Evaluating */}
          {isEvaluating && (
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-lg">
              <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-2">
                <span>Memproses dataset di browser (Client-side AI)...</span>
                <span className="font-mono text-cyan-400">{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Accuracy & Performance Summary Cards */}
          {items.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Total Gambar</span>
                <div className="text-2xl font-black text-white mt-1 font-mono">{items.length}</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Selesai Diuji</span>
                <div className="text-2xl font-black text-cyan-400 mt-1 font-mono">
                  {processedCount} <span className="text-xs font-normal text-slate-500">/ {items.length}</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Akurasi Pembacaan</span>
                <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">{accuracyRate}%</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Rata-rata Confidence</span>
                <div className="text-2xl font-black text-indigo-400 mt-1 font-mono">{avgConfidence}%</div>
              </div>
            </div>
          )}

          {/* Dataset Table */}
          {items.length > 0 ? (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
              {/* Table Filter Tabs */}
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      filterStatus === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Semua ({items.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('match')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      filterStatus === 'match'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Sesuai ({correctCount})
                  </button>
                  <button
                    onClick={() => setFilterStatus('mismatch')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      filterStatus === 'mismatch'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Perlu Koreksi ({processedCount - correctCount})
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="sticky top-0 bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Preview</th>
                      <th className="py-3 px-4">Nama File</th>
                      <th className="py-3 px-4">Ground Truth Target</th>
                      <th className="py-3 px-4">Hasil Deteksi OCR</th>
                      <th className="py-3 px-4">Confidence</th>
                      <th className="py-3 px-4">Waktu</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2 px-4">
                          <div className="w-12 h-8 rounded bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.imageUrl} alt={item.fileName} className="w-full h-full object-cover" />
                          </div>
                        </td>
                        <td className="py-2 px-4 font-mono text-slate-300 max-w-[150px] truncate">{item.fileName}</td>
                        <td className="py-2 px-4 font-mono font-bold text-slate-200">{item.groundTruth || '-'}</td>
                        <td className="py-2 px-4 font-mono font-bold text-cyan-400">{item.detectedPlate || '-'}</td>
                        <td className="py-2 px-4 font-mono">
                          {item.confidence !== undefined ? `${item.confidence}%` : '-'}
                        </td>
                        <td className="py-2 px-4 font-mono text-slate-400">
                          {item.processingTimeMs !== undefined ? `${item.processingTimeMs} ms` : '-'}
                        </td>
                        <td className="py-2 px-4">
                          {item.status === 'processing' ? (
                            <span className="text-cyan-400 font-medium animate-pulse">Memproses...</span>
                          ) : item.isCorrect === true ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Sesuai
                            </span>
                          ) : item.status === 'success' ? (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                              <XCircle className="w-3.5 h-3.5" /> Berbeda
                            </span>
                          ) : item.status === 'failed' ? (
                            <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                              <XCircle className="w-3.5 h-3.5" /> Gagal
                            </span>
                          ) : (
                            <span className="text-slate-500">Menunggu</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
              <FolderUp className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white mb-1">Belum Ada Dataset yang Dimuat</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                Klik tombol <b>Masukkan Folder Dataset</b> di atas untuk memasukkan folder gambar plat kendaraan Anda.
                Sistem akan otomatis mengenali nama file dan menguji akurasi secara serentak.
              </p>
            </div>
          )}
        </>
      ) : (
        /* Training & ONNX Export Guide Tab */
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col gap-5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCode2 className="w-5 h-5 text-cyan-400" /> Panduan Training Dataset ke Web-Ready ONNX
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Jika Anda ingin melatih model AI YOLOv8 dengan dataset plat kendaraan Anda sendiri dan menjalankannya 100% di browser tanpa server, ikuti langkah mudah berikut:
            </p>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 font-bold flex items-center justify-center text-xs mb-3">
                1
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">Labeling Dataset</h4>
              <p className="text-xs text-slate-400">
                Beri label kotak plat nomor pada dataset Anda (misal menggunakan Roboflow atau LabelImg format YOLO).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 font-bold flex items-center justify-center text-xs mb-3">
                2
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">Jalankan Script Training</h4>
              <p className="text-xs text-slate-400">
                Copy script Python di bawah ke Google Colab / PC Anda dan jalankan untuk mengekspor ke file <code className="text-cyan-300">.onnx</code>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 font-bold flex items-center justify-center text-xs mb-3">
                3
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">Masukkan ke Folder Next.js</h4>
              <p className="text-xs text-slate-400">
                Letakkan hasil export <code className="text-cyan-300">best.onnx</code> ke dalam folder:
                <br />
                <code className="text-emerald-400 font-mono text-[11px]">public/models/plate_detector.onnx</code>
              </p>
            </div>
          </div>

          {/* Python Code Snippet Box */}
          <div className="relative rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
              <span className="text-xs font-mono text-slate-300 flex items-center gap-2">
                <FileCode2 className="w-3.5 h-3.5 text-cyan-400" /> train_and_export_onnx.py
              </span>
              <button
                onClick={handleCopySnippet}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Tersalin!' : 'Copy Script'}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-cyan-300/90 overflow-x-auto leading-relaxed">
              {pythonTrainingSnippet}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
