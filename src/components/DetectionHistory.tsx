'use client';

import React, { useState } from 'react';
import {
  History,
  Search,
  Download,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Car,
  Package,
  Printer,
  FileText,
  User,
} from 'lucide-react';
import { DetectionResult } from '../lib/alpr/types';

interface DetectionHistoryProps {
  history: DetectionResult[];
  onClearHistory: () => void;
  onOpenPlateDetail: (result: DetectionResult) => void;
  onOpenGatePassSlip?: (result: DetectionResult) => void;
}

export const DetectionHistory: React.FC<DetectionHistoryProps> = ({
  history,
  onClearHistory,
  onOpenPlateDetail,
  onOpenGatePassSlip,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter history items
  const filteredHistory = history.filter((item) => {
    const manifest = item.cargoManifest;
    const matchesSearch =
      item.formattedPlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.vehicleType && item.vehicleType.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (manifest?.driverName && manifest.driverName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (manifest?.documentNumber && manifest.documentNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (manifest?.companyName && manifest.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (manifest?.items &&
        manifest.items.some((it) => it.name.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesStatus = statusFilter === 'all' ? true : item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Export to CSV with Cargo details
  const exportToCsv = () => {
    if (history.length === 0) return;

    const headers = [
      'No',
      'Waktu',
      'Plat Nomor',
      'Masa Berlaku',
      'Confidence (%)',
      'Status Akses Gerbang',
      'Jenis Kendaraan',
      'Nama Pengemudi',
      'No Surat Jalan',
      'Perusahaan/Ekspedisi',
      'Status Muatan',
      'Total Berat (Kg)',
      'Daftar Barang',
      'Catatan Petugas',
    ];

    const rows = history.map((item, idx) => {
      const m = item.cargoManifest;
      const goodsList = m?.items
        ? m.items.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join('; ')
        : '-';

      return [
        idx + 1,
        new Date(item.timestamp).toLocaleString('id-ID'),
        item.formattedPlate,
        item.expiryDate || '-',
        item.confidence,
        item.status.toUpperCase(),
        item.vehicleType || 'Mobil',
        m?.driverName || '-',
        m?.documentNumber || '-',
        m?.companyName || '-',
        m?.loadStatus || 'Kosong',
        m?.totalWeightKg || 0,
        goodsList,
        m?.inspectorNotes || item.notes || '-',
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join(
      '\n'
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `riwayat_pemeriksaan_kendaraan_muatan_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden flex flex-col">
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" /> Log Riwayat Deteksi & Pemeriksaan Kendaraan
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Total tercatat: <span className="font-semibold text-white">{history.length}</span> kendaraan
          </p>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <>
              <button
                onClick={exportToCsv}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer shadow-sm"
                title="Download Riwayat & Manifes ke Excel / CSV"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Export Excel / CSV</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Yakin ingin menghapus seluruh riwayat pemeriksaan?')) {
                    onClearHistory();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold border border-rose-500/30 transition cursor-pointer"
                title="Hapus Semua Riwayat"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Hapus Semua</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Search Box */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari plat, pengemudi, barang, surat jalan..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-500 mr-1" />
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setStatusFilter('registered')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              statusFilter === 'registered'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Terdaftar
          </button>
          <button
            onClick={() => setStatusFilter('vip')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              statusFilter === 'vip'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            VIP
          </button>
          <button
            onClick={() => setStatusFilter('blacklist')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              statusFilter === 'blacklist'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Blacklist
          </button>
        </div>
      </div>

      {/* History Table */}
      {filteredHistory.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Thumbnail</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Plat Nomor</th>
                <th className="py-3 px-4">Pengemudi & Manifes</th>
                <th className="py-3 px-4">Status Muatan</th>
                <th className="py-3 px-4">Status Gerbang</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredHistory.map((item) => {
                const m = item.cargoManifest;

                return (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    {/* Thumbnail */}
                    <td className="py-2.5 px-4">
                      <div className="w-14 h-9 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center p-0.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.plateCropImage || item.sourceImage}
                          alt={item.formattedPlate}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td className="py-2.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {new Date(item.timestamp).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(item.timestamp).toLocaleDateString('id-ID')}
                      </div>
                    </td>

                    {/* Plate Number */}
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="font-mono text-sm font-black tracking-wider text-white">
                        {item.formattedPlate}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Car className="w-3 h-3" /> {item.vehicleType || 'Mobil'}
                      </div>
                    </td>

                    {/* Driver & Cargo summary */}
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-200 flex items-center gap-1">
                        <User className="w-3 h-3 text-cyan-400" />
                        {m?.driverName || 'Belum diisi'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">
                        {m?.items && m.items.length > 0
                          ? `${m.items.length} item: ${m.items.map((i) => i.name).slice(0, 2).join(', ')}${m.items.length > 2 ? '...' : ''}`
                          : item.notes || '-'}
                      </div>
                    </td>

                    {/* Load Status */}
                    <td className="py-2.5 px-4 whitespace-nowrap font-mono">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          m?.loadStatus?.includes('Penuh')
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : m?.loadStatus?.includes('B3')
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {m?.loadStatus || 'Kosong'}
                      </span>
                      {m?.totalWeightKg ? (
                        <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
                          {m.totalWeightKg.toLocaleString()} Kg
                        </div>
                      ) : null}
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {item.status === 'vip' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <CheckCircle2 className="w-3 h-3" /> VIP
                        </span>
                      ) : item.status === 'registered' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> DIIZINKAN
                        </span>
                      ) : item.status === 'blacklist' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <XCircle className="w-3 h-3" /> BLACKLIST
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          TAMU
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {onOpenGatePassSlip && (
                          <button
                            onClick={() => onOpenGatePassSlip(item)}
                            className="p-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 transition cursor-pointer"
                            title="Cetak Slip Izin Masuk"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onOpenPlateDetail(item)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Lihat Detail Lengkap"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-12 text-center text-slate-500">
          <History className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400">Belum ada riwayat deteksi</p>
          <p className="text-xs text-slate-500 mt-1">
            Gunakan tab Inspeksi & Deteksi untuk memeriksa kendaraan dan mencatat muatan.
          </p>
        </div>
      )}
    </div>
  );
};
