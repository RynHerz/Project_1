'use client';

import React, { useState } from 'react';
import {
  Package,
  Truck,
  Scale,
  Search,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { DetectionResult } from '../lib/alpr/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Total Armada</span>
            <Truck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-foreground">{totalVehicles}</div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{approvedVehicles} terverifikasi lolos</span>
            </p>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Total Berat Muatan</span>
            <Scale className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-foreground">{totalWeightTon} <span className="text-sm font-normal text-muted-foreground">Ton</span></div>
            <p className="text-[11px] text-muted-foreground mt-1">Akumulasi muatan tercatat</p>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Muatan Penuh (Full)</span>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-foreground">{fullLoads} <span className="text-sm font-normal text-muted-foreground">Armada</span></div>
            <p className="text-[11px] text-muted-foreground mt-1">Distribusi logistik penuh</p>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Muatan Khusus / B3</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-amber-400">{b3Loads} <span className="text-sm font-normal text-muted-foreground">Armada</span></div>
            <p className="text-[11px] text-muted-foreground mt-1">Protokol keamanan khusus</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Manifest Table & Search */}
      <Card>
        <CardHeader className="p-5 pb-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base font-semibold">
              Daftar Manifes Muatan Kendaraan
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Rincian barang bawaan dari setiap armada yang telah diperiksa di pos gerbang
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative min-w-[200px] sm:min-w-[240px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari plat, pengemudi, barang..."
                className="pl-8 text-xs h-8"
              />
            </div>

            <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md border border-border">
              <button
                onClick={() => setLoadFilter('all')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                  loadFilter === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setLoadFilter('penuh')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                  loadFilter === 'penuh' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Penuh
              </button>
              <button
                onClick={() => setLoadFilter('kosong')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                  loadFilter === 'kosong' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Kosong
              </button>
            </div>
          </div>
        </CardHeader>

        {/* Manifest Table */}
        <CardContent className="p-0">
          {vehiclesWithCargo.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow className="text-[11px] hover:bg-transparent">
                    <TableHead className="py-3 px-4">Plat Kendaraan</TableHead>
                    <TableHead className="py-3 px-4">Pengemudi & Vendor</TableHead>
                    <TableHead className="py-3 px-4">Surat Jalan</TableHead>
                    <TableHead className="py-3 px-4">Kapasitas</TableHead>
                    <TableHead className="py-3 px-4">Total Berat</TableHead>
                    <TableHead className="py-3 px-4">Verifikasi</TableHead>
                    <TableHead className="py-3 px-4 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehiclesWithCargo.map((item) => {
                    const m = item.cargoManifest;
                    const isExpanded = expandedId === item.id;

                    return (
                      <React.Fragment key={item.id}>
                        <TableRow className="text-xs">
                          {/* Plate & Vehicle */}
                          <TableCell className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="iconSm"
                                onClick={() => toggleExpand(item.id)}
                                className="h-6 w-6 text-muted-foreground"
                                title="Lihat rincian barang"
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </Button>
                              <div>
                                <div className="font-mono font-bold text-sm text-foreground">
                                  {item.formattedPlate}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {item.vehicleType || 'Mobil/Truk'}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Driver & Company */}
                          <TableCell className="py-3 px-4">
                            <div className="font-medium text-foreground">
                              {m?.driverName || '-'}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                              {m?.companyName || item.notes || '-'}
                            </div>
                          </TableCell>

                          {/* Document Number */}
                          <TableCell className="py-3 px-4 font-mono font-semibold text-foreground text-[11px]">
                            {m?.documentNumber || '-'}
                          </TableCell>

                          {/* Load Status */}
                          <TableCell className="py-3 px-4">
                            <Badge
                              variant={
                                m?.loadStatus.includes('Penuh')
                                  ? 'default'
                                  : m?.loadStatus.includes('B3')
                                  ? 'warning'
                                  : 'secondary'
                              }
                              className="text-[10px] font-normal"
                            >
                              {m?.loadStatus || 'Belum diisi'}
                            </Badge>
                          </TableCell>

                          {/* Weight & Item count */}
                          <TableCell className="py-3 px-4 font-mono">
                            <div className="font-semibold text-foreground">
                              {m?.totalWeightKg ? `${m.totalWeightKg.toLocaleString()} Kg` : '-'}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {m?.totalItemsCount || m?.items?.length || 0} item muatan
                            </div>
                          </TableCell>

                          {/* Gate Status */}
                          <TableCell className="py-3 px-4">
                            <Badge
                              variant={
                                m?.inspectionStatus?.includes('Approved') || m?.inspectionStatus?.includes('Sesuai')
                                  ? 'success'
                                  : m?.inspectionStatus?.includes('Rejected') || m?.inspectionStatus?.includes('Ditolak')
                                  ? 'destructive'
                                  : 'warning'
                              }
                              className="text-[10px]"
                            >
                              {m?.inspectionStatus || 'Sesuai (Approved)'}
                            </Badge>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenGatePassSlip(item)}
                                className="h-7 text-[11px] gap-1 px-2"
                                title="Cetak Slip Izin Masuk"
                              >
                                <Printer className="w-3 h-3" />
                                <span className="hidden sm:inline">Slip</span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onOpenPlateDetail(item)}
                                className="h-7 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
                                title="Detail Lengkap"
                              >
                                <ArrowUpRight className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Collapsible itemized manifest details */}
                        {isExpanded && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={7} className="p-4 pl-12">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                                  <span className="flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-muted-foreground" /> Rincian Item ({m?.items?.length || 0} Jenis Barang)
                                  </span>
                                  {m?.sealNumber && (
                                    <span className="text-[11px] text-muted-foreground font-mono">
                                      No. Segel: {m.sealNumber}
                                    </span>
                                  )}
                                </div>

                                {m?.items && m.items.length > 0 ? (
                                  <div className="rounded-md border border-border bg-card">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="text-[10px] hover:bg-transparent">
                                          <TableHead className="h-7">Nama Barang</TableHead>
                                          <TableHead className="h-7">Kategori</TableHead>
                                          <TableHead className="h-7 text-center">Jumlah</TableHead>
                                          <TableHead className="h-7 text-right">Est. Berat</TableHead>
                                          <TableHead className="h-7">Catatan</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {m.items.map((it) => (
                                          <TableRow key={it.id} className="text-[11px]">
                                            <TableCell className="font-medium py-1.5">{it.name}</TableCell>
                                            <TableCell className="py-1.5 text-muted-foreground">{it.category}</TableCell>
                                            <TableCell className="py-1.5 text-center font-mono font-bold">
                                              {it.quantity} {it.unit}
                                            </TableCell>
                                            <TableCell className="py-1.5 text-right font-mono">
                                              {it.weightKg ? `${it.weightKg.toLocaleString()} Kg` : '-'}
                                            </TableCell>
                                            <TableCell className="py-1.5 text-muted-foreground italic">
                                              {it.notes || '-'}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground italic">
                                    Tidak ada rincian item individual yang diinput.
                                  </div>
                                )}

                                {m?.inspectorNotes && (
                                  <div className="text-xs bg-muted/60 p-2.5 rounded-md border border-border text-foreground">
                                    <span className="font-semibold text-muted-foreground">Catatan Petugas: </span>
                                    {m.inspectorNotes}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground text-xs">
              Tidak ada data manifes yang sesuai dengan pencarian.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
