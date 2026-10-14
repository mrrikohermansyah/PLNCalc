import { PERIODS, PERIOD_LABELS } from '../../core/constants.js';
import { formatRupiah, formatKWh, formatWatt, formatKW, formatInteger, formatDuration } from '../../core/format.js';
import { el } from '../dom.js';

function rangeText(result, key, period, formatter) {
  if (result.power.isRange && result[`${key}Range`]) {
    return `${formatter(result[`${key}Range`].min[period])} – ${formatter(result[`${key}Range`].max[period])}`;
  }
  return formatter(result[key][period]);
}

export function createResultsPanel({ onPeriodChange = () => {} } = {}) {
  let period = 'perMonth';
  let currentResult = null;

  const root = el('div', { class: 'results' });

  const hero = el('div', { class: 'result-hero' });
  const heroLabel = el('span', { class: 'hero-label', text: 'Estimasi biaya' });
  const heroValue = el('span', { class: 'hero-value', text: 'Rp—' });
  const heroSub = el('span', { class: 'hero-sub', text: 'Isi data perangkat untuk melihat hasil' });
  hero.append(heroLabel, heroValue, heroSub);

  const tabs = el('div', { class: 'period-tabs', role: 'tablist', 'aria-label': 'Pilih periode tampilan' });
  const tabButtons = {};
  for (const p of PERIODS) {
    const btn = el('button', {
      class: 'period-tab',
      type: 'button',
      role: 'tab',
      text: PERIOD_LABELS[p].replace('Per ', ''),
      'aria-selected': 'false',
      dataset: { period: p },
      on: {
        click: () => {
          setPeriod(p);
        },
      },
    });
    tabButtons[p] = btn;
    tabs.appendChild(btn);
  }

  const cards = el('div', { class: 'result-cards' });
  const cardRefs = {};
  for (const key of ['powerUnit', 'powerTotal', 'energy', 'cost', 'costUnit', 'costAll']) {
    const value = el('span', { class: 'card-value', text: '—' });
    const card = el(
      'div',
      { class: 'result-card' },
      el('span', { class: 'card-label', text: '' }),
      value
    );
    cardRefs[key] = { card, value, label: card.querySelector('.card-label') };
    cards.appendChild(card);
  }
  cardRefs.powerUnit.label.textContent = 'Daya per unit';
  cardRefs.powerTotal.label.textContent = 'Total daya';
  cardRefs.energy.label.textContent = 'Konsumsi energi';
  cardRefs.cost.label.textContent = 'Estimasi biaya';
  cardRefs.costUnit.label.textContent = 'Biaya per unit';
  cardRefs.costAll.label.textContent = 'Biaya seluruh unit';

  const table = el('table', { class: 'result-table' });
  const tbody = el('tbody');
  table.append(
    el(
      'thead',
      {},
      el(
        'tr',
        {},
        el('th', { scope: 'col', text: 'Periode' }),
        el('th', { scope: 'col', text: 'Konsumsi (kWh)' }),
        el('th', { scope: 'col', text: 'Biaya' }),
        el('th', { scope: 'col', text: 'Biaya per unit' })
      )
    ),
    tbody
  );
  const tableRows = {};
  for (const p of PERIODS) {
    const tr = el('tr', { dataset: { period: p } });
    const cells = {
      period: el('th', { scope: 'row', text: PERIOD_LABELS[p] }),
      energy: el('td', { text: '—' }),
      cost: el('td', { text: '—' }),
      perUnit: el('td', { text: '—' }),
    };
    tr.append(cells.period, cells.energy, cells.cost, cells.perUnit);
    tbody.appendChild(tr);
    tableRows[p] = { tr, cells };
  }

  const assumptions = el('div', { class: 'assumptions' });
  const assumptionsTitle = el('h3', { class: 'assumptions-title', text: 'Catatan & asumsi' });
  const assumptionsList = el('ul', { class: 'assumptions-list' });
  assumptions.append(assumptionsTitle, assumptionsList);
  assumptions.hidden = true;

  const emptyState = el('p', { class: 'empty-hint', text: 'Hasil akan muncul otomatis saat Anda mengisi nama dan daya perangkat.' });

  root.append(hero, tabs, emptyState, cards, table, assumptions);
  cards.hidden = true;
  table.hidden = true;

  function setPeriod(next) {
    period = next;
    for (const [p, btn] of Object.entries(tabButtons)) {
      const active = p === period;
      btn.classList.toggle('period-tab--active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    }
    for (const [p, row] of Object.entries(tableRows)) {
      row.tr.classList.toggle('result-table__row--active', p === period);
    }
    if (currentResult) update(currentResult);
    onPeriodChange(period);
  }

  function update(result) {
    currentResult = result;
    if (!result) {
      emptyState.hidden = false;
      cards.hidden = true;
      table.hidden = true;
      assumptions.hidden = true;
      heroValue.textContent = 'Rp—';
      heroSub.textContent = 'Isi data perangkat untuk melihat hasil';
      return;
    }
    emptyState.hidden = true;
    cards.hidden = false;
    table.hidden = false;

    const { input, power } = result;
    heroLabel.textContent = `Estimasi biaya ${PERIOD_LABELS[period].toLowerCase()}`;
    heroValue.textContent = rangeText(result, 'cost', period, formatRupiah);
    heroSub.textContent = `${rangeText(result, 'energy', period, formatKWh)} · ${formatDuration(
      result.schedule.hoursPerDay
    )} · ${formatInteger(result.schedule.daysPerMonth)} hari/bulan`;

    cardRefs.powerUnit.value.textContent = formatWatt(power.perUnitW);
    cardRefs.powerTotal.value.textContent = power.totalW >= 1000
      ? `${formatWatt(power.totalW)} (${formatKW(power.totalKW)})`
      : formatWatt(power.totalW);
    cardRefs.energy.value.textContent = rangeText(result, 'energy', period, formatKWh);
    cardRefs.cost.value.textContent = rangeText(result, 'cost', period, formatRupiah);
    cardRefs.costUnit.value.textContent = formatRupiah(result.perUnitCost[period]);
    cardRefs.costAll.value.textContent = formatRupiah(result.cost[period]);
    cardRefs.energy.label.textContent = `Konsumsi energi ${PERIOD_LABELS[period].toLowerCase()}`;
    cardRefs.cost.label.textContent = `Estimasi biaya ${PERIOD_LABELS[period].toLowerCase()}`;
    cardRefs.costUnit.label.textContent = `Biaya per unit (${PERIOD_LABELS[period].toLowerCase()})`;
    cardRefs.costAll.label.textContent = `Biaya ${formatInteger(input.quantity)} unit (${PERIOD_LABELS[period].toLowerCase()})`;

    for (const p of PERIODS) {
      const row = tableRows[p];
      row.cells.energy.textContent = rangeText(result, 'energy', p, formatKWh);
      row.cells.cost.textContent = rangeText(result, 'cost', p, formatRupiah);
      row.cells.perUnit.textContent = formatRupiah(result.perUnitCost[p]);
    }

    assumptionsList.replaceChildren();
    const notes = [
      ...result.assumptions,
      `Tarif yang dipakai: ${formatRupiah(result.tariff)}/kWh${input.tariffName ? ` (${input.tariffName})` : ''}.`,
      power.isRange
        ? 'Angka rentang adalah estimasi dari daya minimum dan maksimum yang Anda masukkan.'
        : null,
    ].filter(Boolean);
    for (const note of notes) assumptionsList.appendChild(el('li', { text: note }));
    assumptions.hidden = notes.length === 0;
  }

  setPeriod('perMonth');

  return { root, update, setPeriod, getPeriod: () => period };
}
