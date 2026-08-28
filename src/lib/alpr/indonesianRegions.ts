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
  'BE': { name: 'Lampung (Bandar Lampung / Metro)', island: 'Sumatera' },
  'BD': { name: 'Bengkulu', island: 'Sumatera' },
  'BH': { name: 'Jambi', island: 'Sumatera' },

  // Jawa Barat & Banten & DKI Jakarta
  'A': { name: 'Banten (Serang / Cilegon / Pandeglang / Lebak)', island: 'Jawa' },
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
  'AB': { name: 'DI Yogyakarta (Kota / Sleman / Bantul / Gunungkidul / Kulon Progo)', island: 'Jawa' },

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
  'DK': { name: 'Bali (Denpasar / Badung / Gianyar / Tabanan / Buleleng)', island: 'Bali' },
  'DR': { name: 'Lombok (Mataram / Lombok Barat / Timur / Tengah)', island: 'Nusa Tenggara' },
  'EA': { name: 'Sumbawa / Bima / Dompu', island: 'Nusa Tenggara' },
  'DH': { name: 'Timor / Kupang', island: 'Nusa Tenggara' },
  'EB': { name: 'Flores / Manggarai / Ende / Sikka', island: 'Nusa Tenggara' },
  'ED': { name: 'Sumba (Waingapu / Waikabubak)', island: 'Nusa Tenggara' },

  // Kalimantan
  'KB': { name: 'Kalimantan Barat (Pontianak)', island: 'Kalimantan' },
  'DA': { name: 'Kalimantan Selatan (Banjarmasin / Banjarbaru)', island: 'Kalimantan' },
  'KH': { name: 'Kalimantan Tengah (Palangka Raya)', island: 'Kalimantan' },
  'KT': { name: 'Kalimantan Timur (Balikpapan / Samarinda / Bontang)', island: 'Kalimantan' },
  'KU': { name: 'Kalimantan Utara (Tarakan / Bulungan / Nunukan)', island: 'Kalimantan' },

  // Sulawesi
  'DB': { name: 'Sulawesi Utara (Manado / Bitung / Minahasa / Tomohon)', island: 'Sulawesi' },
  'DL': { name: 'Kepulauan Sangihe / Talaud / Siau', island: 'Sulawesi' },
  'DM': { name: 'Gorontalo', island: 'Sulawesi' },
  'DN': { name: 'Sulawesi Tengah (Palu / Donggala / Tolitoli)', island: 'Sulawesi' },
  'DP': { name: 'Sulawesi Selatan (Parepare / Palopo / Barru / Pinrang)', island: 'Sulawesi' },
  'DD': { name: 'Sulawesi Selatan (Makassar / Gowa / Maros / Pangkep)', island: 'Sulawesi' },
  'DC': { name: 'Sulawesi Barat (Mamuju / Majene / Polewali Mandar)', island: 'Sulawesi' },
  'DT': { name: 'Sulawesi Tenggara (Kendari / Bau-Bau / Kolaka)', island: 'Sulawesi' },

  // Maluku & Papua
  'DE': { name: 'Maluku (Ambon / Maluku Tengah / Buru)', island: 'Maluku' },
  'DG': { name: 'Maluku Utara (Ternate / Tidore)', island: 'Maluku' },
  'PA': { name: 'Papua (Jayapura / Keerom / Sarmi)', island: 'Papua' },
  'PB': { name: 'Papua Barat (Manokwari / Sorong / Fakfak)', island: 'Papua' },
};

export function getRegionInfo(prefix: string): { code: string; name: string; island: string } | null {
  if (!prefix) return null;
  const cleanPrefix = prefix.trim().toUpperCase();
  const info = INDONESIAN_PLATE_REGIONS[cleanPrefix];
  if (info) {
    return { code: cleanPrefix, name: info.name, island: info.island };
  }
  return null;
}
