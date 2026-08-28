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
  ShieldCheck,
  Printer,
  Layers,
  Info,
} from 'lucide-react';
import { VehicleCargoManifest, CargoItem } from '../lib/alpr/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
  'Box / Dus',
  'Kg',
  'Ton',
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

  useEffect(() => {
    if (initialManifest) {
      setManifest(initialManifest);
    }
  }, [initialManifest]);

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
    <Card>
      {/* Header Info */}
      <CardHeader className="p-5 pb-4 border-b border-border flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted border border-border text-foreground">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">
              Manifes Muatan Kendaraan
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Plat Terhubung: <span className="font-mono font-bold text-foreground">{plateNumber || '-'}</span>
            </p>
          </div>
        </div>

        {onOpenGatePassSlip && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenGatePassSlip(manifest)}
            className="text-xs gap-1.5 h-8"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Slip Izin Masuk</span>
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {/* Driver & Logistics Information */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <User className="w-3.5 h-3.5" /> Data Pengemudi & Surat Jalan
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Nama Pengemudi / Sopir
              </label>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  value={manifest.driverName}
                  onChange={(e) => handleChangeField('driverName', e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="pl-8 text-xs h-8"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                No. Kontak / HP Sopir
              </label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  value={manifest.driverPhone || ''}
                  onChange={(e) => handleChangeField('driverPhone', e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="pl-8 text-xs h-8"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Perusahaan / Ekspedisi / Vendor
              </label>
              <div className="relative">
                <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  value={manifest.companyName || ''}
                  onChange={(e) => handleChangeField('companyName', e.target.value)}
                  placeholder="Contoh: PT. Sumber Makmur Express"
                  className="pl-8 text-xs h-8"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                No. Surat Jalan / DO / Resi
              </label>
              <div className="relative">
                <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  value={manifest.documentNumber || ''}
                  onChange={(e) => handleChangeField('documentNumber', e.target.value)}
                  placeholder="SJ-2026-XXXX"
                  className="pl-8 text-xs h-8 font-mono font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Tujuan / Lokasi Bongkar
              </label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  value={manifest.destination || ''}
                  onChange={(e) => handleChangeField('destination', e.target.value)}
                  placeholder="Gudang A, Area Bongkar C"
                  className="pl-8 text-xs h-8"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                No. Segel Kontainer / Box (Opsional)
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  value={manifest.sealNumber || ''}
                  onChange={(e) => handleChangeField('sealNumber', e.target.value)}
                  placeholder="SEAL-XXXX-99"
                  className="pl-8 text-xs h-8"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cargo Load Status & Gate Verification */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
              Status Kapasitas Muatan
            </label>
            <select
              value={manifest.loadStatus}
              onChange={(e) => handleChangeField('loadStatus', e.target.value as any)}
              className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              <option value="Penuh (Full Load)">🚚 Penuh (Full Load)</option>
              <option value="Parsial (Half Load)">📦 Parsial / Sebagian (Half Load)</option>
              <option value="Kosong (Empty)">⚪ Kendaraan Kosong (Empty)</option>
              <option value="Muatan Khusus / B3">⚠️ Muatan Khusus / Bahan Berbahaya (B3)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
              Hasil Pemeriksaan Fisik Gerbang
            </label>
            <select
              value={manifest.inspectionStatus}
              onChange={(e) => handleChangeField('inspectionStatus', e.target.value as any)}
              className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              <option value="Sesuai (Approved)">✅ Sesuai (Approved / Lolos Masuk)</option>
              <option value="Perlu Cek Fisik">🔍 Perlu Pemeriksaan Fisik Tambahan</option>
              <option value="Dalam Pemeriksaan">⏳ Sedang Dalam Pemeriksaan</option>
              <option value="Ditolak (Rejected)">❌ Ditolak / Dilarang Masuk</option>
            </select>
          </div>
        </div>

        {/* Itemized Goods List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-muted-foreground" /> Rincian Muatan ({manifest.items.length} Item)
            </span>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-muted-foreground">
                Qty: <span className="text-foreground font-bold">{manifest.totalItemsCount || 0}</span>
              </span>
              <span className="text-border">|</span>
              <span className="text-muted-foreground">
                Berat: <span className="text-foreground font-bold">{manifest.totalWeightKg || 0} Kg</span>
              </span>
            </div>
          </div>

          {/* Add New Item Mini-Form */}
          <form onSubmit={handleAddItem} className="bg-muted/40 p-3 rounded-lg border border-border space-y-2">
            <div className="text-[11px] font-semibold text-foreground flex items-center gap-1">
              <Plus className="w-3 h-3" /> Tambah Item Muatan
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-4">
                <Input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Nama Barang (misal: Beras 10kg)"
                  className="text-xs h-8"
                />
              </div>
              <div className="sm:col-span-3">
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-card px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none"
                >
                  {CARGO_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 flex gap-1">
                <Input
                  type="number"
                  min="1"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(Number(e.target.value))}
                  placeholder="Qty"
                  className="text-xs h-8 text-center"
                />
                <select
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-card px-1 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none"
                >
                  {CARGO_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Input
                  type="number"
                  min="0"
                  value={newItemWeight}
                  onChange={(e) => setNewItemWeight(Number(e.target.value))}
                  placeholder="Kg"
                  className="text-xs h-8"
                  title="Berat Total (Kg)"
                />
              </div>
              <div className="sm:col-span-1">
                <Button
                  type="submit"
                  size="sm"
                  className="w-full h-8 p-0"
                  title="Tambah Item"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <Input
                type="text"
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
                placeholder="Catatan tambahan (opsional: Segel Utuh, Fragile, Batch #23)"
                className="text-[11px] h-7"
              />
            </div>
          </form>

          {/* Items Table */}
          {manifest.items.length > 0 ? (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="text-[11px] hover:bg-transparent">
                    <TableHead className="h-8">Barang</TableHead>
                    <TableHead className="h-8">Kategori</TableHead>
                    <TableHead className="h-8 text-center">Jumlah</TableHead>
                    <TableHead className="h-8 text-right">Berat</TableHead>
                    <TableHead className="h-8">Catatan</TableHead>
                    <TableHead className="h-8 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manifest.items.map((item) => (
                    <TableRow key={item.id} className="text-xs">
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.weightKg ? `${item.weightKg.toLocaleString()} Kg` : '-'}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">
                        {item.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="iconSm"
                          onClick={() => handleRemoveItem(item.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Hapus item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-4 rounded-md bg-muted/20 border border-dashed border-border text-center text-muted-foreground text-xs">
              Belum ada rincian muatan yang dicatat.
            </div>
          )}
        </div>

        {/* Inspector Notes */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> Catatan Petugas Gerbang
          </label>
          <Textarea
            rows={2}
            value={manifest.inspectorNotes || ''}
            onChange={(e) => handleChangeField('inspectorNotes', e.target.value)}
            placeholder="Tuliskan catatan kondisi fisik kendaraan atau instruksi khusus..."
            className="text-xs"
          />
        </div>
      </CardContent>
    </Card>
  );
};
