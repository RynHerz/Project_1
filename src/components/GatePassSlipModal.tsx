'use client';

import React, { useRef } from 'react';
import {
  X,
  Printer,
  ShieldCheck,
  CheckCircle2,
  QrCode,
} from 'lucide-react';
import { DetectionResult, VehicleCargoManifest } from '../lib/alpr/types';
import { Button } from '@/components/ui/button';

interface GatePassSlipModalProps {
  result: DetectionResult | null;
  manifest?: VehicleCargoManifest | null;
  onClose: () => void;
}

export const GatePassSlipModal: React.FC<GatePassSlipModalProps> = ({
  result,
  manifest: explicitManifest,
  onClose,
}) => {
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  if (!result && !explicitManifest) return null;

  const manifest = explicitManifest || result?.cargoManifest || {
    driverName: 'Pengemudi / Sopir',
    driverPhone: '-',
    companyName: '-',
    destination: 'Gudang Utama',
    documentNumber: 'SJ-2026-XXXX',
    cargoCategory: 'Logistik Umum',
    loadStatus: 'Penuh (Full Load)',
    totalWeightKg: 0,
    totalItemsCount: 0,
    sealNumber: '',
    inspectionStatus: 'Sesuai (Approved)',
    inspectorNotes: 'Pemeriksaan standar.',
    items: [],
    updatedAt: Date.now(),
  };

  const plateNumber = result?.formattedPlate || 'B 1234 ABC';
  const timestamp = result?.timestamp || Date.now();
  const expiryDate = result?.expiryDate || '08.28';
  const vehicleType = result?.vehicleType || 'Mobil / Truk';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative z-50 w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
        {/* Modal Top Actions (Hidden in Print) */}
        <div className="print:hidden flex items-center justify-between p-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Slip Izin Masuk & Manifes</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak / PDF
            </Button>
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

        {/* Printable Pass Area */}
        <div
          ref={printAreaRef}
          className="p-6 overflow-y-auto bg-white text-slate-900 font-sans print:p-0 print:m-0"
        >
          {/* Slip Header */}
          <div className="border-b-2 border-dashed border-slate-300 pb-4 text-center">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <span className="font-mono text-[11px] font-bold tracking-widest text-slate-700 uppercase">
                  POS PEMERIKSAAN GERBANG
                </span>
                <h1 className="text-base font-bold tracking-tight text-slate-950">
                  SURAT IZIN MASUK & MANIFEST
                </h1>
                <p className="text-[10px] text-slate-500 font-mono">
                  SISTEM DETEKSI ALPR VISION • AI VERIFIED
                </p>
              </div>

              {/* Pseudo QR Code */}
              <div className="w-14 h-14 border border-slate-900 rounded p-1 flex flex-col items-center justify-center bg-slate-50">
                <QrCode className="w-8 h-8 text-slate-900" />
                <span className="text-[6px] font-mono font-bold tracking-tighter">VERIFIED</span>
              </div>
            </div>

            {/* Barcode representation */}
            <div className="mt-2 flex flex-col items-center">
              <div className="h-5 w-48 flex items-center justify-center gap-1">
                {[...Array(30)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-full bg-slate-900 ${
                      i % 3 === 0 ? 'w-1' : i % 2 === 0 ? 'w-0.5' : 'w-1.5'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[8px] font-mono font-medium tracking-widest text-slate-600 mt-0.5">
                *{manifest.documentNumber || `GP-${Date.now()}`}*
              </span>
            </div>
          </div>

          {/* Vehicle & Plate Highlight */}
          <div className="my-3 p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                NOMOR PLAT KENDARAAN
              </span>
              <div className="font-mono text-2xl font-black text-slate-950 tracking-wider">
                {plateNumber}
              </div>
              <div className="text-[10px] font-medium text-slate-600">
                Jenis: <span className="font-semibold text-slate-900">{vehicleType}</span> • Masa Berlaku: {expiryDate}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                STATUS GERBANG
              </span>
              <div className="mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3" /> {manifest.inspectionStatus || 'Approved'}
              </div>
              <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                {new Date(timestamp).toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          {/* Details 2-Column Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs mb-3">
            <div className="space-y-1 border-r border-slate-200 pr-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Sopir:</span>
                <span className="font-semibold text-slate-900">{manifest.driverName || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">No. HP:</span>
                <span className="font-mono text-slate-800">{manifest.driverPhone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vendor:</span>
                <span className="font-semibold text-slate-900">{manifest.companyName || '-'}</span>
              </div>
            </div>

            <div className="space-y-1 pl-1">
              <div className="flex justify-between">
                <span className="text-slate-500">No. Surat Jalan:</span>
                <span className="font-mono font-semibold text-slate-900">{manifest.documentNumber || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tujuan:</span>
                <span className="font-semibold text-slate-900">{manifest.destination || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kapasitas:</span>
                <span className="font-semibold text-slate-900">{manifest.loadStatus}</span>
              </div>
              {manifest.sealNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Segel:</span>
                  <span className="font-mono font-semibold text-slate-800">{manifest.sealNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Manifest Items Table */}
          <div className="mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
              <span>Rincian Barang Muatan:</span>
              <span className="font-mono font-normal text-[9px]">
                Total: <b>{manifest.totalItemsCount || 0} Unit</b> ({manifest.totalWeightKg ? `${manifest.totalWeightKg} Kg` : '0 Kg'})
              </span>
            </div>
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="py-1 px-2">No</th>
                  <th className="py-1 px-2">Deskripsi Barang</th>
                  <th className="py-1 px-2">Kategori</th>
                  <th className="py-1 px-2 text-center">Jumlah</th>
                  <th className="py-1 px-2 text-right">Est. Berat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                {manifest.items && manifest.items.length > 0 ? (
                  manifest.items.map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="py-1 px-2 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-1 px-2 font-semibold text-slate-900">
                        {it.name}
                        {it.notes && <span className="block text-[9px] font-normal text-slate-500">{it.notes}</span>}
                      </td>
                      <td className="py-1 px-2 text-[10px] text-slate-600">{it.category}</td>
                      <td className="py-1 px-2 text-center font-mono font-semibold text-slate-800">
                        {it.quantity} {it.unit}
                      </td>
                      <td className="py-1 px-2 text-right font-mono text-slate-800">
                        {it.weightKg ? `${it.weightKg} Kg` : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-2 px-2 text-center text-slate-500 italic text-[10px]">
                      Tidak ada muatan barang komersial (Kendaraan Kosong / Barang Pribadi)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Notes & Signatures */}
          {manifest.inspectorNotes && (
            <div className="p-2 mb-3 rounded bg-slate-50 border border-slate-200 text-[10px] text-slate-700">
              <b>Catatan Petugas:</b> {manifest.inspectorNotes}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-600">
            <div>
              <p>Pengemudi / Pembawa</p>
              <div className="h-10 flex items-end justify-center font-semibold text-slate-900 underline">
                ( {manifest.driverName || '....................'} )
              </div>
            </div>
            <div>
              <p>Petugas Gerbang Masuk</p>
              <div className="h-10 flex items-end justify-center font-semibold text-slate-900 underline">
                ( Petugas Security )
              </div>
            </div>
            <div>
              <p>Penerima / Gudang</p>
              <div className="h-10 flex items-end justify-center font-semibold text-slate-900 underline">
                ( .................... )
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
