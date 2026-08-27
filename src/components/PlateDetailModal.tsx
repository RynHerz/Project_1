'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Layers,
  ShieldCheck,
  Tag,
  Package,
  Printer,
  User,
  Building,
  FileText,
} from 'lucide-react';
import { DetectionResult, WhitelistRule } from '../lib/alpr/types';

interface PlateDetailModalProps {
  result: DetectionResult | null;
  onClose: () => void;
  onUpdateStatus: (
    plateNumber: string,
    status: WhitelistRule['status'],
    ownerName: string,
    notes?: string
  ) => void;
  onOpenGatePassSlip?: (result: DetectionResult) => void;
}

export const PlateDetailModal: React.FC<PlateDetailModalProps> = ({
  result,
  onClose,
  onUpdateStatus,
  onOpenGatePassSlip,
}) => {
  const [activeTab, setActiveTab] = useState<'ocr' | 'cargo'>('ocr');

  if (!result) return null;

  const m = result.cargoManifest;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Detail Inspeksi Kendaraan & Plat</h3>
          </div>
          <div className="flex items-center gap-2">
            {onOpenGatePassSlip && (
              <button
                onClick={() => {
                  onClose();
                  onOpenGatePassSlip(result);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Slip Izin Masuk
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-navigation tabs inside Modal */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 pt-2">
          <button
            onClick={() => setActiveTab('ocr')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'ocr'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Deteksi Plat & Citra OCR
          </button>
          <button
            onClick={() => setActiveTab('cargo')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'cargo'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Manifes Muatan ({m?.items?.length || 0} Item)</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Main Plate Display Box */}
          <div className="relative rounded-2xl border-4 border-slate-950 bg-slate-950 p-4 text-center shadow-inner">
            <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500 mb-1">
              INDONESIAN LICENSE PLATE
            </div>
            <div className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-white select-all">
              {result.formattedPlate}
            </div>
            {result.expiryDate && (
              <div className="mt-1 text-xs font-mono font-bold text-slate-400 tracking-widest">
                MASA BERLAKU: {result.expiryDate}
              </div>
            )}
          </div>

          {activeTab === 'ocr' ? (
            <>
              {/* Image Preprocessing Breakdown (Original vs Crop vs Enhanced) */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Pipeline Citra & Preprocessing
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Cropped Original Plate */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center">
                    <span className="text-[11px] text-slate-400 mb-2 font-medium">Potongan Asli (RGB)</span>
                    <div className="h-24 w-full flex items-center justify-center bg-slate-900/50 rounded-lg p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={result.plateCropImage}
                        alt="Plate crop"
                        className="max-h-full max-w-full object-contain rounded"
                      />
                    </div>
                  </div>

                  {/* Binarized Enhanced Image for OCR */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center">
                    <span className="text-[11px] text-slate-400 mb-2 font-medium">Binarized & Auto-Contrast</span>
                    <div className="h-24 w-full flex items-center justify-center bg-white rounded-lg p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={result.enhancedPlateImage || result.plateCropImage}
                        alt="Enhanced"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[11px]">Tingkat Confidence:</span>
                  <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">{result.confidence}%</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[11px]">Waktu Proses:</span>
                  <div className="font-mono font-bold text-slate-200 text-sm mt-0.5">{result.processingTimeMs} ms</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[11px]">Metode Deteksi:</span>
                  <div className="font-mono font-bold text-cyan-400 text-sm mt-0.5 uppercase">{result.method}</div>
                </div>
              </div>
            </>
          ) : (
            /* Cargo Manifest Breakdown */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="space-y-1">
                  <span className="text-slate-500 text-[11px]">Pengemudi:</span>
                  <p className="font-bold text-white text-sm flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    {m?.driverName || '-'}
                  </p>
                  <p className="text-slate-400 text-[11px]">{m?.driverPhone || 'Tidak ada no. telp'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 text-[11px]">Perusahaan & Dokumen:</span>
                  <p className="font-bold text-slate-200">{m?.companyName || '-'}</p>
                  <p className="font-mono text-cyan-400 text-[11px]">{m?.documentNumber || '-'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 text-[11px]">Status Muatan:</span>
                  <p className="font-semibold text-emerald-400">{m?.loadStatus || 'Kosong'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 text-[11px]">Tujuan Bongkar:</span>
                  <p className="font-semibold text-slate-300">{m?.destination || '-'}</p>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h5 className="text-xs font-bold text-slate-300 mb-2">Daftar Barang Bawaan ({m?.items?.length || 0} Item):</h5>
                {m?.items && m.items.length > 0 ? (
                  <div className="rounded-xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">Nama Barang</th>
                          <th className="py-2 px-3">Kategori</th>
                          <th className="py-2 px-3 text-center">Jumlah</th>
                          <th className="py-2 px-3 text-right">Est. Berat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                        {m.items.map((it) => (
                          <tr key={it.id}>
                            <td className="py-2 px-3 font-semibold text-white">{it.name}</td>
                            <td className="py-2 px-3 text-[11px] text-slate-400">{it.category}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-cyan-300">
                              {it.quantity} {it.unit}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-400">
                              {it.weightKg ? `${it.weightKg} Kg` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                    Tidak ada rincian barang muatan komersial yang tercatat.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quick Access Assignment */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" /> Tetapkan Status Izin Masuk Plat Ini:
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  onUpdateStatus(result.formattedPlate, 'vip', m?.driverName || 'Pemilik VIP', 'Akses Prioritas');
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Jadikan VIP
              </button>
              <button
                onClick={() => {
                  onUpdateStatus(result.formattedPlate, 'registered', m?.driverName || 'Pengemudi Terdaftar', 'Akses Reguler');
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Izinkan (Terdaftar)
              </button>
              <button
                onClick={() => {
                  onUpdateStatus(result.formattedPlate, 'blacklist', m?.driverName || 'Dilarang Masuk', 'Diblokir oleh operator');
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" /> Masukkan Blacklist
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
