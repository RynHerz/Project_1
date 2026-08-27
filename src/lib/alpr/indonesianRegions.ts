export interface RegionInfo {
  code: string;
  name: string;
  island: string;
}

export const INDONESIAN_PLATE_REGIONS: Record<string, { name: string; island: string }> = {
  // Sumatera
  'BL': { name: 'Aceh', island: 'Sumatera' },
  'BB': { name: 'Sumatera Utara (Barat)', island: 'Sumatera' },
  'BK': { name: 'Sumatera Utara (Medan / Deli Serdang)', island: 'Sumatera' },
  'BA': { name: 'Sumatera Barat (Padang)', island: 'Sumatera' },
  'BM': { name: 'Riau (Pekanbaru)', island: 'Sumatera' },
  'BP': { name: 'Kepulauan Riau (Batam / Tanjungpinang)', island: 'Sumatera' },
  'BG': { name: 'Sumatera Selatan (Palembang)', island: 'Sumatera' },
  'BN': { name: 'Bangka Belitung', island: 'Sumatera' },
  'BE': { name: 'Lampung (Bandar Lampung)', island: 'Sumatera' },
  'BD': { name: 'Bengkulu', island: 'Sumatera' },
  'BH': { name: 'Jambi', island: 'Sumatera' },

  // Jawa & Jabodetabek
  'A': { name: 'Banten (Serang / Cilegon / Pandeglang)', island: 'Jawa' },
  'B': { name: 'DKI Jakarta / Depok / Tangerang / Bekasi', island: 'Jawa' },
  'D': { name: 'Bandung / Cimahi', island: 'Jawa' },
  'E': { name: 'Cirebon / Indramayu / Majalengka / Kuningan', island: 'Jawa' },
  'F': { name: 'Bogor / Sukabumi / Cianjur', island: 'Jawa' },
  'T': { name: 'Karawang / Purwakarta / Subang', island: 'Jawa' },
  'Z': { name: 'Tasikmalaya / Garut / Ciamis / Banjar / Pangandaran', island: 'Jawa' },
  
  // Jawa Tengah & DIY
  'G': { name: 'Pekalongan / Tegal / Brebes / Batang / Pemalang', island: 'Jawa' },
  'H': { name: 'Semarang / Salatiga / Kendal / Demak', island: 'Jawa' },
  'K': { name: 'Pati / Kudus / Jepara / Rembang / Blora / Grobogan', island: 'Jawa' },
  'R': { name: 'Banyumas / Purwokerto / Cilacap / Purbalingga / Banjarnegara', island: 'Jawa' },
  'AA': { name: 'Kedu / Magelang / Kebumen / Purworejo / Wonosobo / Temanggung', island: 'Jawa' },
  'AD': { name: 'Surakarta / Solo / Sukoharjo / Boyolali / Klaten / Wonogiri / Sragen', island: 'Jawa' },
  'AB': { name: 'DI Yogyakarta (Sleman / Bantul / Gunungkidul / Kulon Progo)', island: 'Jawa' },

  // Jawa Timur
  'L': { name: 'Surabaya', island: 'Jawa' },
  'M': { name: 'Madura (Bangkalan / Sampang / Pamekasan / Sumenep)', island: 'Jawa' },
  'N': { name: 'Malang / Batu / Pasuruan / Probolinggo / Lumajang', island: 'Jawa' },
  'P': { name: 'Besuki / Jember / Banyuwangi / Bondowoso / Situbondo', island: 'Jawa' },
  'S': { name: 'Bojonegoro / Tuban / Lamongan / Mojokerto / Jombang', island: 'Jawa' },
  'W': { name: 'Sidoarjo / Gresik', island: 'Jawa' },
  'AE': { name: 'Madiun / Ngawi / Magetan / Ponorogo / Pacitan', island: 'Jawa' },
  'AG': { name: 'Kediri / Blitar / Tulungagung / Trenggalek / Nganjuk', island: 'Jawa' },

  // Bali & Nusa Tenggara
  'DK': { name: 'Bali (Denpasar / Badung / Gianyar / Buleleng)', island: 'Bali' },
  'DR': { name: 'Lombok (Mataram / Lombok Barat / Timur)', island: 'Nusa Tenggara' },
  'EA': { name: 'Sumbawa / Bima / Dompu', island: 'Nusa Tenggara' },
  'DH': { name: 'Timor / Kupang', island: 'Nusa Tenggara' },
  'EB': { name: 'Flores / Manggarai / Ende / Sikka', island: 'Nusa Tenggara' },
  'ED': { name: 'Sumba (Waingapu / Waikabubak)', island: 'Nusa Tenggara' },

  // Kalimantan
  'KB': { name: 'Kalimantan Barat (Pontianak)', island: 'Kalimantan' },
  'DA': { name: 'Kalimantan Selatan (Banjarmasin)', island: 'Kalimantan' },
  'KH': { name: 'Kalimantan Tengah (Palangka Raya)', island: 'Kalimantan' },
  'KT': { name: 'Kalimantan Timur (Balikpapan / Samarinda)', island: 'Kalimantan' },
  'KU': { name: 'Kalimantan Utara (Tarakan / Tanjung Selor)', island: 'Kalimantan' },

  // Sulawesi
  'DB': { name: 'Sulawesi Utara (Manado / Bitung / Minahasa)', island: 'Sulawesi' },
  'DL': { name: 'Kepulauan Sangihe / Talaud', island: 'Sulawesi' },
  'DM': { name: 'Gorontalo', island: 'Sulawesi' },
  'DN': { name: 'Sulawesi Tengah (Palu)', island: 'Sulawesi' },
  'DP': { name: 'Sulawesi Selatan (Parepare / Palopo)', island: 'Sulawesi' },
  'DD': { name: 'Sulawesi Selatan (Makassar / Gowa / Maros)', island: 'Sulawesi' },
  'DC': { name: 'Sulawesi Barat (Mamuju / Majene)', island: 'Sulawesi' },
  'DT': { name: 'Sulawesi Tenggara (Kendari)', island: 'Sulawesi' },

  // Maluku & Papua
  'DE': { name: 'Maluku (Ambon)', island: 'Maluku' },
  'DG': { name: 'Maluku Utara (Ternate)', island: 'Maluku' },
  'PA': { name: 'Papua (Jayapura)', island: 'Papua' },
  'PB': { name: 'Papua Barat (Manokwari / Sorong)', island: 'Papua' },
};

export function getRegionInfo(plateNumber: string): { code: string; name: string; island: string } | null {
  if (!plateNumber) return null;
  const match = plateNumber.trim().toUpperCase().match(/^([A-Z]{1,2})/);
  if (!match) return null;
  const code = match[1];
  const info = INDONESIAN_PLATE_REGIONS[code];
  if (info) {
    return { code, name: info.name, island: info.island };
  }
  return null;
}
