import { el, clear } from '../dom.js';
import { iconEl } from '../icons.js';
import { toastSuccess, toastError } from '../toast.js';
import { confirmDialog, createDialog } from '../modal.js';
import { createDeviceForm } from '../components/deviceForm.js';
import { createReceiptView } from '../components/receiptView.js';
import { validateDeviceInput, firstError, parseLocaleNumber } from '../../core/validate.js';
import { calculateMulti } from '../../core/engine.js';
import { buildCombinedReceiptData } from '../../services/receipt.js';
import { exportReceiptPng } from '../../services/pngExport.js';
import { generateReportNumber } from '../../core/reportNo.js';
import {
  formatRupiah,
  formatKWh,
  formatWatt,
  formatPercent,
  formatInteger,
  formatDuration,
  formatDateFile,
} from '../../core/format.js';

const STATE_KEY = 'multi';

const SAMPLE_DEVICES = [
  { name: 'AC 1 PK', category: 'Pendingin dan ventilasi', powerValue: 650, hoursPerDay: 10, powerMethod: 'average', calcMode: 'average' },
  { name: 'Laptop', category: 'Komputer dan IT', powerValue: 65, hoursPerDay: 8, powerMethod: 'nominal', calcMode: 'constant' },
  { name: 'PC Desktop', category: 'Komputer dan IT', powerValue: 300, hoursPerDay: 6, powerMethod: 'average', calcMode: 'average' },
  { name: 'TV LED 32"', category: 'Televisi dan hiburan', powerValue: 100, hoursPerDay: 5, powerMethod: 'nominal', calcMode: 'constant' },
  { name: 'Lampu LED', category: 'Penerangan', powerValue: 12, hoursPerDay: 8, quantity: 4, powerMethod: 'nominal', calcMode: 'constant' },
  { name: 'Router WiFi', category: 'Perangkat jaringan dan CCTV', powerValue: 12, hoursPerDay: 24, powerMethod: 'nominal', calcMode: 'constant' },
  { name: 'Kulkas 2 pintu', category: 'Pendingin makanan', powerValue: 100, hoursPerDay: 24, powerMethod: 'average', calcMode: 'average', notes: 'Daya rata-rata estimasi kompresor hidup-mati' },
];

function createUid() {
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function renderMultiPage(ctx, container) {
  const { settings, presets, storage } = ctx;

  const saved = storage.read(STATE_KEY, null);
  const state = {
    devices: Array.isArray(saved?.devices) ? saved.devices : [],
    globalTariff: Number.isFinite(saved?.globalTariff) ? saved.globalTariff : settings.get().tariff,
    sort: saved?.sort ?? 'cost-desc',
    reportNumber: saved?.reportNumber ?? generateReportNumber(),
  };

  let multi = null;

  const page = el('div', { class: 'page page--multi' });
  page.append(
    el(
      'div',
      { class: 'page-head' },
      el('h1', { class: 'page-title', text: 'Kalkulator Multi-Perangkat' }),
      el('p', {
        class: 'page-sub',
        text: 'Hitung beberapa perangkat sekaligus, lihat total energi, total biaya, dan kontribusi masing-masing perangkat.',
      })
    )
  );

  const toolbar = el('div', { class: 'toolbar' });
  const addButton = el(
    'button',
    { class: 'btn btn--primary', type: 'button' },
    iconEl('plus', { size: 16 }),
    el('span', { text: 'Tambah perangkat' })
  );
  addButton.addEventListener('click', () => openDeviceDialog());

  const sampleButton = el(
    'button',
    { class: 'btn btn--ghost', type: 'button' },
    iconEl('list', { size: 16 }),
    el('span', { text: 'Muat contoh rumah tangga' })
  );
  sampleButton.addEventListener('click', loadSample);

  const globalTariffField = el('div', { class: 'field field--inline' });
  const globalTariffInput = el('input', {
    class: 'input',
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    id: 'multi-global-tariff',
    value: String(state.globalTariff),
    'aria-label': 'Tarif global per kWh',
  });
  globalTariffInput.addEventListener('input', () => {
    const value = parseLocaleNumber(globalTariffInput.value);
    state.globalTariff = Number.isFinite(value) && value >= 0 ? value : 0;
    persist();
    recompute();
  });
  globalTariffField.append(
    el('label', { class: 'field-label', htmlFor: 'multi-global-tariff', text: 'Tarif global (Rp/kWh)' }),
    globalTariffInput
  );

  const sortField = el('div', { class: 'field field--inline' });
  const sortSelect = el(
    'select',
    { class: 'input', id: 'multi-sort', 'aria-label': 'Urutkan perangkat' },
    el('option', { value: 'cost-desc', text: 'Biaya terbesar dulu' }),
    el('option', { value: 'cost-asc', text: 'Biaya terkecil dulu' }),
    el('option', { value: 'name-asc', text: 'Nama (A–Z)' })
  );
  sortSelect.value = state.sort;
  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    persist();
    render();
  });
  sortField.append(el('label', { class: 'field-label', htmlFor: 'multi-sort', text: 'Urutkan' }), sortSelect);

  toolbar.append(addButton, sampleButton, globalTariffField, sortField);
  page.appendChild(toolbar);

  const grid = el('div', { class: 'multi-grid' });
  const listCol = el('div', { class: 'multi-col' });
  const summaryCol = el('div', { class: 'multi-col' });
  grid.append(listCol, summaryCol);
  page.appendChild(grid);
  container.appendChild(page);

  const listWrap = el('div', { class: 'device-list' });
  listCol.appendChild(listWrap);

  const totalsPanel = el('section', { class: 'panel' }, el('h2', { class: 'panel-title', text: 'Total Seluruh Perangkat' }));
  const totalsBody = el('div', { class: 'result-cards' });
  totalsPanel.appendChild(totalsBody);
  const contributionPanel = el('section', { class: 'panel' }, el('h2', { class: 'panel-title', text: 'Kontribusi Biaya Bulanan' }));
  const contributionList = el('div', { class: 'contribution-list' });
  contributionPanel.appendChild(contributionList);

  const receiptView = createReceiptView({
    mode: settings.get().receiptMode === 'ringkas' ? 'ringkas' : 'detail',
    actions: ['export', 'print', 'new'],
    labels: { new: 'Kosongkan daftar' },
    onExport: handleExport,
    onPrint: () => globalThis.print(),
    onNew: handleClearAll,
    onModeChange: (mode) => {
      settings.update({ receiptMode: mode });
      if (multi) receiptView.update(buildCombinedData(mode));
    },
  });
  receiptView.root.querySelector('h2').textContent = 'Pratinjau Struk Gabungan';

  summaryCol.append(totalsPanel, contributionPanel, receiptView.root);

  function buildCombinedData(mode = receiptView.getMode()) {
    const tariffLabel = multi.mixedTariffs
      ? 'Tarif berbeda per perangkat sesuai pengaturan masing-masing.'
      : `Tarif global ${formatRupiah(state.globalTariff)}/kWh untuk seluruh perangkat.`;
    return buildCombinedReceiptData(multi, {
      mode,
      reportNumber: state.reportNumber,
      date: new Date(),
      tariffLabel,
    });
  }

  function persist() {
    storage.write(STATE_KEY, state);
  }

  function toEngineInput(device) {
    return {
      ...device,
      tariff: device.useOwnTariff ? device.tariff : state.globalTariff,
    };
  }

  function recompute() {
    if (state.devices.length === 0) {
      multi = null;
      receiptView.update(null);
      render();
      return;
    }
    try {
      multi = calculateMulti(state.devices.map(toEngineInput), { globalTariff: state.globalTariff });
      receiptView.update(buildCombinedData());
    } catch (err) {
      multi = null;
      receiptView.update(null);
      toastError(err?.message ?? 'Perhitungan multi-perangkat gagal.');
    }
    render();
  }

  function sortedDevices() {
    if (!multi) return state.devices.map((d, i) => ({ device: d, index: i, result: null }));
    const rows = state.devices.map((device, index) => ({ device, index, result: multi.results[index] }));
    if (state.sort === 'name-asc') {
      rows.sort((a, b) => a.device.name.localeCompare(b.device.name, 'id'));
    } else if (state.sort === 'cost-asc') {
      rows.sort((a, b) => (a.result?.cost.perMonth ?? 0) - (b.result?.cost.perMonth ?? 0));
    } else {
      rows.sort((a, b) => (b.result?.cost.perMonth ?? 0) - (a.result?.cost.perMonth ?? 0));
    }
    return rows;
  }

  function render() {
    clear(listWrap);
    if (state.devices.length === 0) {
      listWrap.appendChild(
        el(
          'div',
          { class: 'empty-state' },
          iconEl('layers', { size: 28 }),
          el('h3', { text: 'Belum ada perangkat' }),
          el('p', { text: 'Tambahkan perangkat satu per satu, atau muat contoh rumah tangga untuk melihat cara kerjanya.' })
        )
      );
    } else {
      for (const row of sortedDevices()) listWrap.appendChild(deviceCard(row));
    }
    renderTotals();
  }

  function deviceCard({ device, index, result }) {
    const card = el('article', { class: 'device-card' });
    const header = el('div', { class: 'device-card__head' });
    header.append(
      el('div', { class: 'device-card__title' }, el('h3', { text: device.name }), el('span', { class: 'badge', text: device.category })),
      el('span', { class: 'device-card__cost', text: result ? `${formatRupiah(result.cost.perMonth)}/bln` : '—' })
    );
    card.appendChild(header);

    const stats = el('dl', { class: 'device-stats' });
    const addStat = (label, value) => {
      stats.append(el('dt', { text: label }), el('dd', { text: value }));
    };
    addStat('Daya total', result ? formatWatt(result.power.totalW) : '—');
    addStat('Durasi', formatDuration((result?.schedule.hoursPerDay ?? Number(device.hoursPerDay)) || 0));
    addStat('Hari operasi', `${formatInteger(result?.schedule.daysPerMonth ?? device.daysPerMonth ?? 30)} hari/bln`);
    addStat('Tarif dipakai', `${formatRupiah(device.useOwnTariff ? Number(device.tariff) || 0 : state.globalTariff)}/kWh`);
    addStat('Energi/bulan', result ? formatKWh(result.energy.perMonth) : '—');
    addStat('Biaya/tahun', result ? formatRupiah(result.cost.perYear) : '—');
    card.appendChild(stats);

    if (multi) {
      const contribution = multi.contribution[index];
      const pct = contribution?.percentage ?? 0;
      const bar = el('div', { class: 'bar' });
      const fill = el('span', { class: 'bar-fill' });
      fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
      bar.appendChild(fill);
      card.appendChild(
        el('div', { class: 'contribution-row' }, el('span', { text: `${formatPercent(pct)} dari total biaya bulanan` }), bar)
      );
    }

    const footer = el('div', { class: 'device-card__actions' });
    const qtyWrap = el('div', { class: 'qty-stepper' });
    const qtyInput = el('input', {
      class: 'input input--qty',
      type: 'number',
      min: '1',
      step: '1',
      value: String(device.quantity ?? 1),
      'aria-label': `Jumlah unit ${device.name}`,
    });
    const applyQty = () => {
      const value = Math.max(1, Math.floor(Number(qtyInput.value) || 1));
      qtyInput.value = String(value);
      state.devices[index].quantity = value;
      persist();
      recompute();
    };
    qtyInput.addEventListener('change', applyQty);
    qtyWrap.append(
      el('button', { class: 'btn btn--icon btn--ghost', type: 'button', 'aria-label': 'Kurangi unit', text: '−', on: { click: () => { qtyInput.value = String(Math.max(1, (Number(qtyInput.value) || 1) - 1)); applyQty(); } } }),
      qtyInput,
      el('button', { class: 'btn btn--icon btn--ghost', type: 'button', 'aria-label': 'Tambah unit', text: '+', on: { click: () => { qtyInput.value = String((Number(qtyInput.value) || 1) + 1); applyQty(); } } })
    );
    footer.appendChild(qtyWrap);

    const actions = el('div', { class: 'device-card__buttons' });
    const editButton = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, iconEl('edit', { size: 15 }), el('span', { text: 'Edit' }));
    editButton.addEventListener('click', () => openDeviceDialog(index));
    const dupButton = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, iconEl('copy', { size: 15 }), el('span', { text: 'Duplikat' }));
    dupButton.addEventListener('click', () => duplicateDevice(index));
    const delButton = el('button', { class: 'btn btn--ghost btn--sm btn--danger-text', type: 'button' }, iconEl('trash', { size: 15 }), el('span', { text: 'Hapus' }));
    delButton.addEventListener('click', () => removeDevice(index));
    actions.append(editButton, dupButton, delButton);
    footer.appendChild(actions);
    card.appendChild(footer);

    return card;
  }

  function renderTotals() {
    clear(totalsBody);
    clear(contributionList);
    if (!multi) {
      totalsBody.appendChild(el('p', { class: 'empty-hint', text: 'Total akan muncul setelah ada perangkat dalam daftar.' }));
      return;
    }
    const totalPowerW = multi.results.reduce((sum, r) => sum + r.power.totalW, 0);
    const items = [
      ['Total daya', totalPowerW >= 1000 ? `${formatWatt(totalPowerW)} (${(totalPowerW / 1000).toLocaleString('id-ID', { maximumFractionDigits: 3 })} kW)` : formatWatt(totalPowerW)],
      ['Energi per hari', formatKWh(multi.totalEnergy.perDay)],
      ['Energi per bulan', formatKWh(multi.totalEnergy.perMonth)],
      ['Energi per tahun', formatKWh(multi.totalEnergy.perYear)],
      ['Biaya per hari', formatRupiah(multi.totalCost.perDay)],
      ['Biaya per bulan', formatRupiah(multi.totalCost.perMonth)],
      ['Biaya per tahun', formatRupiah(multi.totalCost.perYear)],
    ];
    for (const [label, value] of items) {
      totalsBody.appendChild(el('div', { class: 'result-card' }, el('span', { class: 'card-label', text: label }), el('span', { class: 'card-value', text: value })));
    }

    const sorted = [...multi.contribution].sort((a, b) => b.percentage - a.percentage);
    for (const item of sorted) {
      const row = el('div', { class: 'contribution-item' });
      row.append(
        el('span', { class: 'contribution-name', text: item.name }),
        el('span', { class: 'contribution-value', text: `${formatRupiah(item.costPerMonth)} · ${formatPercent(item.percentage)}` })
      );
      const bar = el('div', { class: 'bar' });
      const fill = el('span', { class: 'bar-fill' });
      fill.style.width = `${Math.max(0, Math.min(100, item.percentage))}%`;
      bar.appendChild(fill);
      row.appendChild(bar);
      contributionList.appendChild(row);
    }

    if (multi.mixedTariffs) {
      contributionList.appendChild(
        el('p', { class: 'field-hint', text: 'Perangkat memakai tarif berbeda. Total dihitung dengan tarif masing-masing perangkat.' })
      );
    }
  }

  async function openDeviceDialog(editIndex = null) {
    const isEdit = editIndex != null;
    const existing = isEdit ? state.devices[editIndex] : null;

    const form = createDeviceForm({
      settings,
      presetStore: presets,
      compact: true,
      tariffCheckboxLabel: `Gunakan tarif global (${formatRupiah(state.globalTariff)}/kWh)`,
      initialValues: existing
        ? { ...existing, useDefaultTariff: !existing.useOwnTariff }
        : { tariff: state.globalTariff, useDefaultTariff: true, hoursPerDay: 8, daysPerWeek: 7, quantity: 1 },
    });

    const status = el('p', { class: 'form-status form-status--error', role: 'status', hidden: true });
    const content = el('div', {}, form.root, status);

    const dialog = createDialog({
      title: isEdit ? `Edit perangkat — ${existing.name}` : 'Tambah perangkat',
      content,
      wide: true,
      actions: [
        { label: 'Batal', value: 'cancel' },
        { label: isEdit ? 'Simpan perubahan' : 'Tambahkan', value: 'save', variant: 'primary' },
      ],
    });

    dialog.dialog.addEventListener('close', () => {
      if (dialog.dialog.returnValue !== 'save') return;
      const raw = form.getRawValues();
      const { valid, errors, values } = validateDeviceInput(raw);
      if (!valid) {
        status.hidden = false;
        status.textContent = firstError(errors) ?? 'Data belum valid.';
        form.showErrors(errors);
        return;
      }
      const device = {
        uid: existing?.uid ?? createUid(),
        ...values,
        tariffName: raw.tariffName,
        useOwnTariff: !raw.useDefaultTariff,
      };
      if (isEdit) state.devices[editIndex] = device;
      else state.devices.push(device);
      persist();
      recompute();
      toastSuccess(isEdit ? `Perubahan "${device.name}" disimpan.` : `"${device.name}" ditambahkan ke daftar.`);
    });

    await dialog.open();
  }

  function duplicateDevice(index) {
    const source = state.devices[index];
    const copy = { ...source, uid: createUid(), name: `${source.name} (salinan)` };
    state.devices.splice(index + 1, 0, copy);
    persist();
    recompute();
    toastSuccess(`"${source.name}" diduplikasi.`);
  }

  async function removeDevice(index) {
    const device = state.devices[index];
    if (settings.get().confirmDestructive) {
      const ok = await confirmDialog({
        title: 'Hapus perangkat',
        message: `Hapus "${device.name}" dari daftar multi-perangkat?`,
        confirmLabel: 'Hapus',
        cancelLabel: 'Batal',
      });
      if (!ok) return;
    }
    state.devices.splice(index, 1);
    persist();
    recompute();
    toastSuccess(`"${device.name}" dihapus dari daftar.`);
  }

  async function handleClearAll() {
    if (state.devices.length === 0) {
      toastError('Daftar perangkat sudah kosong.');
      return;
    }
    if (settings.get().confirmDestructive) {
      const ok = await confirmDialog({
        title: 'Kosongkan daftar',
        message: 'Seluruh perangkat dalam daftar multi-perangkat akan dihapus. Lanjutkan?',
        confirmLabel: 'Kosongkan',
      });
      if (!ok) return;
    }
    state.devices = [];
    state.reportNumber = generateReportNumber();
    persist();
    recompute();
    toastSuccess('Daftar multi-perangkat dikosongkan.');
  }

  function loadSample() {
    if (state.devices.length > 0 && settings.get().confirmDestructive) {
      confirmDialog({
        title: 'Muat contoh',
        message: 'Daftar saat ini akan diganti dengan contoh perangkat rumah tangga. Lanjutkan?',
        confirmLabel: 'Ganti dengan contoh',
      }).then((ok) => {
        if (ok) applySample();
      });
      return;
    }
    applySample();
  }

  function applySample() {
    state.devices = SAMPLE_DEVICES.map((sample) => ({
      uid: createUid(),
      name: sample.name,
      category: sample.category,
      brand: '',
      model: '',
      notes: sample.notes ?? '',
      quantity: sample.quantity ?? 1,
      powerValue: sample.powerValue,
      powerUnit: 'W',
      powerMethod: sample.powerMethod ?? 'nominal',
      calcMode: sample.calcMode ?? 'constant',
      powerMin: null,
      powerMax: null,
      hoursPerDay: sample.hoursPerDay,
      extraMinutes: 0,
      daysPerWeek: 7,
      daysPerMonth: null,
      daysPerYear: null,
      tariff: state.globalTariff,
      tariffName: settings.get().tariffName,
      useOwnTariff: false,
    }));
    persist();
    recompute();
    toastSuccess('Contoh perangkat rumah tangga dimuat. Ubah sesuai kebutuhan Anda.');
  }

  async function handleExport() {
    if (!multi) {
      toastError('Belum ada perangkat untuk diekspor.');
      return;
    }
    receiptView.setBusy(true);
    try {
      const coarse = globalThis.matchMedia?.('(pointer: coarse)').matches ?? false;
      const result = await exportReceiptPng(receiptView.getElement(), {
        filename: `PLNCalc-Multi-Perangkat-${formatDateFile(new Date())}.png`,
        scale: 2,
        preferShare: coarse && typeof navigator.share === 'function',
      });
      if (result.method === 'canceled') toastError('Berbagi dibatalkan. File PNG tidak dikirim.');
      else if (result.method === 'share') toastSuccess(`Struk gabungan dibagikan sebagai ${result.filename}.`);
      else toastSuccess(`PNG struk gabungan diunduh: ${result.filename}`);
    } catch (err) {
      toastError(err?.message ?? 'Ekspor PNG gagal.');
    } finally {
      receiptView.setBusy(false);
    }
  }

  const note = el('div', { class: 'info-bar' });
  note.append(
    iconEl('info', { size: 16 }),
    el('span', {
      text: 'Daftar multi-perangkat disimpan di browser ini saja dan tidak tersinkron antarperangkat/browser lain.',
    })
  );
  page.insertBefore(note, grid);

  recompute();

  return () => {
    persist();
  };
}
