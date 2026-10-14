const LOCALE = 'id-ID';

const rupiahFmt = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const rupiahCompactFmt = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const kwhReceiptFmt = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const kwhSmartFmt = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});

const wattFmt = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const integerFmt = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

export function formatRupiah(value) {
  if (!Number.isFinite(value)) return 'Rp—';
  return rupiahFmt.format(value).replace(/Rp[\s\u00A0]+/, 'Rp');
}

export function formatRupiahSmart(value) {
  if (!Number.isFinite(value)) return 'Rp—';
  return rupiahCompactFmt.format(value).replace(/Rp[\s\u00A0]+/, 'Rp');
}

export function formatKWhReceipt(value) {
  if (!Number.isFinite(value)) return '— kWh';
  return `${kwhReceiptFmt.format(value)} kWh`;
}

export function formatKWh(value) {
  if (!Number.isFinite(value)) return '— kWh';
  return `${kwhSmartFmt.format(value)} kWh`;
}

export function formatWatt(value) {
  if (!Number.isFinite(value)) return '— W';
  if (value >= 1000) return `${integerFmt.format(Math.round(value))} W`;
  return `${wattFmt.format(value)} W`;
}

export function formatKW(value) {
  if (!Number.isFinite(value)) return '— kW';
  return `${wattFmt.format(value)} kW`;
}

export function formatInteger(value) {
  if (!Number.isFinite(value)) return '—';
  return integerFmt.format(value);
}

export function formatPercent(value, fractionDigits = 1) {
  if (!Number.isFinite(value)) return '—';
  return `${new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value)}%`;
}

export function formatDuration(hoursPerDay) {
  if (!Number.isFinite(hoursPerDay)) return '—';
  const h = Math.floor(hoursPerDay);
  const m = Math.round((hoursPerDay - h) * 60);
  if (h === 0) return `${m} menit/hari`;
  if (m === 0) return `${h} jam/hari`;
  return `${h} jam ${m} menit/hari`;
}

export function formatDateID(isoDate) {
  const date = isoDate instanceof Date ? isoDate : new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatDateFile(isoDate) {
  const date = isoDate instanceof Date ? isoDate : new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'tanggal';
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

export function parseNumberID(text) {
  if (typeof text !== 'string') return Number(text);
  const trimmed = text.trim();
  if (trimmed === '') return NaN;
  const hasComma = trimmed.includes(',');
  const normalized = hasComma
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed;
  return Number(normalized);
}

export function sanitizeFilename(text, maxLength = 40) {
  const cleaned = String(text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);
  return cleaned || 'perangkat';
}
