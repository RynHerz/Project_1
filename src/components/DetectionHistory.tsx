'use client';

import React, { useState } from 'react';
import {
  History,
  Search,
  Download,
  Trash2,
  ExternalLink,
  Filter,
  Clock,
  Printer,
} from 'lucide-react';
import { DetectionResult } from '../lib/alpr/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
    <Card>
      {/* Header & Controls */}
      <CardHeader className="p-5 pb-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base font-semibold">
            Log Riwayat Deteksi & Pemeriksaan
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Total tercatat: <span className="font-semibold text-foreground">{history.length}</span> kendaraan
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCsv}
                className="gap-1.5 text-xs h-8"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm('Yakin ingin menghapus seluruh riwayat pemeriksaan?')) {
                    onClearHistory();
                  }
                }}
                className="gap-1.5 text-xs h-8"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hapus Semua</span>
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-muted/20 border-b border-border flex flex-wrap items-center justify-between gap-3">
        {/* Search Box */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari plat, pengemudi, barang..."
            className="pl-8 text-xs h-8"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md border border-border">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
              statusFilter === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setStatusFilter('registered')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
              statusFilter === 'registered' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Terdaftar
          </button>
          <button
            onClick={() => setStatusFilter('vip')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
              statusFilter === 'vip' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            VIP
          </button>
          <button
            onClick={() => setStatusFilter('blacklist')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
              statusFilter === 'blacklist' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Blacklist
          </button>
        </div>
      </div>

      {/* History Table */}
      <CardContent className="p-0">
        {filteredHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow className="text-[11px] hover:bg-transparent">
                  <TableHead className="py-3 px-4">Thumbnail</TableHead>
                  <TableHead className="py-3 px-4">Waktu</TableHead>
                  <TableHead className="py-3 px-4">Plat Nomor</TableHead>
                  <TableHead className="py-3 px-4">Pengemudi & Manifes</TableHead>
                  <TableHead className="py-3 px-4">Status Muatan</TableHead>
                  <TableHead className="py-3 px-4">Status Gerbang</TableHead>
                  <TableHead className="py-3 px-4 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((item) => {
                  const m = item.cargoManifest;

                  return (
                    <TableRow key={item.id} className="text-xs">
                      {/* Thumbnail */}
                      <TableCell className="py-2.5 px-4">
                        <div className="w-12 h-8 rounded-md bg-muted border border-border overflow-hidden flex items-center justify-center p-0.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.plateCropImage || item.sourceImage}
                            alt={item.formattedPlate}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </TableCell>

                      {/* Timestamp */}
                      <TableCell className="py-2.5 px-4 font-mono text-muted-foreground whitespace-nowrap text-[11px]">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {new Date(item.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="text-[10px] text-muted-foreground/70">
                          {new Date(item.timestamp).toLocaleDateString('id-ID')}
                        </div>
                      </TableCell>

                      {/* Plate */}
                      <TableCell className="py-2.5 px-4">
                        <div className="font-mono font-bold text-sm text-foreground">
                          {item.formattedPlate}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {item.vehicleType || 'Mobil'} • {item.confidence}%
                        </div>
                      </TableCell>

                      {/* Driver & Manifest */}
                      <TableCell className="py-2.5 px-4">
                        <div className="font-medium text-foreground">
                          {m?.driverName || item.notes || '-'}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {m?.documentNumber ? `SJ: ${m.documentNumber}` : 'Tanpa surat jalan'}
                        </div>
                      </TableCell>

                      {/* Load Status */}
                      <TableCell className="py-2.5 px-4">
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
                          {m?.loadStatus || 'Kosong'}
                        </Badge>
                      </TableCell>

                      {/* Access Status */}
                      <TableCell className="py-2.5 px-4">
                        <Badge
                          variant={
                            item.status === 'vip'
                              ? 'vip'
                              : item.status === 'registered'
                              ? 'success'
                              : item.status === 'blacklist'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="uppercase text-[10px]"
                        >
                          {item.status === 'vip'
                            ? 'VIP'
                            : item.status === 'registered'
                            ? 'TERDAFTAR'
                            : item.status === 'blacklist'
                            ? 'BLACKLIST'
                            : 'TAMU'}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onOpenGatePassSlip && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onOpenGatePassSlip(item)}
                              className="h-7 text-[11px] px-2 gap-1"
                              title="Slip Izin Masuk"
                            >
                              <Printer className="w-3 h-3" />
                              <span className="hidden sm:inline">Slip</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenPlateDetail(item)}
                            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground text-xs">
            Belum ada riwayat deteksi plat atau manifes muatan yang tersimpan.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
