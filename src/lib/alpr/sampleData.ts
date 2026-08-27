import { WhitelistRule, VehicleCargoManifest } from './types';

/**
 * Creates SVG Data URLs representing Indonesian vehicle license plates (both modern white-background and classic black-background)
 */
export function generateSamplePlateImage(
  plateText: string,
  expiry: string = '05.28',
  type: 'white_modern' | 'black_classic' = 'white_modern'
): string {
  const isWhite = type === 'white_modern';
  const bgColor = isWhite ? '#f8fafc' : '#0f172a';
  const textColor = isWhite ? '#020617' : '#ffffff';
  const borderColor = isWhite ? '#020617' : '#ffffff';
  const lineDecoration = isWhite ? '#020617' : '#ffffff';

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="480" height="180" viewBox="0 0 480 180">
    <defs>
      <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.25"/>
      </filter>
    </defs>
    <!-- Outer Plate Body -->
    <rect x="8" y="8" width="464" height="164" rx="14" fill="${bgColor}" stroke="${borderColor}" stroke-width="6" filter="url(#shadow)" />
    
    <!-- Inner Border Line -->
    <rect x="18" y="18" width="444" height="144" rx="8" fill="none" stroke="${borderColor}" stroke-width="2.5" opacity="0.8" />
    
    <!-- Plate Mounting Holes / Screws -->
    <circle cx="50" cy="90" r="5" fill="#64748b" stroke="#334155" stroke-width="2"/>
    <circle cx="430" cy="90" r="5" fill="#64748b" stroke="#334155" stroke-width="2"/>
    
    <!-- Main License Plate Number -->
    <text x="240" y="98" font-family="Arial, 'Helvetica Neue', sans-serif" font-weight="900" font-size="52" fill="${textColor}" text-anchor="middle" letter-spacing="6">
      ${plateText}
    </text>
    
    <!-- Expiry Date & Official Seal -->
    <text x="240" y="142" font-family="Arial, sans-serif" font-weight="700" font-size="20" fill="${textColor}" text-anchor="middle" letter-spacing="4" opacity="0.9">
      ${expiry}
    </text>
    
    <!-- Small Korlantas RI watermark badge -->
    <circle cx="100" cy="138" r="8" fill="none" stroke="${lineDecoration}" stroke-width="1.5" opacity="0.6"/>
    <text x="100" y="141" font-family="sans-serif" font-size="6" font-weight="bold" fill="${textColor}" text-anchor="middle" opacity="0.7">POLRI</text>
  </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface DemoSample {
  id: string;
  name: string;
  plate: string;
  expiry: string;
  vehicle: 'Mobil' | 'Motor' | 'Truk / Bus' | 'Pickup / Box' | 'Lainnya';
  type: 'white_modern' | 'black_classic';
  dataUrl: string;
  defaultManifest?: VehicleCargoManifest;
}

export function createDefaultCargoManifest(plateNumber: string, driverName?: string): VehicleCargoManifest {
  return {
    driverName: driverName || '',
    driverPhone: '',
    companyName: '',
    destination: 'Gudang Utama / Area Parkir',
    documentNumber: `SJ-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
    cargoCategory: 'Logistik & Distribusi',
    loadStatus: 'Penuh (Full Load)',
    totalWeightKg: 0,
    totalItemsCount: 0,
    sealNumber: '',
    inspectionStatus: 'Sesuai (Approved)',
    inspectorNotes: 'Kondisi fisik segel dan muatan rapi.',
    items: [],
    updatedAt: Date.now(),
  };
}

export const DEMO_SAMPLES: DemoSample[] = [
  {
    id: 'sample-1',
    name: 'Truk Box Isuzu Giga (Jakarta)',
    plate: 'B 1234 ABC',
    expiry: '08.28',
    vehicle: 'Truk / Bus',
    type: 'white_modern',
    dataUrl: generateSamplePlateImage('B 1234 ABC', '08.28', 'white_modern'),
    defaultManifest: {
      driverName: 'Budi Santoso',
      driverPhone: '0812-8899-1122',
      companyName: 'PT. Berkah Logistik Nusantara',
      destination: 'Gudang Distribusi Blok A-4',
      documentNumber: 'DO/JKT-2026/8921',
      cargoCategory: 'Logistik & Sembako',
      loadStatus: 'Penuh (Full Load)',
      totalWeightKg: 4500,
      totalItemsCount: 220,
      sealNumber: 'SEAL-JKT-9981',
      inspectionStatus: 'Sesuai (Approved)',
      inspectorNotes: 'Muatan sembako dan minyak goreng, segel utuh tidak ada kerusakan.',
      items: [
        { id: 'c-1', name: 'Beras Premium Ramos 10kg', category: 'Logistik & Sembako', quantity: 150, unit: 'Karung', weightKg: 1500, notes: 'Mutu Kelas A' },
        { id: 'c-2', name: 'Minyak Goreng Kemasan 2L', category: 'Logistik & Sembako', quantity: 50, unit: 'Box / Dus', weightKg: 1200, notes: '24 Pcs per box' },
        { id: 'c-3', name: 'Gula Pasir Kristal 50kg', category: 'Logistik & Sembako', quantity: 20, unit: 'Karung', weightKg: 1000, notes: 'Segel karung aman' },
      ],
      updatedAt: Date.now(),
    },
  },
  {
    id: 'sample-2',
    name: 'Pickup GrandMax Ekspedisi (Bandung)',
    plate: 'D 1999 ZZZ',
    expiry: '11.27',
    vehicle: 'Pickup / Box',
    type: 'black_classic',
    dataUrl: generateSamplePlateImage('D 1999 ZZZ', '11.27', 'black_classic'),
    defaultManifest: {
      driverName: 'Asep Ridwan',
      driverPhone: '0857-2233-4455',
      companyName: 'JNE Express Cargo Bandung',
      destination: 'Hub Transit Cimahi',
      documentNumber: 'SJ-BDG-7712',
      cargoCategory: 'Paket & Dokumen',
      loadStatus: 'Parsial (Half Load)',
      totalWeightKg: 850,
      totalItemsCount: 45,
      sealNumber: 'PL-BDG-003',
      inspectionStatus: 'Perlu Cek Fisik',
      inspectorNotes: 'Ada 2 kardus paket mengalami sobekan ringan di sudut.',
      items: [
        { id: 'c-4', name: 'Paket E-Commerce Elektronik', category: 'Elektronik & Mesin', quantity: 15, unit: 'Box / Dus', weightKg: 180, notes: 'Barang rentan pecah (Fragile)' },
        { id: 'c-5', name: 'Tekstil & Pakaian Jadi', category: 'Logistik & Sembako', quantity: 30, unit: 'Karung', weightKg: 670, notes: 'Kiriman garmen FO Bandung' },
      ],
      updatedAt: Date.now(),
    },
  },
  {
    id: 'sample-3',
    name: 'Mobil Operasional Vendor (Bali)',
    plate: 'DK 8888 XX',
    expiry: '04.29',
    vehicle: 'Mobil',
    type: 'white_modern',
    dataUrl: generateSamplePlateImage('DK 8888 XX', '04.29', 'white_modern'),
    defaultManifest: {
      driverName: 'I Made Wijaya',
      driverPhone: '0813-3721-9988',
      companyName: 'CV. Bali Solusi Teknik',
      destination: 'Ruang Server & Mekanikal',
      documentNumber: 'WO-ENG-2026/041',
      cargoCategory: 'Elektronik & Mesin',
      loadStatus: 'Parsial (Half Load)',
      totalWeightKg: 120,
      totalItemsCount: 8,
      sealNumber: '',
      inspectionStatus: 'Sesuai (Approved)',
      inspectorNotes: 'Toolkit instalasi jaringan dan inverter cadangan.',
      items: [
        { id: 'c-6', name: 'Inverter Solar Panel 5KW', category: 'Elektronik & Mesin', quantity: 2, unit: 'Unit', weightKg: 60, notes: 'Garansi resmi pabrik' },
        { id: 'c-7', name: 'Toolbox Teknisi & Kabel Roll', category: 'Peralatan / Mesin', quantity: 6, unit: 'Pcs', weightKg: 60, notes: 'Peralatan maintenance' },
      ],
      updatedAt: Date.now(),
    },
  },
  {
    id: 'sample-4',
    name: 'Truk Tronton Material (Surabaya)',
    plate: 'L 4567 QR',
    expiry: '01.28',
    vehicle: 'Truk / Bus',
    type: 'black_classic',
    dataUrl: generateSamplePlateImage('L 4567 QR', '01.28', 'black_classic'),
    defaultManifest: {
      driverName: 'Slamet Riyadi',
      driverPhone: '0878-1122-3344',
      companyName: 'PT. Semen Jawa Timur Tbk',
      destination: 'Proyek Pembangunan Gedung C',
      documentNumber: 'DO-SBY-MATERIAL-990',
      cargoCategory: 'Material & Konstruksi',
      loadStatus: 'Penuh (Full Load)',
      totalWeightKg: 18000,
      totalItemsCount: 360,
      sealNumber: 'SEAL-SUB-8812',
      inspectionStatus: 'Sesuai (Approved)',
      inspectorNotes: 'Surat jalan sesuai, timbangan bruto telah diverifikasi.',
      items: [
        { id: 'c-8', name: 'Semen Portland Komposit 50kg', category: 'Material & Konstruksi', quantity: 360, unit: 'Karung', weightKg: 18000, notes: 'Standar SNI' },
      ],
      updatedAt: Date.now(),
    },
  },
  {
    id: 'sample-5',
    name: 'Kendaraan Pribadi / Tamu (Yogyakarta)',
    plate: 'AB 3021 YK',
    expiry: '09.26',
    vehicle: 'Mobil',
    type: 'white_modern',
    dataUrl: generateSamplePlateImage('AB 3021 YK', '09.26', 'white_modern'),
    defaultManifest: {
      driverName: 'Rian Pratama',
      driverPhone: '0896-5544-3322',
      companyName: 'Tamu / Personal',
      destination: 'Lobi Utama Kantor',
      documentNumber: 'PAS-TAMU-024',
      cargoCategory: 'Barang Pribadi',
      loadStatus: 'Kosong (Empty)',
      totalWeightKg: 15,
      totalItemsCount: 2,
      sealNumber: '',
      inspectionStatus: 'Sesuai (Approved)',
      inspectorNotes: 'Hanya membawa barang bawaan pribadi (tas ransel & koper kecil).',
      items: [
        { id: 'c-9', name: 'Tas Ransel Laptop & Koper Kabin', category: 'Barang Pribadi', quantity: 2, unit: 'Pcs', weightKg: 15, notes: 'Barang bawaan pribadi tamu' },
      ],
      updatedAt: Date.now(),
    },
  },
];

export const INITIAL_WHITELIST_RULES: WhitelistRule[] = [
  {
    plateNumber: 'B 1234 ABC',
    ownerName: 'Budi Santoso',
    status: 'vip',
    vehicleType: 'Truk / Bus',
    notes: 'Armada Logistik Utama - Akses Gerbang Cepat',
    addedAt: Date.now() - 86400000 * 3,
  },
  {
    plateNumber: 'DK 8888 XX',
    ownerName: 'I Made Wijaya',
    status: 'registered',
    vehicleType: 'Mobil',
    notes: 'Vendor Maintenance Resmi - Akses Loading Dock',
    addedAt: Date.now() - 86400000 * 5,
  },
  {
    plateNumber: 'D 1999 ZZZ',
    ownerName: 'Asep Ridwan',
    status: 'blacklist',
    vehicleType: 'Pickup / Box',
    notes: 'Dilarang Masuk - Surat Jalan Kadaluarsa & Pelanggaran Segel',
    addedAt: Date.now() - 86400000 * 1,
  },
];
