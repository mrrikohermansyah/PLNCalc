import { el } from '../dom.js';
import { iconEl } from '../icons.js';
import { calculateDevice, calculateSavings } from '../../core/engine.js';
import { formatRupiah, formatPercent } from '../../core/format.js';

export function createSavingsPanel() {
  let baseResult = null;

  const root = el('section', { class: 'panel savings-panel', 'aria-label': 'Simulasi penghematan' });
  root.append(
    el(
      'div',
      { class: 'panel-head' },
      el('h2', { class: 'panel-title', text: 'Simulasi Penghematan' }),
      el('p', { class: 'panel-sub', text: 'Bandingkan skenario penggunaan, daya, jumlah unit, atau tarif listrik.' })
    )
  );

  const empty = el('p', { class: 'empty-hint', text: 'Isi perhitungan perangkat di atas terlebih dahulu untuk memulai simulasi.' });
  root.appendChild(empty);

  const body = el('div', { class: 'savings-body' });
  body.hidden = true;
  root.appendChild(body);

  const inputs = {};
  const controls = el('div', { class: 'savings-controls' });

  function field(labelText, attrs) {
    const control = el('input', { class: 'input', type: 'number', step: 'any', ...attrs });
    const wrap = el('div', { class: 'field' }, el('label', { class: 'field-label', text: labelText }), control);
    control.addEventListener('input', compare);
    return { wrap, control };
  }

  const power = field('Daya baru per unit (W)', { min: '0', 'aria-label': 'Daya baru per unit dalam watt' });
  const hours = field('Jam/hari baru', { min: '0', max: '24', step: '0.25' });
  const quantity = field('Jumlah unit baru', { min: '1', step: '1' });
  const tariff = field('Tarif baru (Rp/kWh)', { min: '0' });
  inputs.power = power.control;
  inputs.hours = hours.control;
  inputs.quantity = quantity.control;
  inputs.tariff = tariff.control;
  controls.append(power.wrap, hours.wrap, quantity.wrap, tariff.wrap);

  const resetButton = el(
    'button',
    { class: 'btn btn--ghost btn--sm', type: 'button' },
    iconEl('refresh', { size: 16 }),
    el('span', { text: 'Samakan dengan skenario awal' })
  );
  resetButton.addEventListener('click', () => {
    syncInputs();
    compare();
  });
  controls.appendChild(el('div', { class: 'savings-controls__foot' }, resetButton));

  body.appendChild(controls);

  const output = el('div', { class: 'savings-output' });
  const cards = {};
  for (const key of ['current', 'next', 'diff', 'year', 'percent']) {
    const value = el('span', { class: 'card-value', text: '—' });
    const label = el('span', { class: 'card-label', text: '' });
    cards[key] = { value, label, card: el('div', { class: 'result-card' }, label, value) };
    output.appendChild(cards[key].card);
  }
  cards.current.label.textContent = 'Biaya awal / bulan';
  cards.next.label.textContent = 'Biaya baru / bulan';
  cards.diff.label.textContent = 'Selisih / bulan';
  cards.year.label.textContent = 'Selisih / tahun';
  cards.percent.label.textContent = 'Perubahan';

  const verdict = el('p', { class: 'savings-verdict', text: '' });
  body.append(output, verdict, el('p', { class: 'field-hint', text: 'Semua angka simulasi adalah estimasi berdasarkan input daya, durasi, dan tarif.' }));

  function syncInputs() {
    if (!baseResult) return;
    const { input, power: powerInfo } = baseResult;
    inputs.power.value = String(Math.round(powerInfo.perUnitW * 1000) / 1000);
    inputs.hours.value = String(baseResult.schedule.hoursPerDay);
    inputs.quantity.value = String(input.quantity);
    inputs.tariff.value = String(input.tariff);
  }

  function compare() {
    if (!baseResult) return;
    const { input } = baseResult;

    const nextValues = {
      ...input,
      powerValue: Number(inputs.power.value),
      powerUnit: 'W',
      calcMode: 'constant',
      powerMin: null,
      powerMax: null,
      hoursPerDay: Number(inputs.hours.value),
      extraMinutes: 0,
      quantity: Number(inputs.quantity.value),
      tariff: Number(inputs.tariff.value),
    };

    const invalid =
      !Number.isFinite(nextValues.powerValue) ||
      nextValues.powerValue < 0 ||
      !Number.isFinite(nextValues.hoursPerDay) ||
      nextValues.hoursPerDay < 0 ||
      nextValues.hoursPerDay > 24 ||
      !Number.isInteger(nextValues.quantity) ||
      nextValues.quantity < 1 ||
      !Number.isFinite(nextValues.tariff) ||
      nextValues.tariff < 0;

    if (invalid) {
      verdict.textContent = 'Isian skenario baru belum valid. Periksa nilai daya, jam, jumlah unit, dan tarif.';
      verdict.className = 'savings-verdict savings-verdict--warn';
      for (const key of Object.keys(cards)) cards[key].value.textContent = '—';
      return;
    }

    const currentFlat = calculateDevice({
      ...input,
      calcMode: 'constant',
      powerValue: baseResult.power.perUnitW,
      powerUnit: 'W',
      extraMinutes: 0,
      hoursPerDay: baseResult.schedule.hoursPerDay,
      daysPerMonth: input.daysPerMonth ?? '',
      daysPerYear: input.daysPerYear ?? '',
    });
    const nextResult = calculateDevice({
      ...nextValues,
      daysPerWeek: input.daysPerWeek,
      daysPerMonth: input.daysPerMonth ?? '',
      daysPerYear: input.daysPerYear ?? '',
    });

    const savings = calculateSavings(currentFlat, nextResult);
    cards.current.value.textContent = formatRupiah(savings.currentMonthly);
    cards.next.value.textContent = formatRupiah(savings.newMonthly);
    cards.diff.value.textContent = formatRupiah(savings.savingsMonthly);
    cards.year.value.textContent = formatRupiah(savings.savingsYearly);
    cards.percent.value.textContent = formatPercent(savings.percentage);
    cards.diff.value.classList.toggle('value--good', savings.savingsMonthly > 0);
    cards.diff.value.classList.toggle('value--bad', savings.savingsMonthly < 0);
    cards.year.value.classList.toggle('value--good', savings.savingsYearly > 0);
    cards.year.value.classList.toggle('value--bad', savings.savingsYearly < 0);

    if (savings.savingsMonthly > 0) {
      verdict.className = 'savings-verdict savings-verdict--good';
      verdict.textContent = `Estimasi penghematan ${formatRupiah(savings.savingsMonthly)} per bulan atau ${formatRupiah(
        savings.savingsYearly
      )} per tahun (${formatPercent(savings.percentage)}).`;
    } else if (savings.savingsMonthly < 0) {
      verdict.className = 'savings-verdict savings-verdict--bad';
      verdict.textContent = `Biaya justru meningkat ${formatRupiah(Math.abs(savings.savingsMonthly))} per bulan (${formatPercent(
        Math.abs(savings.percentage)
      )}).`;
    } else {
      verdict.className = 'savings-verdict';
      verdict.textContent = 'Tidak ada perubahan biaya antara kedua skenario.';
    }
  }

  function update(result) {
    baseResult = result;
    const has = Boolean(result);
    empty.hidden = has;
    body.hidden = !has;
    if (has) {
      syncInputs();
      compare();
    }
  }

  return { root, update, compare };
}
