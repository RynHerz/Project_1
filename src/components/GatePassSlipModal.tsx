'use client';

import React, { useRef } from 'react';
import {
  X,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Calendar,
  Clock,
  User,
  Truck,
  FileText,
  MapPin,
  Building,
  Package,
} from 'lucide-react';
import { DetectionResult, VehicleCargoManifest } from '../lib/alpr/types';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Actions (Hidden in Print) */}
        <div className="print:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Slip Izin Masuk Gerbang & Manifest Muatan</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Cetak Slip / Simpan PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Pass Area */}
        <div
          ref={printAreaRef}
          className="p-6 overflow-y-auto bg-white text-slate-900 font-sans print:p-0 print:m-0"
        >
          {/* Slip Header */}
          <div className="border-b-2 border-dashed border-slate-400 pb-4 text-center">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <span className="font-mono text-xs font-black tracking-widest text-blue-800 uppercase">
                  POS PEMERIKSAAN & LOGISTIK GERBANG
                </span>
                <h1 className="text-lg font-black tracking-tight text-slate-950">
                  SURAT IZIN MASUK & MANIFEST BARANG
                </h1>
                <p className="text-[10px] text-slate-500 font-mono">
                  SISTEM DETEKSI ALPR VISION • AI VERIFIED
                </p>
              </div>

              {/* Pseudo QR Code */}
              <div className="w-16 h-16 border-2 border-slate-950 rounded-lg p-1 flex flex-col items-center justify-center bg-slate-50">
                <QrCode className="w-10 h-10 text-slate-900" />
                <span className="text-[7px] font-mono font-bold tracking-tighter">VERIFIED</span>
              </div>
            </div>

            {/* Barcode representation */}
            <div className="mt-3 flex flex-col items-center">
              <div className="h-6 w-56 flex items-center justify-center gap-1">
                {[...Array(35)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-full bg-slate-900 ${
                      i % 3 === 0 ? 'w-1' : i % 2 === 0 ? 'w-0.5' : 'w-1.5'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[9px] font-mono font-semibold tracking-widest text-slate-600 mt-0.5">
                *{manifest.documentNumber || `GP-${Date.now()}`}*
              </span>
            </div>
          </div>

          {/* Vehicle & Plate Highlight */}
          <div className="my-4 p-3 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                NOMOR PLAT KENDARAAN
              </span>
              <div className="font-mono text-2xl sm:text-3xl font-black text-slate-950 tracking-wider">
                {plateNumber}
              </div>
              <div className="text-[11px] font-semibold text-slate-600">
                Jenis: <span className="text-blue-700">{vehicleType}</span> • Pajak: {expiryDate}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                STATUS IZIN GERBANG
              </span>
              <div className="mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> {manifest.inspectionStatus || 'Approved'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                {new Date(timestamp).toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          {/* Details 2-Column Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs mb-4">
            <div className="space-y-1.5 border-r border-slate-200 pr-3">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Nama Pengemudi:</span>
                <span className="font-bold text-slate-900">{manifest.driverName || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">No. Telepon / HP:</span>
                <span className="font-mono text-slate-800">{manifest.driverPhone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Perusahaan / Vendor:</span>
                <span className="font-semibold text-slate-900">{manifest.companyName || '-'}</span>
              </div>
            </div>

            <div className="space-y-1.5 pl-1">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">No. Dokumen / DO:</span>
                <span className="font-mono font-bold text-blue-700">{manifest.documentNumber || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Tujuan / Lokasi:</span>
                <span className="font-semibold text-slate-900">{manifest.destination || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Status Muatan:</span>
                <span className="font-semibold text-slate-900">{manifest.loadStatus}</span>
              </div>
              {manifest.sealNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">No. Segel:</span>
                  <span className="font-mono font-bold text-slate-800">{manifest.sealNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Manifest Items Table */}
          <div className="mb-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Rincian Barang Bawaan / Muatan:</span>
              <span className="font-mono font-normal text-[10px]">
                Total: <b>{manifest.totalItemsCount || 0} Unit/Koli</b> ({manifest.totalWeightKg ? `${manifest.totalWeightKg} Kg` : '0 Kg'})
              </span>
            </div>
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300">
                <tr>
                  <th className="py-1 px-2">No</th>
                  <th className="py-1 px-2">Deskripsi Barang</th>
                  <th className="py-1 px-2">Kategori</th>
                  <th className="py-1 px-2 text-center">Jumlah</th>
                  <th className="py-1 px-2 text-right">Est. Berat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {manifest.items && manifest.items.length > 0 ? (
                  manifest.items.map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="py-1 px-2 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-1 px-2 font-semibold text-slate-900">
                        {it.name}
                        {it.notes && <span className="block text-[10px] font-normal text-slate-500">{it.notes}</span>}
                      </td>
                      <td className="py-1 px-2 text-[10px] text-slate-600">{it.category}</td>
                      <td className="py-1 px-2 text-center font-mono font-bold text-slate-800">
                        {it.quantity} {it.unit}
                      </td>
                      <td className="py-1 px-2 text-right font-mono text-slate-800">
                        {it.weightKg ? `${it.weightKg} Kg` : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-2 px-2 text-center text-slate-500 italic">
                      Tidak ada muatan barang komersial (Kendaraan Kosong / Barang Pribadi)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Notes & Signatures */}
          {manifest.inspectorNotes && (
            <div className="p-2 mb-4 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
              <b>Catatan Petugas:</b> {manifest.inspectorNotes}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-300 text-center text-[10px] text-slate-600">
            <div>
              <p>Pengemudi / Pembawa</p>
              <div className="h-12 flex items-end justify-center font-bold text-slate-900 underline">
                ( {manifest.driverName || '....................'} )
              </div>
            </div>
            <div>
              <p>Petugas Gerbang Masuk</p>
              <div className="h-12 flex items-end justify-center font-bold text-slate-900 underline">
                ( Petugas Security )
              </div>
            </div>
            <div>
              <p>Penerima / Gudang</p>
              <div className="h-12 flex items-end justify-center font-bold text-slate-900 underline">
                ( .................... )
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
