'use client';

import React, { useState } from 'react';
import {
  Package,
  Truck,
  Scale,
  Search,
  Filter,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Building,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { DetectionResult, VehicleCargoManifest } from '../lib/alpr/types';

interface CargoManifestDashboardProps {
  history: DetectionResult[];
  onOpenGatePassSlip: (result: DetectionResult) => void;
  onOpenPlateDetail: (result: DetectionResult) => void;
}

export const CargoManifestDashboard: React.FC<CargoManifestDashboardProps> = ({
  history,
  onOpenGatePassSlip,
  onOpenPlateDetail,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loadFilter, setLoadFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter history records with manifests or all detected vehicles
  const vehiclesWithCargo = history.filter((item) => {
    const manifest = item.cargoManifest;
    const matchesSearch =
      item.formattedPlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (manifest?.driverName && manifest.driverName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (manifest?.companyName && manifest.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (manifest?.documentNumber && manifest.documentNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (manifest?.items &&
        manifest.items.some((it) => it.name.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesLoad =
      loadFilter === 'all'
        ? true
        : manifest?.loadStatus.toLowerCase().includes(loadFilter.toLowerCase());

    return matchesSearch && matchesLoad;
  });

  // Calculate high-level logistics stats
  const totalVehicles = history.length;
  const totalWeightTon = (
    history.reduce((acc, it) => acc + (it.cargoManifest?.totalWeightKg || 0), 0) / 1000
  ).toFixed(1);
  const fullLoads = history.filter((it) =>
    it.cargoManifest?.loadStatus.includes('Penuh')
  ).length;
  const b3Loads = history.filter((it) =>
    it.cargoManifest?.loadStatus.includes('B3')
  ).length;
  const approvedVehicles = history.filter(
    (it) => it.cargoManifest?.inspectionStatus?.includes('Approved') || it.cargoManifest?.inspectionStatus?.includes('Sesuai')
  ).length;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Kendaraan Masuk</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{totalVehicles}</span>
            <span className="text-[11px] text-cyan-400 font-medium">Unit Armada</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>{approvedVehicles} terverifikasi lolos</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Berat Muatan</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{totalWeightTon}</span>
            <span className="text-[11px] text-emerald-400 font-medium">Ton Logistik</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">Akumulasi seluruh kargo tercatat</div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Muatan Penuh (Full Load)</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{fullLoads}</span>
            <span className="text-[11px] text-blue-400 font-medium">Armada Penuh</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">Distribusi logistik partai besar</div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Muatan B3 / Khusus</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-300 font-mono">{b3Loads}</span>
            <span className="text-[11px] text-amber-400 font-medium">Protokol Keamanan</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">Memerlukan SOP khusus</div>
        </div>
      </div>

      {/* Main Manifest Table & Search */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-cyan-400" /> Daftar Manifest Muatan & Barang Kendaraan
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Rincian barang bawaan dari setiap armada yang telah diperiksa di pos gerbang
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px] sm:min-w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari plat, pengemudi, barang..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setLoadFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  loadFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setLoadFilter('penuh')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  loadFilter === 'penuh' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Penuh
              </button>
              <button
                onClick={() => setLoadFilter('kosong')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  loadFilter === 'kosong' ? 'bg-slate-800 text-slate-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Kosong
              </button>
            </div>
          </div>
        </div>

        {/* Manifest Table */}
        {vehiclesWithCargo.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Plat Kendaraan</th>
                  <th className="py-3 px-4">Pengemudi & Perusahaan</th>
                  <th className="py-3 px-4">No. Surat Jalan / DO</th>
                  <th className="py-3 px-4">Status Muatan</th>
                  <th className="py-3 px-4">Total Berat / Koli</th>
                  <th className="py-3 px-4">Verifikasi Gerbang</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {vehiclesWithCargo.map((item) => {
                  const m = item.cargoManifest;
                  const isExpanded = expandedId === item.id;

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-800/40 transition">
                        {/* Plate & Vehicle */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleExpand(item.id)}
                              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                              title="Lihat rincian barang"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            <div>
                              <div className="font-mono font-black text-sm text-white">
                                {item.formattedPlate}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {item.vehicleType || 'Mobil/Truk'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Driver & Company */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200">
                            {m?.driverName || 'Belum diisi'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {m?.companyName || item.notes || '-'}
                          </div>
                        </td>

                        {/* Document Number */}
                        <td className="py-3 px-4 font-mono text-cyan-300">
                          {m?.documentNumber || '-'}
                        </td>

                        {/* Load Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              m?.loadStatus?.includes('Penuh')
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : m?.loadStatus?.includes('Parsial')
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : m?.loadStatus?.includes('B3')
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {m?.loadStatus || 'Kosong'}
                          </span>
                        </td>

                        {/* Total Weight & Items Count */}
                        <td className="py-3 px-4 font-mono whitespace-nowrap">
                          <div className="font-bold text-emerald-400">
                            {m?.totalWeightKg ? `${m.totalWeightKg.toLocaleString()} Kg` : '-'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {m?.items ? `${m.items.length} macam barang (${m.totalItemsCount || 0} unit)` : '-'}
                          </div>
                        </td>

                        {/* Verification Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              m?.inspectionStatus?.includes('Approved') || m?.inspectionStatus?.includes('Sesuai')
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : m?.inspectionStatus?.includes('Perlu Cek')
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            {m?.inspectionStatus || 'Sesuai'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onOpenGatePassSlip(item)}
                              className="px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 font-semibold text-[11px] border border-cyan-500/30 transition flex items-center gap-1 cursor-pointer"
                              title="Cetak Slip Izin Masuk"
                            >
                              <Printer className="w-3 h-3" /> Slip
                            </button>
                            <button
                              onClick={() => onOpenPlateDetail(item)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                              title="Detail Kendaraan"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Sub-Table for Itemized Goods */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80">
                          <td colSpan={7} className="p-4 border-y border-slate-800">
                            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
                                <span className="flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5" /> Rincian Barang Bawaan untuk Plat {item.formattedPlate}:
                                </span>
                                <span className="text-[11px] font-normal text-slate-400">
                                  Tujuan: <b className="text-white">{m?.destination || '-'}</b> • Segel:{' '}
                                  <b className="text-white">{m?.sealNumber || '-'}</b>
                                </span>
                              </div>

                              {m?.items && m.items.length > 0 ? (
                                <table className="w-full text-left text-xs text-slate-300">
                                  <thead className="text-[10px] text-slate-400 uppercase border-b border-slate-800">
                                    <tr>
                                      <th className="py-1 px-2">Nama Barang</th>
                                      <th className="py-1 px-2">Kategori</th>
                                      <th className="py-1 px-2 text-center">Jumlah</th>
                                      <th className="py-1 px-2 text-right">Est. Berat</th>
                                      <th className="py-1 px-2">Catatan</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/40">
                                    {m.items.map((it) => (
                                      <tr key={it.id}>
                                        <td className="py-1.5 px-2 font-medium text-white">{it.name}</td>
                                        <td className="py-1.5 px-2 text-[10px] text-slate-400">{it.category}</td>
                                        <td className="py-1.5 px-2 text-center font-mono text-cyan-300 font-semibold">
                                          {it.quantity} {it.unit}
                                        </td>
                                        <td className="py-1.5 px-2 text-right font-mono text-emerald-400">
                                          {it.weightKg ? `${it.weightKg} Kg` : '-'}
                                        </td>
                                        <td className="py-1.5 px-2 text-[11px] text-slate-400 italic">
                                          {it.notes || '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p className="text-xs text-slate-500 italic py-2">
                                  Tidak ada item barang bawaan khusus yang tercatat.
                                </p>
                              )}

                              {m?.inspectorNotes && (
                                <div className="text-[11px] text-slate-300 pt-2 border-t border-slate-800 flex items-start gap-1">
                                  <span className="text-slate-500 font-semibold">Catatan Petugas:</span>
                                  <span>{m.inspectorNotes}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">
            <Package className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-400">Belum ada data manifest muatan</p>
            <p className="text-xs text-slate-500 mt-1">
              Gunakan menu Inspeksi & Deteksi Kendaraan untuk mendeteksi plat nomor dan mencatat barang bawaan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
