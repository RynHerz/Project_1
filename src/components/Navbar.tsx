'use client';

import React from 'react';
import {
  Car,
  Package,
  Database,
  History,
  ShieldCheck,
  Cpu,
  Volume2,
  VolumeX,
  ScanLine,
  Truck,
} from 'lucide-react';

export type ActiveTab = 'inspect' | 'manifest' | 'dataset' | 'history';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  historyCount: number;
  ocrReady: boolean;
  onnxReady: boolean;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  onOpenAccessManager: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  historyCount,
  ocrReady,
  onnxReady,
  soundEnabled,
  setSoundEnabled,
  onOpenAccessManager,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 shadow-lg shadow-cyan-500/20">
              <span className="font-mono font-black text-white text-lg tracking-tighter">ID</span>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950 animate-ping" />
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">
                  ALPR<span className="text-cyan-400">Cargo</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider text-cyan-300 bg-cyan-950/80 border border-cyan-800/60 rounded-full uppercase">
                  Logistics AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Deteksi Plat & Manifes Muatan Kendaraan
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl shadow-inner">
            <button
              onClick={() => setActiveTab('inspect')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeTab === 'inspect'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ScanLine className="w-4 h-4" />
              <span className="hidden md:inline">Inspeksi & Deteksi</span>
            </button>

            <button
              onClick={() => setActiveTab('manifest')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeTab === 'manifest'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Package className="w-4 h-4" />
              <span className="hidden md:inline">Manifes Muatan</span>
            </button>

            <button
              onClick={() => setActiveTab('dataset')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeTab === 'dataset'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Database className="w-4 h-4" />
              <span className="hidden md:inline">Dataset Tester</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <History className="w-4 h-4" />
              <span className="hidden md:inline">Riwayat</span>
              {historyCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-cyan-500/30 text-cyan-300">
                  {historyCount}
                </span>
              )}
            </button>
          </nav>

          {/* Quick Actions & Status */}
          <div className="flex items-center gap-2">
            {/* Whitelist Manager Button */}
            <button
              onClick={onOpenAccessManager}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white transition cursor-pointer shadow-sm"
              title="Kelola Akses Kendaraan (Whitelist / Blacklist)"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="hidden lg:inline">Kelola Akses</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-900 border-slate-800 text-cyan-400 hover:bg-slate-800'
                  : 'bg-slate-900/50 border-slate-800/50 text-slate-500 hover:text-slate-400'
              }`}
              title={soundEnabled ? 'Suara Beep Aktif' : 'Suara Beep Nonaktif'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Engine Status Badge */}
            <div className="hidden xl:flex items-center gap-3 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">OCR:</span>
                <span className={ocrReady ? 'text-emerald-400 font-medium' : 'text-amber-400 animate-pulse'}>
                  {ocrReady ? 'Ready' : 'Init...'}
                </span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">YOLO:</span>
                <span className={onnxReady ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                  {onnxReady ? 'ONNX Active' : 'CV Filter'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
