import { el } from '../dom.js';
import { iconEl } from '../icons.js';
import { toastSuccess, toastError } from '../toast.js';
import { createDialog } from '../modal.js';
import { createDeviceForm } from '../components/deviceForm.js';
import { createResultsPanel } from '../components/resultsPanel.js';
import { createReceiptView } from '../components/receiptView.js';
import { createSavingsPanel } from '../components/savingsPanel.js';
import { validateDeviceInput, firstError } from '../../core/validate.js';
import { calculateDevice } from '../../core/engine.js';
import { buildReceiptData } from '../../services/receipt.js';
import { exportReceiptPng, buildExportFilename } from '../../services/pngExport.js';
import { generateReportNumber } from '../../core/reportNo.js';
import { formatRupiah } from '../../core/format.js';

export function renderCalculatorPage(ctx, container, { params = {} } = {}) {
  const { settings, presets, history, theme } = ctx;
  let editingId = null;
  let reportNumber = generateReportNumber();
  let currentResult = null;
  let saveAttempted = false;

  const page = el('div', { class: 'page page--calculator' });
  const head = el('div', { class: 'page-head' });
  head.append(
    el('h1', { class: 'page-title', text: 'Kalkulator Perangkat' }),
    el('p', {
      class: 'page-sub',
      text: 'Hitung estimasi konsumsi energi (kWh) dan biaya listrik (Rp) untuk perangkat apa pun — preset hanya bantuan, bukan keharusan.',
    })
  );
  page.appendChild(head);

  const grid = el('div', { class: 'calc-grid' });
  const left = el('div', { class: 'calc-col calc-col--left' });
  const right = el('div', { class: 'calc-col calc-col--right' });
  grid.append(left, right);
  page.appendChild(grid);
  container.appendChild(page);

  const statusLine = el('p', { class: 'form-status', role: 'status', 'aria-live': 'polite' });
  const formContainer = el('div', { class: 'form-container' });
  left.append(formContainer, statusLine);

  const resultsPanel = createResultsPanel();
  const receiptView = createReceiptView({
    mode: settings.get().receiptMode === 'ringkas' ? 'ringkas' : 'detail',
    onSave: handleSave,
    onExport: handleExport,
    onPrint: () => globalThis.print(),
    onNew: handleNew,
    onSaveAsPreset: handleSaveAsPreset,
    onModeChange: (mode) => {
      settings.update({ receiptMode: mode });
      if (currentResult) {
        receiptView.update(buildReceiptData(currentResult, { mode, reportNumber }));
      }
    },
  });
  const savingsPanel = createSavingsPanel();
  right.append(resultsPanel.root, receiptView.root, savingsPanel.root);

  const form = createDeviceForm({
    settings,
    presetStore: presets,
    onChange: () => recompute({ showErrors: saveAttempted }),
  });
  formContainer.appendChild(form.root);

  function recompute({ showErrors = false } = {}) {
    const raw = form.getRawValues();
    const { valid, errors, values } = validateDeviceInput(raw);

    if (showErrors) form.showErrors(errors);

    if (!valid) {
      const message = firstError(errors);
      statusLine.hidden = !message;
      statusLine.textContent = message ?? '';
      statusLine.classList.add('form-status--error');
      if (!currentResult) {
        resultsPanel.update(null);
        receiptView.update(null);
      }
      return null;
    }

    statusLine.hidden = false;
    statusLine.classList.remove('form-status--error');
    statusLine.textContent = 'Hasil diperbarui otomatis setiap perubahan input.';

    try {
      const result = calculateDevice({ ...values, generatedAt: new Date().toISOString(), reportNumber });
      currentResult = result;
      resultsPanel.update(result);
      receiptView.update(buildReceiptData(result, { mode: receiptView.getMode(), reportNumber }));
      savingsPanel.update(result);
      return result;
    } catch (err) {
      statusLine.classList.add('form-status--error');
      statusLine.textContent = err?.message ?? 'Perhitungan gagal.';
      return null;
    }
  }

  function buildHistoryEntry(result) {
    const { input } = result;
    return {
      id: editingId ?? undefined,
      reportNumber,
      name: input.name,
      category: input.category,
      brand: input.brand,
      model: input.model,
      quantity: input.quantity,
      powerValue: input.calcMode === 'range' ? result.power.perUnitW : input.powerValue,
      powerUnit: input.powerUnit,
      powerMethod: input.powerMethod,
      calcMode: input.calcMode,
      powerMin: input.powerMin,
      powerMax: input.powerMax,
      hoursPerDay: input.hoursPerDay,
      extraMinutes: input.extraMinutes,
      daysPerWeek: input.daysPerWeek,
      daysPerMonth: input.daysPerMonth,
      daysPerYear: input.daysPerYear,
      tariff: input.tariff,
      energy: result.energy,
      cost: result.cost,
      notes: input.notes,
      assumptions: result.assumptions,
      mode: 'single',
    };
  }

  function handleSave() {
    saveAttempted = true;
    const result = recompute({ showErrors: true });
    if (!result) {
      toastError('Perhitungan belum valid. Perbaiki isian yang ditandai merah lalu simpan lagi.');
      return;
    }
    try {
      const record = history.save(buildHistoryEntry(result));
      editingId = record.id;
      toastSuccess(`Perhitungan "${record.name}" disimpan ke riwayat.`, {
        action: { label: 'Lihat riwayat', onClick: () => (globalThis.location.hash = '#/riwayat') },
      });
    } catch (err) {
      toastError(err?.message ?? 'Gagal menyimpan perhitungan.');
    }
  }

  async function handleExport() {
    if (!currentResult) {
      toastError('Belum ada struk yang bisa diekspor. Lengkapi data perangkat terlebih dahulu.');
      return;
    }
    receiptView.setBusy(true);
    try {
      const coarse = globalThis.matchMedia?.('(pointer: coarse)').matches ?? false;
      const result = await exportReceiptPng(receiptView.getElement(), {
        filename: buildExportFilename(currentResult.input.name),
        scale: 2,
        preferShare: coarse && typeof navigator.share === 'function',
      });
      if (result.method === 'canceled') {
        toastError('Berbagi dibatalkan. File PNG tidak dikirim.');
      } else if (result.method === 'share') {
        toastSuccess(`Struk dibagikan sebagai ${result.filename}.`);
      } else {
        toastSuccess(`PNG berhasil diunduh: ${result.filename}`);
      }
    } catch (err) {
      toastError(err?.message ?? 'Ekspor PNG gagal.');
    } finally {
      receiptView.setBusy(false);
    }
  }

  function handleNew() {
    editingId = null;
    saveAttempted = false;
    reportNumber = generateReportNumber();
    currentResult = null;
    form.reset();
    statusLine.hidden = true;
    resultsPanel.update(null);
    receiptView.update(null);
    savingsPanel.update(null);
    form.focusName();
    toastSuccess('Formulir dikosongkan. Silakan mulai perhitungan baru.');
  }

  async function handleSaveAsPreset() {
    const raw = form.getRawValues();
    if (!raw.name.trim()) {
      toastError('Isi nama perangkat terlebih dahulu sebelum menyimpan preset.');
      return;
    }
    const watts = Number(raw.calcMode === 'range' ? raw.powerMax || raw.powerMin : raw.powerValue) || 0;

    const nameInput = el('input', { class: 'input', type: 'text', value: raw.name, 'aria-label': 'Nama preset' });
    const categoryInput = el('input', { class: 'input', type: 'text', value: raw.category, 'aria-label': 'Kategori preset' });
    const wattsInput = el('input', { class: 'input', type: 'number', min: '0', step: 'any', value: String(watts), 'aria-label': 'Daya contoh (W)' });
    const sourceInput = el('input', { class: 'input', type: 'text', value: 'Ditambahkan pengguna', 'aria-label': 'Sumber daya' });
    const variationInput = el('textarea', { class: 'input', rows: '2', placeholder: 'Catatan variasi konsumsi (opsional)', 'aria-label': 'Catatan variasi' });

    const content = el(
      'div',
      { class: 'field-grid' },
      ...[
        ['Nama preset', nameInput],
        ['Kategori', categoryInput],
        ['Daya contoh (W)', wattsInput],
        ['Sumber/dasar referensi', sourceInput],
        ['Catatan variasi', variationInput],
      ].map(([label, control]) => {
        const wrap = el('div', { class: 'field' });
        wrap.append(el('label', { class: 'field-label', text: label }), control);
        return wrap;
      })
    );

    const dialog = createDialog({
      title: 'Simpan sebagai preset milik sendiri',
      content,
      wide: true,
      actions: [
        { label: 'Batal', value: 'cancel' },
        { label: 'Simpan preset', value: 'save', variant: 'primary' },
      ],
    });
    const result = await dialog.open();
    if (result !== 'save') return;

    const saved = presets.add({
      name: nameInput.value.trim() || raw.name,
      category: categoryInput.value.trim() || 'Kustom',
      watts: Number(wattsInput.value) || 0,
      source: sourceInput.value.trim() || 'Ditambahkan pengguna',
      variation: variationInput.value.trim(),
      suggestedMethod: raw.powerMethod,
    });
    toastSuccess(`Preset "${saved.name}" tersimpan dan dapat dipakai ulang.`);
  }

  function loadRecord(record, { asCopy = false } = {}) {
    editingId = asCopy ? null : record.id;
    reportNumber = record.reportNumber || generateReportNumber();
    form.setValues({
      name: record.name,
      category: record.category,
      brand: record.brand,
      model: record.model,
      notes: record.notes,
      quantity: record.quantity,
      powerValue: record.powerValue,
      powerUnit: record.powerUnit,
      powerMethod: record.powerMethod,
      calcMode: record.calcMode,
      powerMin: record.powerMin ?? '',
      powerMax: record.powerMax ?? '',
      hoursPerDay: record.hoursPerDay,
      extraMinutes: record.extraMinutes,
      daysPerWeek: record.daysPerWeek,
      daysPerMonth: record.daysPerMonth ?? '',
      daysPerYear: record.daysPerYear ?? '',
      tariff: record.tariff,
      tariffName: settings.get().tariffName,
      useDefaultTariff: false,
    });
    recompute();
    if (asCopy) toastSuccess('Perhitungan diduplikasi ke formulir. Simpan untuk membuat catatan baru.');
  }

  if (params.id) {
    const record = history.get(params.id);
    if (record) loadRecord(record);
    else toastError('Catatan riwayat tidak ditemukan.');
  } else if (params.dup) {
    const record = history.get(params.dup);
    if (record) loadRecord(record, { asCopy: true });
    else toastError('Catatan riwayat tidak ditemukan untuk diduplikasi.');
  } else if (params.preset) {
    const preset = presets.get(params.preset);
    if (preset) {
      form.setValues({
        name: preset.name,
        category: preset.category,
        powerValue: preset.watts,
        powerUnit: 'W',
        powerMethod: preset.suggestedMethod === 'range' ? 'nominal' : preset.suggestedMethod,
        calcMode: preset.suggestedMethod === 'range' ? 'range' : preset.suggestedMethod === 'average' ? 'average' : 'constant',
        tariff: settings.get().tariff,
        tariffName: settings.get().tariffName,
        useDefaultTariff: true,
        fromPreset: true,
      });
      if (preset.suggestedMethod === 'range') {
        form.setValues({ powerMin: Math.round(preset.watts * 0.5), powerMax: preset.watts });
      }
      recompute();
      toastSuccess(`Preset "${preset.name}" dimuat. Sesuaikan daya dengan label perangkat Anda.`);
    } else {
      toastError('Preset tidak ditemukan.');
      form.setValues({ tariff: settings.get().tariff, tariffName: settings.get().tariffName, useDefaultTariff: true });
      recompute();
    }
  } else {
    form.setValues({
      tariff: settings.get().tariff,
      tariffName: settings.get().tariffName,
      useDefaultTariff: true,
    });
    recompute();
  }

  const infoBar = el('div', { class: 'info-bar' });
  infoBar.append(
    iconEl('info', { size: 16 }),
    el('span', {
      text: `Tarif default saat ini ${formatRupiah(settings.get().tariff)}/kWh. Semua hasil adalah estimasi, bukan pengukuran aktual.`,
    })
  );
  page.insertBefore(infoBar, grid);

  theme?.syncButtons?.();

  return () => {
    saveAttempted = false;
  };
}
