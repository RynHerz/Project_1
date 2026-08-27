'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Trash2,
  User,
  Phone,
  Building,
  FileText,
  MapPin,
  Scale,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  FileCheck2,
  Printer,
  Sparkles,
  Layers,
  Info,
} from 'lucide-react';
import { VehicleCargoManifest, CargoItem } from '../lib/alpr/types';

interface VehicleCargoFormProps {
  initialManifest?: VehicleCargoManifest;
  plateNumber: string;
  onSaveManifest: (manifest: VehicleCargoManifest) => void;
  onOpenGatePassSlip?: (manifest: VehicleCargoManifest) => void;
}

const CARGO_CATEGORIES = [
  'Logistik & Sembako',
  'Material & Konstruksi',
  'Elektronik & Mesin',
  'Bahan Kimia & B3',
  'Paket & Dokumen',
  'Peralatan / Mesin',
  'Barang Pribadi',
  'Lainnya',
];

const CARGO_UNITS = [
  'Kg',
  'Ton',
  'Box / Dus',
  'Pallet',
  'Karung',
  'Pcs',
  'Unit',
  'Drum / Liter',
  'Koli',
];

export const VehicleCargoForm: React.FC<VehicleCargoFormProps> = ({
  initialManifest,
  plateNumber,
  onSaveManifest,
  onOpenGatePassSlip,
}) => {
  const [manifest, setManifest] = useState<VehicleCargoManifest>(() => {
    return (
      initialManifest || {
        driverName: '',
        driverPhone: '',
        companyName: '',
        destination: 'Gudang Utama',
        documentNumber: `SJ-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
        cargoCategory: 'Logistik & Sembako',
        loadStatus: 'Penuh (Full Load)',
        totalWeightKg: 0,
        totalItemsCount: 0,
        sealNumber: '',
        inspectionStatus: 'Sesuai (Approved)',
        inspectorNotes: '',
        items: [],
        updatedAt: Date.now(),
      }
    );
  });

  // New Item Input State
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Logistik & Sembako');
  const [newItemQty, setNewItemQty] = useState<number>(10);
  const [newItemUnit, setNewItemUnit] = useState('Box / Dus');
  const [newItemWeight, setNewItemWeight] = useState<number>(50);
  const [newItemNotes, setNewItemNotes] = useState('');

  // Auto update when initialManifest changes from parent
  useEffect(() => {
    if (initialManifest) {
      setManifest(initialManifest);
    }
  }, [initialManifest]);

  // Recalculate totals whenever items change
  const updateManifestWithTotals = (updatedItems: CargoItem[]) => {
    const totalCount = updatedItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
    const totalWeight = updatedItems.reduce((acc, it) => acc + (Number(it.weightKg) || 0), 0);

    const updated = {
      ...manifest,
      items: updatedItems,
      totalItemsCount: totalCount,
      totalWeightKg: totalWeight,
      updatedAt: Date.now(),
    };
    setManifest(updated);
    onSaveManifest(updated);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: CargoItem = {
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: newItemName.trim(),
      category: newItemCategory,
      quantity: Number(newItemQty) || 1,
      unit: newItemUnit,
      weightKg: Number(newItemWeight) || 0,
      notes: newItemNotes.trim(),
    };

    const newItems = [...manifest.items, newItem];
    updateManifestWithTotals(newItems);

    // Reset input
    setNewItemName('');
    setNewItemNotes('');
  };

  const handleRemoveItem = (id: string) => {
    const newItems = manifest.items.filter((it) => it.id !== id);
    updateManifestWithTotals(newItems);
  };

  const handleChangeField = <K extends keyof VehicleCargoManifest>(
    field: K,
    value: VehicleCargoManifest[K]
  ) => {
    const updated = {
      ...manifest,
      [field]: value,
      updatedAt: Date.now(),
    };
    setManifest(updated);
    onSaveManifest(updated);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Manifes Muatan & Barang Bawaan
            </h3>
            <p className="text-[11px] text-slate-400">
              Plat Terhubung: <span className="font-mono font-bold text-cyan-300">{plateNumber || '-'}</span>
            </p>
          </div>
        </div>

        {onOpenGatePassSlip && (
          <button
            type="button"
            onClick={() => onOpenGatePassSlip(manifest)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Slip Izin / Gate Pass</span>
          </button>
        )}
      </div>

      {/* Driver & Logistics Information */}
      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
        <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
          <User className="w-3.5 h-3.5 text-cyan-400" /> Data Pengemudi & Surat Jalan
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Nama Pengemudi / Sopir
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={manifest.driverName}
                onChange={(e) => handleChangeField('driverName', e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              No. Kontak / HP Sopir
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={manifest.driverPhone || ''}
                onChange={(e) => handleChangeField('driverPhone', e.target.value)}
                placeholder="0812-xxxx-xxxx"
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Perusahaan / Ekspedisi / Vendor
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={manifest.companyName || ''}
                onChange={(e) => handleChangeField('companyName', e.target.value)}
                placeholder="Contoh: PT. Sumber Makmur Express"
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              No. Surat Jalan / DO / Resi
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={manifest.documentNumber || ''}
                onChange={(e) => handleChangeField('documentNumber', e.target.value)}
                placeholder="SJ-2026-XXXX"
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-cyan-300 font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Tujuan / Lokasi Bongkar
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={manifest.destination || ''}
                onChange={(e) => handleChangeField('destination', e.target.value)}
                placeholder="Gudang A, Lantai 2, Area Bongkar C"
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              No. Segel Kontainer / Box (Opsional)
            </label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={manifest.sealNumber || ''}
                onChange={(e) => handleChangeField('sealNumber', e.target.value)}
                placeholder="SEAL-XXXX-99"
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cargo Load Status & Gate Verification */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
            Status Kapasitas Muatan Kendaraan
          </label>
          <select
            value={manifest.loadStatus}
            onChange={(e) => handleChangeField('loadStatus', e.target.value as any)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-medium focus:outline-none focus:border-cyan-500 transition cursor-pointer"
          >
            <option value="Penuh (Full Load)">🚚 Penuh (Full Load)</option>
            <option value="Parsial (Half Load)">📦 Parsial / Sebagian (Half Load)</option>
            <option value="Kosong (Empty)">⚪ Kendaraan Kosong (Empty)</option>
            <option value="Muatan Khusus / B3">⚠️ Muatan Khusus / Bahan Berbahaya (B3)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
            Hasil Pemeriksaan Fisik Gerbang
          </label>
          <select
            value={manifest.inspectionStatus}
            onChange={(e) => handleChangeField('inspectionStatus', e.target.value as any)}
            className={`w-full px-3 py-2 rounded-lg border text-xs font-bold focus:outline-none transition cursor-pointer ${
              manifest.inspectionStatus === 'Sesuai (Approved)'
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                : manifest.inspectionStatus === 'Perlu Cek Fisik'
                ? 'bg-amber-950/50 border-amber-500/40 text-amber-300'
                : manifest.inspectionStatus === 'Ditolak (Rejected)'
                ? 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-200'
            }`}
          >
            <option value="Sesuai (Approved)">✅ Sesuai (Approved / Lolos Masuk)</option>
            <option value="Perlu Cek Fisik">🔍 Perlu Pemeriksaan Fisik Tambahan</option>
            <option value="Dalam Pemeriksaan">⏳ Sedang Dalam Pemeriksaan</option>
            <option value="Ditolak (Rejected)">❌ Ditolak / Dilarang Masuk</option>
          </select>
        </div>
      </div>

      {/* Itemized Goods List */}
      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-400" /> Rincian Daftar Barang Bawaan & Muatan (
            {manifest.items.length} Item)
          </span>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-slate-400">
              Total Kuantitas: <span className="text-cyan-300 font-bold">{manifest.totalItemsCount || 0}</span>
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-400">
              Total Berat: <span className="text-emerald-400 font-bold">{manifest.totalWeightKg || 0} Kg</span>
            </span>
          </div>
        </div>

        {/* Add New Item Mini-Form */}
        <form onSubmit={handleAddItem} className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
          <div className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Tambah Barang Bawaan Baru
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-4">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Nama Barang (contoh: Beras 10kg, Kabel Roll)"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="sm:col-span-3">
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                {CARGO_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-1">
              <input
                type="number"
                min="1"
                value={newItemQty}
                onChange={(e) => setNewItemQty(Number(e.target.value))}
                placeholder="Jumlah"
                className="w-16 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white text-center focus:outline-none focus:border-cyan-500"
              />
              <select
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value)}
                className="w-full px-1.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                {CARGO_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <input
                type="number"
                min="0"
                value={newItemWeight}
                onChange={(e) => setNewItemWeight(Number(e.target.value))}
                placeholder="Est. Kg"
                className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                title="Estimasi Berat Total dalam Kg"
              />
            </div>
            <div className="sm:col-span-1">
              <button
                type="submit"
                className="w-full h-full min-h-[30px] rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center transition shadow shadow-cyan-600/20 cursor-pointer"
                title="Tambahkan Barang"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1">
            <input
              type="text"
              value={newItemNotes}
              onChange={(e) => setNewItemNotes(e.target.value)}
              placeholder="Catatan khusus barang (opsional, contoh: Fragile, Batch #23, Segel Utuh)"
              className="w-full px-2.5 py-1 rounded bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </form>

        {/* Items Table / List */}
        {manifest.items.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Barang</th>
                  <th className="py-2 px-3">Kategori</th>
                  <th className="py-2 px-3 text-center">Jumlah</th>
                  <th className="py-2 px-3 text-right">Est. Berat</th>
                  <th className="py-2 px-3">Catatan</th>
                  <th className="py-2 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {manifest.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-2 px-3 font-semibold text-white">{item.name}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-cyan-300">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-400">
                      {item.weightKg ? `${item.weightKg.toLocaleString()} Kg` : '-'}
                    </td>
                    <td className="py-2 px-3 text-[11px] text-slate-400 italic">
                      {item.notes || '-'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 rounded hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition cursor-pointer"
                        title="Hapus barang ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-slate-900/50 border border-dashed border-slate-800 text-center text-slate-500 text-xs">
            Belum ada rincian barang bawaan yang ditambahkan. Gunakan formulir di atas untuk mencatat barang atau muatan.
          </div>
        )}
      </div>

      {/* Inspector Notes */}
      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
        <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400" /> Catatan Tambahan Petugas Gerbang / Pemeriksa
        </label>
        <textarea
          rows={2}
          value={manifest.inspectorNotes || ''}
          onChange={(e) => handleChangeField('inspectorNotes', e.target.value)}
          placeholder="Tuliskan catatan kondisi kendaraan, kecocokan dokumen fisik, atau instruksi khusus..."
          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
        />
      </div>
    </div>
  );
};
