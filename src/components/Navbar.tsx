'use client';

import React from 'react';
import {
  Package,
  Database,
  History,
  ShieldCheck,
  Cpu,
  Volume2,
  VolumeX,
  ScanLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-mono font-black text-sm tracking-tight shadow-sm">
              ALPR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-foreground">
                  Cargo<span className="text-muted-foreground font-normal">Vision</span>
                </span>
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono text-muted-foreground">
                  v2.0
                </Badge>
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Shadcn style segmented control) */}
          <nav className="flex items-center gap-1 p-1 bg-muted rounded-lg border border-border/50 text-muted-foreground">
            <button
              onClick={() => setActiveTab('inspect')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'inspect'
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'hover:text-foreground hover:bg-background/40'
              }`}
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>Inspeksi Plat</span>
            </button>

            <button
              onClick={() => setActiveTab('manifest')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'manifest'
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'hover:text-foreground hover:bg-background/40'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Manifes Muatan</span>
            </button>

            <button
              onClick={() => setActiveTab('dataset')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'dataset'
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'hover:text-foreground hover:bg-background/40'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Dataset Tester</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'hover:text-foreground hover:bg-background/40'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Riwayat</span>
              {historyCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-semibold rounded-full bg-secondary text-secondary-foreground">
                  {historyCount}
                </span>
              )}
            </button>
          </nav>

          {/* Quick Actions & Status */}
          <div className="flex items-center gap-2">
            {/* Whitelist Manager Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenAccessManager}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Kelola Akses</span>
            </Button>

            {/* Sound Toggle */}
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Suara Aktif' : 'Suara Nonaktif'}
              className="text-muted-foreground hover:text-foreground"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
            </Button>

            {/* AI Engine Status Badges */}
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-border text-xs">
              <Badge variant="outline" className="gap-1 font-mono text-[11px] py-0.5">
                <Cpu className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">OCR:</span>
                <span className={ocrReady ? 'text-emerald-400 font-medium' : 'text-amber-400 animate-pulse'}>
                  {ocrReady ? 'Ready' : 'Init...'}
                </span>
              </Badge>
              <Badge variant="outline" className="font-mono text-[11px] py-0.5">
                <span className="text-muted-foreground">AI: </span>
                <span className={onnxReady ? 'text-emerald-400 font-medium' : 'text-muted-foreground'}>
                  {onnxReady ? 'YOLO v8' : 'CV Filter'}
                </span>
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
