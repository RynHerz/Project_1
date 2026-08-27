'use client';

import React, { useState } from 'react';
import { X, Plus, ShieldCheck, Trash2, CheckCircle2, XCircle, Car, Search } from 'lucide-react';
import { WhitelistRule } from '../lib/alpr/types';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white">Kelola Akses Gerbang Kendaraan</h3>
              <p className="text-xs text-slate-400">Whitelist, VIP, dan Daftar Hitam (Blacklist)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Add New Vehicle Rule Form */}
          <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-cyan-400" /> Tambah Kendaraan Baru
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Nomor Plat Kendaraan</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B 1234 ABC"
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Nama Pemilik / Pengemudi</label>
                <input
                  type="text"
                  placeholder="e.g. Budi Santoso"
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Status Hak Akses</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="registered">Terdaftar / Diizinkan</option>
                  <option value="vip">VIP Access</option>
                  <option value="blacklist">Blacklist / Dilarang Masuk</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Catatan / Lokasi Parkir</label>
                <input
                  type="text"
                  placeholder="e.g. Slot P-12, Karyawan"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Simpan Kendaraan ke Database
            </button>
          </form>

          {/* List of Registered Plates */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Daftar Kendaraan Terdaftar ({rules.length})
              </h4>
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari plat..."
                  className="w-full pl-8 pr-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-800/80 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden max-h-60 overflow-y-auto">
              {filteredRules.map((rule) => (
                <div key={rule.plateNumber} className="flex items-center justify-between p-3 hover:bg-slate-900/50 transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">{rule.plateNumber}</span>
                      {rule.status === 'vip' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          VIP
                        </span>
                      ) : rule.status === 'registered' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          TERDAFTAR
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          BLACKLIST
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {rule.ownerName} {rule.notes ? `• ${rule.notes}` : ''}
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteRule(rule.plateNumber)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
