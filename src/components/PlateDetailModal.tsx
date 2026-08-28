'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Layers,
  ShieldCheck,
  Package,
  Printer,
  User,
} from 'lucide-react';
import { DetectionResult, WhitelistRule } from '../lib/alpr/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative z-50 w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Detail Inspeksi Plat & Muatan</h3>
          </div>
          <div className="flex items-center gap-2">
            {onOpenGatePassSlip && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onClose();
                  onOpenGatePassSlip(result);
                }}
                className="h-8 text-xs gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Slip Masuk
              </Button>
            )}
            <Button
              variant="ghost"
              size="iconSm"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Sub-navigation tabs inside Modal */}
        <div className="flex border-b border-border bg-muted/10 px-5 pt-2">
          <button
            onClick={() => setActiveTab('ocr')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition cursor-pointer ${
              activeTab === 'ocr'
                ? 'border-primary text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Deteksi Plat & Citra OCR
          </button>
          <button
            onClick={() => setActiveTab('cargo')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'cargo'
                ? 'border-primary text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Manifes Muatan ({m?.items?.length || 0})</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Main Plate Display Box */}
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-center">
            <div className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground mb-1">
              INDONESIAN LICENSE PLATE
            </div>
            <div className="font-mono text-3xl font-black tracking-wider text-foreground select-all">
              {result.formattedPlate}
            </div>
            {result.expiryDate && (
              <div className="mt-1 text-xs font-mono font-medium text-muted-foreground">
                MASA BERLAKU: {result.expiryDate}
              </div>
            )}
          </div>

          {activeTab === 'ocr' ? (
            <>
              {/* Image Preprocessing Breakdown (Original vs Crop vs Enhanced) */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Pipeline Citra Preprocessing
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Cropped Original Plate */}
                  <div className="p-3 rounded-lg bg-muted/30 border border-border flex flex-col items-center">
                    <span className="text-[11px] text-muted-foreground mb-2">Potongan Citra (Crop)</span>
                    <div className="h-20 w-full flex items-center justify-center bg-black/40 rounded-md p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={result.plateCropImage}
                        alt="Plate crop"
                        className="max-h-full max-w-full object-contain rounded"
                      />
                    </div>
                  </div>

                  {/* Binarized Enhanced Image for OCR */}
                  <div className="p-3 rounded-lg bg-muted/30 border border-border flex flex-col items-center">
                    <span className="text-[11px] text-muted-foreground mb-2">Binarized & Filter</span>
                    <div className="h-20 w-full flex items-center justify-center bg-white rounded-md p-1">
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
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <span className="text-muted-foreground text-[11px]">Akurasi OCR:</span>
                  <div className="font-mono font-bold text-foreground text-sm mt-0.5">{result.confidence}%</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <span className="text-muted-foreground text-[11px]">Waktu Proses:</span>
                  <div className="font-mono font-bold text-foreground text-sm mt-0.5">{result.processingTimeMs} ms</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <span className="text-muted-foreground text-[11px]">Metode:</span>
                  <div className="font-mono font-bold text-foreground text-sm mt-0.5 uppercase">{result.method}</div>
                </div>
              </div>
            </>
          ) : (
            /* Cargo Manifest Breakdown */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-muted/30 p-4 rounded-lg border border-border">
                <div className="space-y-1">
                  <span className="text-muted-foreground text-[11px]">Pengemudi:</span>
                  <p className="font-semibold text-foreground text-sm flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    {m?.driverName || '-'}
                  </p>
                  <p className="text-muted-foreground text-[11px]">{m?.driverPhone || '-'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground text-[11px]">Perusahaan & Dokumen:</span>
                  <p className="font-semibold text-foreground">{m?.companyName || '-'}</p>
                  <p className="font-mono text-muted-foreground text-[11px]">{m?.documentNumber || '-'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground text-[11px]">Status Muatan:</span>
                  <p className="font-medium text-foreground">{m?.loadStatus || 'Kosong'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground text-[11px]">Tujuan Bongkar:</span>
                  <p className="font-medium text-foreground">{m?.destination || '-'}</p>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h5 className="text-xs font-semibold text-foreground mb-2">Daftar Muatan ({m?.items?.length || 0} Item):</h5>
                {m?.items && m.items.length > 0 ? (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-[10px]">
                          <TableHead className="h-7 py-1 px-3">Nama Barang</TableHead>
                          <TableHead className="h-7 py-1 px-3">Kategori</TableHead>
                          <TableHead className="h-7 py-1 px-3 text-center">Jumlah</TableHead>
                          <TableHead className="h-7 py-1 px-3 text-right">Est. Berat</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {m.items.map((it) => (
                          <TableRow key={it.id} className="text-[11px]">
                            <TableCell className="py-1.5 px-3 font-medium">{it.name}</TableCell>
                            <TableCell className="py-1.5 px-3 text-muted-foreground">{it.category}</TableCell>
                            <TableCell className="py-1.5 px-3 text-center font-mono font-semibold">
                              {it.quantity} {it.unit}
                            </TableCell>
                            <TableCell className="py-1.5 px-3 text-right font-mono">
                              {it.weightKg ? `${it.weightKg} Kg` : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic p-3 bg-muted/20 rounded-lg border border-border text-center">
                    Tidak ada rincian barang muatan individual yang dicatat.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quick Access Assignment */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <h4 className="text-xs font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" /> Ubah Status Hak Akses Gerbang:
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onUpdateStatus(result.formattedPlate, 'vip', m?.driverName || 'Pemilik VIP', 'Akses Prioritas');
                  onClose();
                }}
                className="text-xs gap-1.5 h-8 border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Jadikan VIP
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onUpdateStatus(result.formattedPlate, 'registered', m?.driverName || 'Pengemudi Terdaftar', 'Akses Reguler');
                  onClose();
                }}
                className="text-xs gap-1.5 h-8 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Terdaftar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onUpdateStatus(result.formattedPlate, 'blacklist', m?.driverName || 'Dilarang Masuk', 'Diblokir oleh operator');
                  onClose();
                }}
                className="text-xs gap-1.5 h-8 border-destructive/50 text-destructive-foreground hover:bg-destructive/10"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400" /> Blacklist
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
