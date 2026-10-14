export const APP_NAME = 'PLNCalc';
export const APP_TAGLINE = 'Ketahui Konsumsi. Kendalikan Biaya.';
export const SCHEMA_VERSION = 1;

export const POWER_METHODS = {
  nominal: { id: 'nominal', label: 'Daya nominal' },
  average: { id: 'average', label: 'Daya rata-rata' },
  measured: { id: 'measured', label: 'Daya hasil pengukuran' },
};

export const CALC_MODES = {
  constant: { id: 'constant', label: 'Daya konstan' },
  average: { id: 'average', label: 'Daya rata-rata' },
  range: { id: 'range', label: 'Skenario min–maks' },
};

export const PERIODS = ['perHour', 'perDay', 'perWeek', 'perMonth', 'perYear'];

export const PERIOD_LABELS = {
  perHour: 'Per jam',
  perDay: 'Per hari',
  perWeek: 'Per minggu',
  perMonth: 'Per bulan',
  perYear: 'Per tahun',
};

export const CATEGORIES = [
  'Pendingin dan ventilasi',
  'Pendingin makanan',
  'Komputer dan IT',
  'Televisi dan hiburan',
  'Penerangan',
  'Dapur',
  'Mesin cuci dan perawatan pakaian',
  'Pompa dan peralatan air',
  'Peralatan kantor',
  'Perangkat jaringan dan CCTV',
  'Perkakas dan mesin',
  'Pemanas',
  'Elektronik rumah tangga lainnya',
  'Peralatan industri',
  'Kustom',
];

export const DEFAULTS = {
  tariff: 1444.7,
  tariffName: 'Tarif contoh (bukan tarif PLN resmi)',
  daysPerMonth: 30,
  daysPerYear: 365,
  hoursPerDay: 8,
  daysPerWeek: 7,
};

export const RECEIPT_DISCLAIMER =
  'Hasil adalah estimasi berdasarkan daya, durasi, dan tarif yang diinput. Konsumsi aktual dapat berbeda.';
