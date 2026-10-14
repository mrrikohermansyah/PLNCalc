import { storage as globalStorage } from './storage.js';
import { SCHEMA_VERSION } from '../core/constants.js';

const PRESETS_KEY = 'presets';

const SEED = [
  // Pendingin dan ventilasi
  { name: 'AC 1/2 PK (split)', category: 'Pendingin dan ventilasi', watts: 380, source: 'Contoh umum label AC 1/2 PK', variation: 'AC inverter menurunkan daya saat suhu mendekati target; non-inverter lebih konstan saat kompresor menyala.', method: 'average' },
  { name: 'AC 1 PK (split)', category: 'Pendingin dan ventilasi', watts: 750, source: 'Contoh umum label AC 1 PK', variation: 'Konsumsi berubah mengikuti beban panas ruangan.', method: 'average' },
  { name: 'Kipas angin berdiri', category: 'Pendingin dan ventilasi', watts: 55, source: 'Contoh umum kipas 16 inci', variation: 'Kecepatan tinggi/rendah mengubah daya.', method: 'nominal' },
  { name: 'Kipas angin dinding', category: 'Pendingin dan ventilasi', watts: 60, source: 'Contoh umum', variation: 'Kecepatan mengubah daya.', method: 'nominal' },
  { name: 'Exhaust fan', category: 'Pendingin dan ventilasi', watts: 30, source: 'Contoh umum', variation: 'Relatif konstan.', method: 'nominal' },
  { name: 'Air purifier', category: 'Pendingin dan ventilasi', watts: 45, source: 'Contoh umum', variation: 'Mode turbo lebih boros dari mode malam.', method: 'average' },

  // Pendingin makanan
  { name: 'Kulkas 2 pintu', category: 'Pendingin makanan', watts: 120, source: 'Contoh estimasi; konsumsi nyata berbentuk siklus hidup-mati', variation: 'Kompresor hidup-mati; lebih baik memakai estimasi rata-rata harian.', method: 'average' },
  { name: 'Kulkas 1 pintu', category: 'Pendingin makanan', watts: 80, source: 'Contoh estimasi', variation: 'Siklus kompresor memengaruhi rata-rata.', method: 'average' },
  { name: 'Freezer box', category: 'Pendingin makanan', watts: 150, source: 'Contoh estimasi', variation: 'Daya tinggi saat baru dinyalakan, turun saat suhu stabil.', method: 'average' },
  { name: 'Showcase chiller', category: 'Pendingin makanan', watts: 250, source: 'Contoh umum komersial', variation: 'Frekuensi buka pintu memengaruhi konsumsi.', method: 'average' },

  // Komputer dan IT
  { name: 'Laptop', category: 'Komputer dan IT', watts: 65, source: 'Contoh adaptor laptop umum', variation: 'Charging dan beban berat menaikkan daya; idle jauh lebih rendah.', method: 'average' },
  { name: 'PC desktop (kantor)', category: 'Komputer dan IT', watts: 150, source: 'Contoh PSU umum', variation: 'Beban CPU/GPU mengubah konsumsi.', method: 'average' },
  { name: 'PC gaming', category: 'Komputer dan IT', watts: 450, source: 'Contoh konfigurasi gaming menengah', variation: 'Gaming jauh lebih boros dari idle.', method: 'range' },
  { name: 'Monitor LED 24"', category: 'Komputer dan IT', watts: 25, source: 'Contoh umum', variation: 'Kecerahan memengaruhi daya.', method: 'nominal' },
  { name: 'Printer inkjet', category: 'Komputer dan IT', watts: 30, source: 'Contoh umum (saat mencetak lebih tinggi)', variation: 'Daya saat mencetak jauh lebih besar dari standby.', method: 'average' },
  { name: 'Server rack', category: 'Komputer dan IT', watts: 350, source: 'Contoh umum', variation: 'Sangat bergantung beban kerja; gunakan daya rata-rata dari pengukuran.', method: 'measured' },

  // Televisi dan hiburan
  { name: 'TV LED 32"', category: 'Televisi dan hiburan', watts: 45, source: 'Contoh umum', variation: 'Kecerahan dan konten memengaruhi daya.', method: 'nominal' },
  { name: 'TV LED 55"', category: 'Televisi dan hiburan', watts: 95, source: 'Contoh umum', variation: 'Mode HDR menaikkan konsumsi.', method: 'nominal' },
  { name: 'Speaker aktif', category: 'Televisi dan hiburan', watts: 40, source: 'Contoh umum', variation: 'Volume memengaruhi daya.', method: 'average' },
  { name: 'Konsol game', category: 'Televisi dan hiburan', watts: 120, source: 'Contoh umum', variation: 'Saat gaming jauh lebih tinggi dari standby.', method: 'range' },

  // Penerangan
  { name: 'Lampu LED 9 W', category: 'Penerangan', watts: 9, source: 'Contoh label lampu', variation: 'Relatif konstan.', method: 'nominal' },
  { name: 'Lampu LED 12 W', category: 'Penerangan', watts: 12, source: 'Contoh label lampu', variation: 'Relatif konstan.', method: 'nominal' },
  { name: 'Lampu LED 18 W', category: 'Penerangan', watts: 18, source: 'Contoh label lampu', variation: 'Relatif konstan.', method: 'nominal' },
  { name: 'Lampu pijar 60 W', category: 'Penerangan', watts: 60, source: 'Contoh label lampu konvensional', variation: 'Konvensional lebih boros dari LED.', method: 'nominal' },
  { name: 'Lampu TL 40 W', category: 'Penerangan', watts: 40, source: 'Contoh label lampu TL', variation: 'Ballast menambah sedikit konsumsi.', method: 'nominal' },

  // Dapur
  { name: 'Rice cooker (memasak)', category: 'Dapur', watts: 350, source: 'Contoh label rice cooker', variation: 'Mode memasak tinggi; mode menghangatkan jauh lebih rendah.', method: 'range' },
  { name: 'Microwave', category: 'Dapur', watts: 800, source: 'Contoh daya input microwave', variation: 'Daya input lebih besar dari daya output panas.', method: 'nominal' },
  { name: 'Oven listrik', category: 'Dapur', watts: 1200, source: 'Contoh umum', variation: 'Elemen pemanas hidup-mati menjaga suhu.', method: 'average' },
  { name: 'Air fryer', category: 'Dapur', watts: 1300, source: 'Contoh umum', variation: 'Siklus pemanasan on/off.', method: 'average' },
  { name: 'Blender', category: 'Dapur', watts: 300, source: 'Contoh umum', variation: 'Pemakaian singkat (menit).', method: 'nominal' },
  { name: 'Dispenser (hot & cold)', category: 'Dapur', watts: 300, source: 'Contoh estimasi gabungan pemanas+pendingin', variation: 'Pemanas/pendingin bekerja bergantian.', method: 'average' },
  { name: 'Water heater listrik', category: 'Dapur', watts: 350, source: 'Contoh umum', variation: 'Daya besar saat memanaskan air.', method: 'nominal' },

  // Mesin cuci dan perawatan pakaian
  { name: 'Mesin cuci', category: 'Mesin cuci dan perawatan pakaian', watts: 350, source: 'Contoh umum (tanpa pemanas air)', variation: 'Siklus mencuci/bilas/spin berbeda; pemanas air jauh lebih besar.', method: 'range' },
  { name: 'Pengering pakaian', category: 'Mesin cuci dan perawatan pakaian', watts: 2000, source: 'Contoh umum', variation: 'Elemen pemanas dominan.', method: 'nominal' },
  { name: 'Setrika', category: 'Mesin cuci dan perawatan pakaian', watts: 350, source: 'Contoh umum', variation: 'Elemen hidup-mati sesuai termostat.', method: 'average' },
  { name: 'Vacuum cleaner', category: 'Mesin cuci dan perawatan pakaian', watts: 800, source: 'Contoh umum', variation: 'Kecepatan hisap mengubah daya.', method: 'nominal' },

  // Pompa dan peralatan air
  { name: 'Pompa air 125 W', category: 'Pompa dan peralatan air', watts: 125, source: 'Contoh label pompa', variation: 'Pompa menyala saat tekanan turun.', method: 'average' },
  { name: 'Pompa air 250 W', category: 'Pompa dan peralatan air', watts: 250, source: 'Contoh label pompa', variation: 'Pompa menyala saat tekanan turun.', method: 'average' },

  // Peralatan kantor
  { name: 'Mesin fotokopi', category: 'Peralatan kantor', watts: 1000, source: 'Contoh umum', variation: 'Saat menyalin jauh lebih tinggi dari standby.', method: 'average' },
  { name: 'Proyektor', category: 'Peralatan kantor', watts: 250, source: 'Contoh umum', variation: 'Lampu proyektor dominan.', method: 'nominal' },

  // Perangkat jaringan dan CCTV
  { name: 'Router WiFi', category: 'Perangkat jaringan dan CCTV', watts: 12, source: 'Contoh adaptor router umum', variation: 'Relatif konstan.', method: 'nominal' },
  { name: 'Access point', category: 'Perangkat jaringan dan CCTV', watts: 15, source: 'Contoh umum', variation: 'Relatif konstan.', method: 'nominal' },
  { name: 'Switch jaringan', category: 'Perangkat jaringan dan CCTV', watts: 20, source: 'Contoh umum', variation: 'Relatif konstan.', method: 'nominal' },
  { name: 'Kamera CCTV', category: 'Perangkat jaringan dan CCTV', watts: 8, source: 'Contoh umum', variation: 'Relatif konstan.', method: 'nominal' },
  { name: 'NVR/DVR', category: 'Perangkat jaringan dan CCTV', watts: 30, source: 'Contoh umum', variation: 'Relatif konstan.', method: 'nominal' },
  { name: 'NAS', category: 'Perangkat jaringan dan CCTV', watts: 40, source: 'Contoh umum', variation: 'Akses disk menaikkan daya.', method: 'average' },

  // Perkakas dan mesin
  { name: 'Kompresor angin', category: 'Perkakas dan mesin', watts: 750, source: 'Contoh umum', variation: 'Motor hidup-mati saat tekanan penuh.', method: 'average' },
  { name: 'Mesin gerinda', category: 'Perkakas dan mesin', watts: 600, source: 'Contoh umum', variation: 'Arus awal (starting) lebih tinggi.', method: 'nominal' },
  { name: 'Mesin bor listrik', category: 'Perkakas dan mesin', watts: 500, source: 'Contoh umum', variation: 'Beban mengebor mengubah daya.', method: 'nominal' },

  // Pemanas
  { name: 'Pemanas air listrik', category: 'Pemanas', watts: 2000, source: 'Contoh umum', variation: 'Elemen pemanas dominan.', method: 'nominal' },
  { name: 'Setrika uap', category: 'Pemanas', watts: 1800, source: 'Contoh umum', variation: 'Siklus pemanasan on/off.', method: 'average' },

  // Elektronik rumah tangga lainnya
  { name: 'Charger ponsel', category: 'Elektronik rumah tangga lainnya', watts: 15, source: 'Contoh adaptor umum', variation: 'Daya turun saat baterai penuh.', method: 'average' },
  { name: 'Kipas exhaust kamar mandi', category: 'Elektronik rumah tangga lainnya', watts: 20, source: 'Contoh umum', variation: 'Relatif konstan.', method: 'nominal' },
  { name: 'Set-top box TV', category: 'Elektronik rumah tangga lainnya', watts: 10, source: 'Contoh umum', variation: 'Relatif konstan.', method: 'nominal' },

  // Peralatan industri
  { name: 'Motor listrik 1 HP', category: 'Peralatan industri', watts: 746, source: '1 HP ≈ 746 W (mekanis); daya listrik input lebih besar', variation: 'Daya listrik nyata lebih besar karena efisiensi dan faktor daya.', method: 'measured' },
  { name: 'Mesin las listrik', category: 'Peralatan industri', watts: 2500, source: 'Contoh umum', variation: 'Arus las menentukan konsumsi; gunakan pengukuran.', method: 'measured' },
];

export const seedPresets = () =>
  SEED.map((preset, index) => ({
    id: `seed-${index + 1}`,
    schemaVersion: SCHEMA_VERSION,
    isSeed: true,
    name: preset.name,
    category: preset.category,
    watts: preset.watts,
    source: preset.source,
    variation: preset.variation,
    suggestedMethod: preset.method,
  }));

export function createPresetStore(store = globalStorage) {
  function load() {
    const saved = store.read(PRESETS_KEY, null);
    if (saved && typeof saved === 'object' && Array.isArray(saved.items)) return saved;
    return { items: seedPresets() };
  }

  let state = load();

  function persist() {
    store.write(PRESETS_KEY, state);
  }

  function list() {
    return state.items;
  }

  function get(id) {
    return state.items.find((p) => p.id === id) ?? null;
  }

  function add(preset) {
    const item = {
      id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      schemaVersion: SCHEMA_VERSION,
      isSeed: false,
      name: String(preset.name ?? '').trim(),
      category: preset.category ?? 'Kustom',
      watts: Number(preset.watts) || 0,
      source: String(preset.source ?? 'Ditambahkan pengguna').trim(),
      variation: String(preset.variation ?? '').trim(),
      suggestedMethod: preset.suggestedMethod ?? 'nominal',
    };
    state.items.push(item);
    persist();
    return item;
  }

  function update(id, patch) {
    const index = state.items.findIndex((p) => p.id === id);
    if (index === -1) return null;
    state.items[index] = { ...state.items[index], ...patch, id };
    persist();
    return state.items[index];
  }

  function remove(id) {
    const item = get(id);
    if (!item) return false;
    state.items = state.items.filter((p) => p.id !== id);
    persist();
    return true;
  }

  function resetSeeds() {
    const customs = state.items.filter((p) => !p.isSeed);
    state.items = [...seedPresets(), ...customs];
    persist();
    return state.items;
  }

  return { list, get, add, update, remove, resetSeeds, reload: () => { state = load(); } };
}

export const presetStore = createPresetStore();
