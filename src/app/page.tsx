'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Navbar, ActiveTab } from '../components/Navbar';
import { VehicleInspector } from '../components/VehicleInspector';
import { CargoManifestDashboard } from '../components/CargoManifestDashboard';
import { DatasetTester } from '../components/DatasetTester';
import { DetectionHistory } from '../components/DetectionHistory';
import { PlateDetailModal } from '../components/PlateDetailModal';
import { AccessManagerModal } from '../components/AccessManagerModal';
import { GatePassSlipModal } from '../components/GatePassSlipModal';
import { DetectionResult, WhitelistRule } from '../lib/alpr/types';
import { INITIAL_WHITELIST_RULES, DEMO_SAMPLES } from '../lib/alpr/sampleData';
import { getOcrWorker } from '../lib/alpr/ocrEngine';
import { loadOnnxModel } from '../lib/alpr/onnxDetector';
import { loadCharDetector } from '../lib/alpr/charDetector';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('inspect');
  const [history, setHistory] = useState<DetectionResult[]>([]);
  const [whitelistRules, setWhitelistRules] = useState<WhitelistRule[]>(INITIAL_WHITELIST_RULES);
  const [ocrReady, setOcrReady] = useState<boolean>(false);
  const [onnxReady, setOnnxReady] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [selectedPlateDetail, setSelectedPlateDetail] = useState<DetectionResult | null>(null);
  const [selectedGatePassResult, setSelectedGatePassResult] = useState<DetectionResult | null>(null);
  const [isAccessManagerOpen, setIsAccessManagerOpen] = useState<boolean>(false);

  // Pre-warm Tesseract.js WASM worker and 2-Stage ONNX models on page load
  useEffect(() => {
    getOcrWorker()
      .then(() => {
        setOcrReady(true);
      })
      .catch((err) => {
        console.error('OCR Worker warming notice:', err);
      });

    Promise.allSettled([
      loadOnnxModel('/models/plate_detector.onnx'),
      loadCharDetector('/models/char_detector.onnx'),
    ]).then((results) => {
      const anyLoaded = results.some((r) => r.status === 'fulfilled');
      setOnnxReady(anyLoaded);
    });
  }, []);

  // Load persisted history & whitelist from localStorage, seeded with initial demo history if empty
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('alpr_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      } else {
        const initialSeedHistory: DetectionResult[] = DEMO_SAMPLES.slice(0, 3).map((sample, idx) => ({
          id: `seed-${sample.id}`,
          timestamp: Date.now() - (idx + 1) * 1800000,
          sourceImage: sample.dataUrl,
          plateCropImage: sample.dataUrl,
          plateNumber: sample.plate.replace(/\s+/g, ''),
          formattedPlate: sample.plate,
          expiryDate: sample.expiry,
          confidence: 94 + idx * 2,
          bbox: { x: 20, y: 20, width: 440, height: 140 },
          method: 'cv_contour',
          vehicleType: sample.vehicle,
          status: idx === 0 ? 'vip' : idx === 1 ? 'blacklist' : 'registered',
          notes: sample.name,
          processingTimeMs: 140 + idx * 25,
          cargoManifest: sample.defaultManifest,
        }));
        setHistory(initialSeedHistory);
        localStorage.setItem('alpr_history', JSON.stringify(initialSeedHistory));
      }

      const savedRules = localStorage.getItem('alpr_whitelist');
      if (savedRules) {
        setWhitelistRules(JSON.parse(savedRules));
      }

      const savedSound = localStorage.getItem('alpr_sound');
      if (savedSound !== null) {
        setSoundEnabled(savedSound === 'true');
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, []);

  // Save changes to localStorage
  const saveHistory = (newHistory: DetectionResult[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem('alpr_history', JSON.stringify(newHistory.slice(0, 100)));
    } catch (e) {}
  };

  const saveWhitelistRules = (newRules: WhitelistRule[]) => {
    setWhitelistRules(newRules);
    try {
      localStorage.setItem('alpr_whitelist', JSON.stringify(newRules));
    } catch (e) {}
  };

  // Handle new or updated detection result
  const handleNewDetection = (result: DetectionResult) => {
    const existingIndex = history.findIndex(
      (h) => h.id === result.id || (h.formattedPlate === result.formattedPlate && result.timestamp - h.timestamp < 3000)
    );

    let updated: DetectionResult[];
    if (existingIndex >= 0) {
      updated = [...history];
      updated[existingIndex] = result;
    } else {
      updated = [result, ...history];
    }

    saveHistory(updated);

    if (result.status === 'vip' && existingIndex < 0) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {}
    }
  };

  const handleAddRule = (rule: WhitelistRule) => {
    const updated = [rule, ...whitelistRules.filter((r) => r.plateNumber !== rule.plateNumber)];
    saveWhitelistRules(updated);
  };

  const handleDeleteRule = (plateNumber: string) => {
    const updated = whitelistRules.filter((r) => r.plateNumber !== plateNumber);
    saveWhitelistRules(updated);
  };

  const handleUpdateStatusFromDetail = (
    plateNumber: string,
    status: WhitelistRule['status'],
    ownerName: string,
    notes?: string
  ) => {
    handleAddRule({
      plateNumber,
      ownerName,
      status,
      vehicleType: 'Mobil',
      notes,
      addedAt: Date.now(),
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        historyCount={history.length}
        ocrReady={ocrReady}
        onnxReady={onnxReady}
        soundEnabled={soundEnabled}
        setSoundEnabled={(val) => {
          setSoundEnabled(val);
          localStorage.setItem('alpr_sound', String(val));
        }}
        onOpenAccessManager={() => setIsAccessManagerOpen(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'inspect' && (
          <VehicleInspector
            onNewDetection={handleNewDetection}
            whitelistRules={whitelistRules}
            soundEnabled={soundEnabled}
            onOpenPlateDetail={(res) => setSelectedPlateDetail(res)}
            onOpenGatePassSlip={(res) => setSelectedGatePassResult(res)}
          />
        )}

        {activeTab === 'manifest' && (
          <CargoManifestDashboard
            history={history}
            onOpenGatePassSlip={(res) => setSelectedGatePassResult(res)}
            onOpenPlateDetail={(res) => setSelectedPlateDetail(res)}
          />
        )}

        {activeTab === 'dataset' && (
          <DatasetTester
            onNewDetection={handleNewDetection}
            whitelistRules={whitelistRules}
            soundEnabled={soundEnabled}
            onOpenPlateDetail={(res) => setSelectedPlateDetail(res)}
          />
        )}

        {activeTab === 'history' && (
          <DetectionHistory
            history={history}
            onClearHistory={() => saveHistory([])}
            onOpenPlateDetail={(res) => setSelectedPlateDetail(res)}
            onOpenGatePassSlip={(res) => setSelectedGatePassResult(res)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border bg-card/60 py-4 px-6 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ALPR Cargo AI • Sistem Deteksi Plat Nomor & Manifes Muatan Logistik</span>
          <span className="font-mono text-[11px] text-muted-foreground">
            Client-Side AI Inference • High Efficiency Logistics Checkpoint
          </span>
        </div>
      </footer>

      {/* Modals */}
      <PlateDetailModal
        result={selectedPlateDetail}
        onClose={() => setSelectedPlateDetail(null)}
        onUpdateStatus={handleUpdateStatusFromDetail}
        onOpenGatePassSlip={(res) => setSelectedGatePassResult(res)}
      />

      <GatePassSlipModal
        result={selectedGatePassResult}
        onClose={() => setSelectedGatePassResult(null)}
      />

      <AccessManagerModal
        isOpen={isAccessManagerOpen}
        onClose={() => setIsAccessManagerOpen(false)}
        rules={whitelistRules}
        onAddRule={handleAddRule}
        onDeleteRule={handleDeleteRule}
      />
    </div>
  );
}
