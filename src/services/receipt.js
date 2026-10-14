import {
  PERIODS,
  PERIOD_LABELS,
  POWER_METHODS,
  CALC_MODES,
  RECEIPT_DISCLAIMER,
} from '../core/constants.js';
import {
  formatRupiah,
  formatKWhReceipt,
  formatWatt,
  formatInteger,
  formatDuration,
  formatDateID,
  formatPercent,
} from '../core/format.js';
import { buildFormulas } from '../core/engine.js';

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function row(key, value) {
  return { key, value: String(value) };
}

function energyValue(result, period) {
  if (result.power.isRange) {
    return `${formatKWhReceipt(result.energyRange.min[period])} – ${formatKWhReceipt(
      result.energyRange.max[period]
    )}`;
  }
  return formatKWhReceipt(result.energy[period]);
}

function costValue(result, period) {
  if (result.power.isRange) {
    return `${formatRupiah(result.costRange.min[period])} – ${formatRupiah(result.costRange.max[period])}`;
  }
  return formatRupiah(result.cost[period]);
}

export function buildReceiptData(result, { mode = 'detail', reportNumber = null, date = null } = {}) {
  const { input, power, schedule, tariff } = result;
  const detail = mode === 'detail';

  const meta = [
    row('Nomor laporan', reportNumber ?? result.reportNumber ?? '—'),
    row('Tanggal', formatDateID(date ?? result.generatedAt ?? new Date())),
  ];

  const device = [
    row('Perangkat', input.name),
    row('Kategori', input.category),
    row('Merek', input.brand || '—'),
    row('Model', input.model || '—'),
    row('Jumlah', `${formatInteger(input.quantity)} unit`),
  ];
  if (detail && input.notes) device.push(row('Catatan', input.notes));

  const powerSection = {
    title: 'RINCIAN DAYA',
    rows: [
      row('Daya per unit', formatWatt(power.perUnitW)),
      row('Total daya', `${formatWatt(power.totalW)} (${(power.totalKW).toLocaleString('id-ID', { maximumFractionDigits: 4 })} kW)`),
      row('Metode', POWER_METHODS[power.method]?.label ?? power.method),
      row('Mode', CALC_MODES[power.calcMode]?.label ?? power.calcMode),
      row('Durasi', formatDuration(schedule.hoursPerDay)),
      row('Hari operasi', `${formatInteger(schedule.daysPerMonth)} hari/bulan`),
      row('Tarif', `${formatRupiah(tariff)}/kWh`),
    ],
  };
  if (power.isRange) {
    powerSection.rows.splice(2, 0, row('Rentang daya', `${formatWatt(power.rangeW.min)} – ${formatWatt(power.rangeW.max)}`));
  }

  const energySection = {
    title: 'KONSUMSI ENERGI',
    rows: PERIODS.map((period) => row(PERIOD_LABELS[period], energyValue(result, period))),
  };

  const costSection = {
    title: 'ESTIMASI BIAYA',
    rows: PERIODS.map((period) => row(PERIOD_LABELS[period], costValue(result, period))),
  };

  const sections = [powerSection, energySection, costSection];

  if (detail) {
    sections.push({
      title: 'BIAYA PER UNIT',
      rows: [
        row('Per bulan (1 unit)', formatRupiah(result.perUnitCost.perMonth)),
        row(`Per bulan (${formatInteger(input.quantity)} unit)`, formatRupiah(result.cost.perMonth)),
      ],
    });
    sections.push({
      title: 'FORMULA',
      rows: buildFormulas(result).map((line, i) => row(`${i + 1}.`, line)),
    });
    sections.push({
      title: 'ASUMSI',
      rows: result.assumptions.map((text, i) => row(`${i + 1}.`, text)),
    });
  }

  return {
    type: 'single',
    mode: detail ? 'detail' : 'ringkas',
    header: { title: 'PLNCalc', subtitle: 'KALKULATOR BIAYA LISTRIK' },
    meta,
    device,
    sections,
    notes: detail
      ? [RECEIPT_DISCLAIMER, 'Perangkat dengan konsumsi berubah-ubah (kulkas, AC inverter, PC) sebaiknya dihitung dengan daya rata-rata atau hasil pengukuran.', ...(input.notes ? [`Catatan pengguna: ${input.notes}`] : [])]
      : [RECEIPT_DISCLAIMER],
    footer: { line1: 'Ketahui Konsumsi.', line2: 'Kendalikan Biaya.' },
  };
}

export function buildCombinedReceiptData(multi, { mode = 'detail', reportNumber = null, date = null, tariffLabel = null } = {}) {
  const detail = mode === 'detail';
  const meta = [
    row('Nomor laporan', reportNumber ?? '—'),
    row('Tanggal', formatDateID(date ?? new Date())),
    row('Jumlah perangkat', `${formatInteger(multi.results.length)} jenis`),
    row('Total unit', `${formatInteger(multi.results.reduce((s, r) => s + r.input.quantity, 0))} unit`),
  ];

  const deviceRows = multi.results.map((r) =>
    row(
      `${r.input.name}${r.input.quantity > 1 ? ` ×${r.input.quantity}` : ''}`,
      `${formatWatt(r.power.totalW)} · ${formatKWhReceipt(r.energy.perMonth)} · ${formatRupiah(r.cost.perMonth)}/bln`
    )
  );

  const sections = [
    { title: 'RINCIAN PERANGKAT (daya · kWh/bln · biaya/bln)', rows: deviceRows },
    {
      title: 'TOTAL KONSUMSI ENERGI',
      rows: PERIODS.map((period) => row(PERIOD_LABELS[period], formatKWhReceipt(multi.totalEnergy[period]))),
    },
    {
      title: 'TOTAL ESTIMASI BIAYA',
      rows: PERIODS.map((period) => row(PERIOD_LABELS[period], formatRupiah(multi.totalCost[period]))),
    },
  ];

  if (detail) {
    sections.push({
      title: 'KONTRIBUSI BIAYA BULANAN',
      rows: multi.contribution.map((c) => row(c.name, `${formatRupiah(c.costPerMonth)} (${formatPercent(c.percentage)})`)),
    });
    if (tariffLabel) sections.push({ title: 'TARIF', rows: [row('Keterangan', tariffLabel)] });
    sections.push({
      title: 'ASUMSI',
      rows: multi.assumptions.map((text, i) => row(`${i + 1}.`, text)),
    });
  }

  return {
    type: 'combined',
    mode: detail ? 'detail' : 'ringkas',
    header: { title: 'PLNCalc', subtitle: 'RINCIAN BIAYA MULTI-PERANGKAT' },
    meta,
    device: [],
    sections,
    notes: [RECEIPT_DISCLAIMER],
    footer: { line1: 'Ketahui Konsumsi.', line2: 'Kendalikan Biaya.' },
  };
}

export function renderReceiptHtml(data) {
  const parts = [];
  parts.push('<div class="rc-head">');
  parts.push(`<div class="rc-brand">${escapeHtml(data.header.title)}</div>`);
  parts.push(`<div class="rc-subtitle">${escapeHtml(data.header.subtitle)}</div>`);
  parts.push('</div>');

  const renderRows = (rows) =>
    rows
      .map(
        (r) =>
          `<div class="rc-row"><span class="rc-key">${escapeHtml(r.key)}</span><span class="rc-leader"></span><span class="rc-val">${escapeHtml(r.value)}</span></div>`
      )
      .join('');

  parts.push(`<div class="rc-section">${renderRows(data.meta)}</div>`);
  if (data.device?.length) parts.push(`<div class="rc-section">${renderRows(data.device)}</div>`);

  for (const section of data.sections) {
    parts.push('<div class="rc-section">');
    parts.push(`<div class="rc-section-title">${escapeHtml(section.title)}</div>`);
    parts.push(renderRows(section.rows));
    parts.push('</div>');
  }

  parts.push('<div class="rc-section">');
  parts.push('<div class="rc-section-title">CATATAN</div>');
  for (const note of data.notes) {
    parts.push(`<div class="rc-note">${escapeHtml(note)}</div>`);
  }
  parts.push('</div>');

  parts.push('<div class="rc-foot">');
  parts.push(`<div class="rc-foot-line">${escapeHtml(data.footer.line1)}</div>`);
  parts.push(`<div class="rc-foot-line">${escapeHtml(data.footer.line2)}</div>`);
  parts.push('</div>');

  return parts.join('');
}

export function renderReceiptInto(container, data) {
  container.innerHTML = renderReceiptHtml(data);
  container.dataset.receiptMode = data.mode;
  container.dataset.receiptType = data.type;
}
