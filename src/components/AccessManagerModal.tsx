'use client';

import React, { useState } from 'react';
import { X, Plus, ShieldCheck, Trash2, Search } from 'lucide-react';
import { WhitelistRule } from '../lib/alpr/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface AccessManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: WhitelistRule[];
  onAddRule: (rule: WhitelistRule) => void;
  onDeleteRule: (plateNumber: string) => void;
}

export const AccessManagerModal: React.FC<AccessManagerModalProps> = ({
  isOpen,
  onClose,
  rules,
  onAddRule,
  onDeleteRule,
}) => {
  const [newPlate, setNewPlate] = useState<string>('');
  const [newOwner, setNewOwner] = useState<string>('');
  const [newStatus, setNewStatus] = useState<WhitelistRule['status']>('registered');
  const [newVehicleType, setNewVehicleType] = useState<string>('Mobil');
  const [newNotes, setNewNotes] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate.trim()) return;

    onAddRule({
      plateNumber: newPlate.toUpperCase().trim(),
      ownerName: newOwner.trim() || 'Pemilik Kendaraan',
      status: newStatus,
      vehicleType: newVehicleType,
      notes: newNotes.trim() || undefined,
      addedAt: Date.now(),
    });

    setNewPlate('');
    setNewOwner('');
    setNewNotes('');
  };

  const filteredRules = rules.filter(
    (r) =>
      r.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative z-50 w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Kelola Akses Gerbang Kendaraan</h3>
              <p className="text-xs text-muted-foreground">Daftar Whitelist, VIP, dan Blacklist</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Add New Vehicle Rule Form */}
          <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Tambah Kendaraan ke Database
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Nomor Plat Kendaraan</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. B 1234 ABC"
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                  className="font-mono text-xs h-8"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Nama Pemilik / Sopir</label>
                <Input
                  type="text"
                  placeholder="e.g. Budi Santoso"
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Status Hak Akses</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="flex h-8 w-full rounded-md border border-input bg-card px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none"
                >
                  <option value="registered">Terdaftar / Diizinkan</option>
                  <option value="vip">VIP Access</option>
                  <option value="blacklist">Blacklist / Dilarang Masuk</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Catatan / Lokasi</label>
                <Input
                  type="text"
                  placeholder="e.g. Area Bongkar C"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="sm"
              className="w-full text-xs font-semibold gap-1.5 h-8 mt-2"
            >
              <Plus className="w-3.5 h-3.5" /> Simpan Kendaraan
            </Button>
          </form>

          {/* List of Registered Plates */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Daftar Terdaftar ({rules.length})
              </h4>
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari plat..."
                  className="pl-8 text-xs h-7"
                />
              </div>
            </div>

            <div className="divide-y divide-border rounded-lg bg-card border border-border overflow-hidden max-h-60 overflow-y-auto">
              {filteredRules.map((rule) => (
                <div key={rule.plateNumber} className="flex items-center justify-between p-3 hover:bg-muted/40 transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground text-sm">{rule.plateNumber}</span>
                      <Badge
                        variant={
                          rule.status === 'vip'
                            ? 'vip'
                            : rule.status === 'registered'
                            ? 'success'
                            : 'destructive'
                        }
                        className="text-[10px]"
                      >
                        {rule.status === 'vip'
                          ? 'VIP'
                          : rule.status === 'registered'
                          ? 'TERDAFTAR'
                          : 'BLACKLIST'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {rule.ownerName} {rule.notes ? `• ${rule.notes}` : ''}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={() => onDeleteRule(rule.plateNumber)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
