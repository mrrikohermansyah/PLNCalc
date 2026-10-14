import { CATEGORIES, POWER_METHODS, CALC_MODES } from '../../core/constants.js';
import { el, labeledField, setFieldError, clearFieldErrors } from '../dom.js';
import { iconEl } from '../icons.js';
import { createDialog } from '../modal.js';

const DURATION_CHIPS = [
  { label: '15 menit', hours: 0, minutes: 15 },
  { label: '30 menit', hours: 0, minutes: 30 },
  { label: '1 jam', hours: 1, minutes: 0 },
  { label: '2,5 jam', hours: 2, minutes: 30 },
  { label: '4 jam', hours: 4, minutes: 0 },
  { label: '8 jam', hours: 8, minutes: 0 },
  { label: '12 jam', hours: 12, minutes: 0 },
  { label: '24 jam', hours: 24, minutes: 0 },
];

let uidCounter = 0;

export function createDeviceForm({
  settings,
  presetStore,
  initialValues = {},
  onChange = () => {},
  compact = false,
  tariffCheckboxLabel = null,
} = {}) {
  const uid = `df${(uidCounter += 1)}`;
  const id = (name) => `${uid}-${name}`;
  const fields = {};
  const dirty = { daysPerMonth: false, daysPerYear: false };

  const root = el('div', { class: `device-form${compact ? ' device-form--compact' : ''}` });

  function numberControl(name, { decimal = false, ...attrs } = {}) {
    // Kolom desimal memakai type=text + inputmode=decimal: keyboard numeric iOS tidak punya
    // tombol koma, sementara format Indonesia ("1.444,70") lazim dipakai. Parsing & validasi
    // tetap di validate.js, jadi step/min/max di sini hanya berlaku untuk field bilangan bulat.
    const control = el('input', {
      class: 'input',
      type: decimal ? 'text' : 'number',
      id: id(name),
      name,
      step: 'any',
      inputmode: 'decimal',
      autocomplete: 'off',
      ...attrs,
    });
    fields[name] = control;
    return control;
  }

  function textControl(name, attrs = {}) {
    const control = el('input', { class: 'input', type: 'text', id: id(name), name, ...attrs });
    fields[name] = control;
    return control;
  }

  function fieldset(legend, ...children) {
    return el('fieldset', { class: 'form-card' }, el('legend', { class: 'form-card-title', text: legend }), ...children);
  }

  function addField(legend, labelText, control, opts) {
    const { wrapper } = labeledField(labelText, control, opts);
    legend.appendChild(wrapper);
    return wrapper;
  }

  // ---------- Informasi perangkat ----------
  const infoCard = el('fieldset', { class: 'form-card' });
  infoCard.appendChild(el('legend', { class: 'form-card-title', text: 'Informasi Perangkat' }));

  const grid2 = el('div', { class: 'field-grid' });
  infoCard.appendChild(grid2);

  const nameInput = textControl('name', { placeholder: 'mis. AC Kamar Tidur', autocomplete: 'off', required: true });
  grid2.appendChild(labeledField('Nama perangkat *', nameInput, { htmlFor: nameInput.id }).wrapper);

  const categorySelect = el(
    'select',
    { class: 'input', id: id('category'), name: 'category' },
    ...CATEGORIES.map((cat) => el('option', { value: cat, text: cat }))
  );
  fields.category = categorySelect;
  grid2.appendChild(labeledField('Kategori', categorySelect, { htmlFor: categorySelect.id }).wrapper);

  const brandInput = textControl('brand', { placeholder: 'Opsional', autocomplete: 'off' });
  const modelInput = textControl('model', { placeholder: 'Opsional', autocomplete: 'off' });
  const pair = el('div', { class: 'field-pair' });
  pair.appendChild(labeledField('Merek', brandInput, { htmlFor: brandInput.id }).wrapper);
  pair.appendChild(labeledField('Model', modelInput, { htmlFor: modelInput.id }).wrapper);
  grid2.appendChild(pair);

  const quantityInput = numberControl('quantity', { min: '1', step: '1', value: '1', inputmode: 'numeric' });
  grid2.appendChild(labeledField('Jumlah unit', quantityInput, { htmlFor: quantityInput.id, hint: 'Bilangan bulat positif' }).wrapper);

  const notesInput = el('textarea', {
    class: 'input',
    id: id('notes'),
    name: 'notes',
    rows: '2',
    placeholder: 'Opsional — catatan penggunaan perangkat',
  });
  fields.notes = notesInput;
  grid2.appendChild(labeledField('Catatan', notesInput, { htmlFor: notesInput.id }).wrapper);

  root.appendChild(infoCard);

  // ---------- Daya listrik ----------
  const powerCard = fieldset('Daya Listrik');
  const powerGrid = el('div', { class: 'field-grid' });
  powerCard.appendChild(powerGrid);

  const methodGroup = el('div', { class: 'radio-group', role: 'radiogroup', 'aria-label': 'Metode input daya' });
  for (const method of Object.values(POWER_METHODS)) {
    const radioId = id(`method-${method.id}`);
    const radio = el('input', {
      class: 'radio',
      type: 'radio',
      id: radioId,
      name: id('powerMethod'),
      value: method.id,
    });
    radio.addEventListener('change', emit);
    fields[`method-${method.id}`] = radio;
    methodGroup.appendChild(el('label', { class: 'radio-label', htmlFor: radioId }, radio, el('span', { text: method.label })));
  }
  powerGrid.appendChild(
    labeledField('Metode input daya', methodGroup, {
      hint: 'Nominal = label/datasheet · Rata-rata = estimasi saat beroperasi · Pengukuran = hasil wattmeter/smart plug',
    }).wrapper
  );

  const modeGroup = el('div', { class: 'radio-group', role: 'radiogroup', 'aria-label': 'Mode perhitungan' });
  for (const mode of Object.values(CALC_MODES)) {
    const radioId = id(`mode-${mode.id}`);
    const radio = el('input', { class: 'radio', type: 'radio', id: radioId, name: id('calcMode'), value: mode.id });
    radio.addEventListener('change', () => {
      syncPowerModeVisibility();
      emit();
    });
    fields[`mode-${mode.id}`] = radio;
    modeGroup.appendChild(el('label', { class: 'radio-label', htmlFor: radioId }, radio, el('span', { text: mode.label })));
  }
  powerGrid.appendChild(
    labeledField('Mode perhitungan', modeGroup, {
      hint: 'Skenario min–maks menampilkan rentang estimasi biaya, bukan batas konsumsi yang dijamin.',
    }).wrapper
  );

  const singlePowerRow = el('div', { class: 'field-pair field-pair--power' });
  const powerValueInput = numberControl('powerValue', { decimal: true, min: '0', placeholder: 'mis. 650' });
  const powerUnitSelect = el(
    'select',
    { class: 'input input--unit', id: id('powerUnit'), name: 'powerUnit', 'aria-label': 'Satuan daya' },
    el('option', { value: 'W', text: 'W' }),
    el('option', { value: 'kW', text: 'kW' })
  );
  fields.powerUnit = powerUnitSelect;
  powerUnitSelect.addEventListener('change', emit);
  singlePowerRow.appendChild(
    labeledField('Nilai daya', powerValueInput, { htmlFor: powerValueInput.id }).wrapper
  );
  singlePowerRow.appendChild(el('div', { class: 'unit-slot' }, powerUnitSelect));
  powerGrid.appendChild(singlePowerRow);

  const rangeRow = el('div', { class: 'field-pair' });
  const powerMinInput = numberControl('powerMin', { decimal: true, min: '0', placeholder: 'mis. 200' });
  const powerMaxInput = numberControl('powerMax', { decimal: true, min: '0', placeholder: 'mis. 900' });
  rangeRow.appendChild(labeledField('Daya minimum', powerMinInput, { htmlFor: powerMinInput.id }).wrapper);
  rangeRow.appendChild(labeledField('Daya maksimum', powerMaxInput, { htmlFor: powerMaxInput.id }).wrapper);
  rangeRow.hidden = true;
  powerGrid.appendChild(rangeRow);

  const presetHint = el('p', {
    class: 'field-hint field-hint--warn',
    text: 'Daya contoh — sesuaikan dengan spesifikasi perangkat Anda.',
    hidden: true,
  });
  powerCard.appendChild(presetHint);

  const presetRow = el('div', { class: 'form-actions form-actions--inline' });
  const presetButton = el(
    'button',
    { class: 'btn btn--ghost btn--sm', type: 'button' },
    iconEl('box', { size: 16 }),
    el('span', { text: 'Ambil dari preset' })
  );
  presetButton.addEventListener('click', () => openPresetPicker());
  presetRow.appendChild(presetButton);
  powerCard.appendChild(presetRow);

  root.appendChild(powerCard);

  // ---------- Pola penggunaan ----------
  const usageCard = fieldset('Pola Penggunaan');
  const usageGrid = el('div', { class: 'field-grid' });
  usageCard.appendChild(usageGrid);

  const chips = el('div', { class: 'chip-row', role: 'group', 'aria-label': 'Preset durasi' });
  function refreshChips() {
    const h = Number(fields.hoursPerDay.value || 0);
    const m = Number(fields.extraMinutes.value || 0);
    chips.querySelectorAll('button[data-chip]').forEach((btn) => {
      const chip = DURATION_CHIPS[Number(btn.dataset.chip)];
      const active = chip && chip.hours === h && chip.minutes === m;
      btn.classList.toggle('chip--active', Boolean(active));
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }
  DURATION_CHIPS.forEach((chip, index) => {
    const btn = el('button', {
      class: 'chip',
      type: 'button',
      text: chip.label,
      dataset: { chip: String(index) },
      'aria-pressed': 'false',
    });
    btn.addEventListener('click', () => {
      fields.hoursPerDay.value = String(chip.hours);
      fields.extraMinutes.value = chip.minutes ? String(chip.minutes) : '';
      refreshChips();
      emit();
    });
    chips.appendChild(btn);
  });
  usageGrid.appendChild(labeledField('Preset durasi', chips, { hint: 'Durasi bisa diisi bebas, preset hanya mempermudah.' }).wrapper);

  const durationRow = el('div', { class: 'field-pair' });
  const hoursInput = numberControl('hoursPerDay', { decimal: true, min: '0', max: '24', step: '0.25', value: '8' });
  const minutesInput = numberControl('extraMinutes', { min: '0', max: '59', step: '1', value: '0', inputmode: 'numeric' });
  hoursInput.addEventListener('input', () => { refreshChips(); emit(); });
  minutesInput.addEventListener('input', () => { refreshChips(); emit(); });
  durationRow.appendChild(labeledField('Jam penggunaan per hari', hoursInput, { htmlFor: hoursInput.id }).wrapper);
  durationRow.appendChild(labeledField('Menit tambahan', minutesInput, { htmlFor: minutesInput.id, hint: 'Opsional' }).wrapper);
  usageGrid.appendChild(durationRow);

  const scheduleRow = el('div', { class: 'field-triple' });
  const weekInput = numberControl('daysPerWeek', { min: '0', max: '7', step: '1', value: '7', inputmode: 'numeric' });
  const monthInput = numberControl('daysPerMonth', { min: '0', max: '31', step: '1', placeholder: 'Otomatis', inputmode: 'numeric' });
  const yearInput = numberControl('daysPerYear', { min: '0', max: '366', step: '1', placeholder: 'Otomatis', inputmode: 'numeric' });

  weekInput.addEventListener('input', () => {
    const week = Number(weekInput.value);
    if (Number.isFinite(week)) {
      if (!dirty.daysPerMonth) monthInput.value = String(Math.round((week * 30) / 7));
      if (!dirty.daysPerYear) yearInput.value = String(Math.round((week * 365) / 7));
    }
    emit();
  });
  monthInput.addEventListener('input', () => {
    dirty.daysPerMonth = true;
    if (!dirty.daysPerYear) {
      const month = Number(monthInput.value);
      if (Number.isFinite(month)) yearInput.value = String(Math.min(366, month * 12));
    }
    emit();
  });
  yearInput.addEventListener('input', () => {
    dirty.daysPerYear = true;
    emit();
  });

  scheduleRow.appendChild(labeledField('Hari / minggu', weekInput, { htmlFor: weekInput.id }).wrapper);
  scheduleRow.appendChild(
    labeledField('Hari / bulan', monthInput, { htmlFor: monthInput.id, hint: 'Kosongkan = otomatis dari minggu' }).wrapper
  );
  scheduleRow.appendChild(labeledField('Hari / tahun', yearInput, { htmlFor: yearInput.id, hint: 'Kosongkan = otomatis' }).wrapper);
  usageGrid.appendChild(scheduleRow);

  const singleUseHint = el('p', {
    class: 'field-hint',
    text: 'Untuk pemakaian sekali sehari (mis. rice cooker 45 menit atau setrika), cukup isi menit tambahan tanpa jam.',
  });
  usageCard.appendChild(singleUseHint);
  root.appendChild(usageCard);

  // ---------- Tarif listrik ----------
  const tariffCard = fieldset('Tarif Listrik');
  const tariffGrid = el('div', { class: 'field-grid' });
  tariffCard.appendChild(tariffGrid);

  const useDefaultRow = el('div', { class: 'switch-row' });
  const useDefaultCheckbox = el('input', { class: 'switch', type: 'checkbox', id: id('useDefaultTariff') });
  fields.useDefaultTariff = useDefaultCheckbox;
  useDefaultRow.appendChild(useDefaultCheckbox);
  useDefaultRow.appendChild(
    el('label', {
      htmlFor: id('useDefaultTariff'),
      text:
        tariffCheckboxLabel ??
        `Gunakan tarif default tersimpan (${settings?.get().tariffName || 'Tarif contoh'})`,
    })
  );
  tariffGrid.appendChild(useDefaultRow);

  const tariffRow = el('div', { class: 'field-pair' });
  const tariffInput = numberControl('tariff', { decimal: true, min: '0', value: String(settings?.get().tariff ?? 1444.7) });
  const tariffNameInput = textControl('tariffName', { placeholder: 'Opsional, mis. R-1/TR 1300 VA', value: settings?.get().tariffName ?? '' });
  tariffInput.addEventListener('input', emit);
  tariffNameInput.addEventListener('input', emit);
  tariffRow.appendChild(labeledField('Tarif per kWh (Rp)', tariffInput, { htmlFor: tariffInput.id }).wrapper);
  tariffRow.appendChild(labeledField('Nama tarif', tariffNameInput, { htmlFor: tariffNameInput.id }).wrapper);
  tariffGrid.appendChild(tariffRow);

  const tariffNote = el('p', {
    class: 'field-hint',
    text: 'Nilai contoh awal Rp1.444,70/kWh dapat diubah. Ini hanya biaya konsumsi energi perangkat, bukan total tagihan PLN (tanpa pajak, PPJ, atau biaya administrasi yang disembunyikan).',
  });
  tariffCard.appendChild(tariffNote);

  useDefaultCheckbox.addEventListener('change', () => {
    if (useDefaultCheckbox.checked) {
      tariffInput.value = String(settings?.get().tariff ?? 1444.7);
      tariffInput.disabled = true;
      tariffNameInput.value = settings?.get().tariffName ?? '';
    } else {
      tariffInput.disabled = false;
    }
    emit();
  });

  root.appendChild(tariffCard);

  // ---------- perilaku ----------
  for (const [key, control] of Object.entries(fields)) {
    if (control instanceof HTMLInputElement && control.type === 'text') control.addEventListener('input', emit);
    else if (control instanceof HTMLInputElement && control.type === 'number') control.addEventListener('input', emit);
    else if (control instanceof HTMLSelectElement) control.addEventListener('change', emit);
    else if (control instanceof HTMLTextAreaElement) control.addEventListener('input', emit);
  }

  function emit() {
    onChange(getRawValues());
  }

  function syncPowerModeVisibility() {
    const mode = getRawValues().calcMode;
    const isRange = mode === 'range';
    rangeRow.hidden = !isRange;
    singlePowerRow.hidden = isRange;
  }

  function getRawValues() {
    const method = Object.values(POWER_METHODS)
      .map((m) => fields[`method-${m.id}`])
      .find((radio) => radio.checked)?.value ?? 'nominal';
    const mode = Object.values(CALC_MODES)
      .map((m) => fields[`mode-${m.id}`])
      .find((radio) => radio.checked)?.value ?? 'constant';
    return {
      name: nameInput.value,
      category: categorySelect.value,
      brand: brandInput.value,
      model: modelInput.value,
      notes: notesInput.value,
      quantity: quantityInput.value,
      powerValue: powerValueInput.value,
      powerUnit: powerUnitSelect.value,
      powerMethod: method,
      calcMode: mode,
      powerMin: powerMinInput.value,
      powerMax: powerMaxInput.value,
      hoursPerDay: hoursInput.value,
      extraMinutes: minutesInput.value,
      daysPerWeek: weekInput.value,
      daysPerMonth: monthInput.value,
      daysPerYear: yearInput.value,
      tariff: tariffInput.value,
      tariffName: tariffNameInput.value,
      useDefaultTariff: useDefaultCheckbox.checked,
    };
  }

  function setValues(values = {}) {
    if (values.name != null) nameInput.value = values.name;
    if (values.category && CATEGORIES.includes(values.category)) categorySelect.value = values.category;
    if (values.brand != null) brandInput.value = values.brand;
    if (values.model != null) modelInput.value = values.model;
    if (values.notes != null) notesInput.value = values.notes;
    if (values.quantity != null) quantityInput.value = String(values.quantity);
    if (values.powerUnit) powerUnitSelect.value = values.powerUnit;
    if (values.powerValue != null) powerValueInput.value = String(values.powerValue);
    if (values.powerMin != null) powerMinInput.value = String(values.powerMin);
    if (values.powerMax != null) powerMaxInput.value = String(values.powerMax);
    const method = values.powerMethod ?? 'nominal';
    fields[`method-${method}`] && (fields[`method-${method}`].checked = true);
    const mode = values.calcMode ?? 'constant';
    fields[`mode-${mode}`] && (fields[`mode-${mode}`].checked = true);
    syncPowerModeVisibility();
    if (values.hoursPerDay != null) hoursInput.value = String(values.hoursPerDay);
    if (values.extraMinutes != null) minutesInput.value = values.extraMinutes ? String(values.extraMinutes) : '';
    if (values.daysPerWeek != null) weekInput.value = String(values.daysPerWeek);
    if (values.daysPerMonth != null && values.daysPerMonth !== '') {
      monthInput.value = String(values.daysPerMonth);
      dirty.daysPerMonth = true;
    } else {
      monthInput.value = '';
      dirty.daysPerMonth = false;
    }
    if (values.daysPerYear != null && values.daysPerYear !== '') {
      yearInput.value = String(values.daysPerYear);
      dirty.daysPerYear = true;
    } else {
      yearInput.value = '';
      dirty.daysPerYear = false;
    }
    if (values.tariff != null && values.tariff !== '') tariffInput.value = String(values.tariff);
    if (values.tariffName != null) tariffNameInput.value = values.tariffName;
    if (values.useDefaultTariff != null) {
      useDefaultCheckbox.checked = Boolean(values.useDefaultTariff);
      tariffInput.disabled = useDefaultCheckbox.checked;
    }
    refreshChips();
    if (values.fromPreset) presetHint.hidden = false;
  }

  function reset() {
    setValues({
      name: '',
      category: 'Kustom',
      brand: '',
      model: '',
      notes: '',
      quantity: 1,
      powerValue: '',
      powerUnit: 'W',
      powerMethod: 'nominal',
      calcMode: 'constant',
      powerMin: '',
      powerMax: '',
      hoursPerDay: 8,
      extraMinutes: 0,
      daysPerWeek: 7,
      daysPerMonth: '',
      daysPerYear: '',
      tariff: settings?.get().tariff ?? 1444.7,
      tariffName: settings?.get().tariffName ?? '',
      useDefaultTariff: true,
      fromPreset: false,
    });
    presetHint.hidden = true;
    clearFieldErrors(root);
  }

  function showErrors(errors = {}) {
    clearFieldErrors(root);
    const map = {
      name: nameInput,
      quantity: quantityInput,
      powerValue: powerValueInput,
      powerMin: powerMinInput,
      powerMax: powerMaxInput,
      hoursPerDay: hoursInput,
      extraMinutes: minutesInput,
      daysPerWeek: weekInput,
      daysPerMonth: monthInput,
      daysPerYear: yearInput,
      tariff: tariffInput,
    };
    for (const [field, message] of Object.entries(errors)) {
      if (map[field]) setFieldError(map[field], message);
    }
    const firstKey = Object.keys(errors)[0];
    if (firstKey && map[firstKey]) map[firstKey].focus({ preventScroll: false });
  }

  async function openPresetPicker() {
    const presets = presetStore?.list?.() ?? [];
    let search = '';
    const list = el('div', { class: 'preset-list' });
    let dialog = null;

    function render() {
      list.replaceChildren();
      const term = search.trim().toLowerCase();
      const filtered = presets.filter(
        (p) => !term || p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)
      );
      if (filtered.length === 0) {
        list.appendChild(el('p', { class: 'empty-hint', text: 'Tidak ada preset yang cocok. Anda tetap bisa menghitung perangkat apa pun secara manual.' }));
        return;
      }
      const byCategory = new Map();
      for (const preset of filtered) {
        if (!byCategory.has(preset.category)) byCategory.set(preset.category, []);
        byCategory.get(preset.category).push(preset);
      }
      for (const [category, items] of byCategory) {
        list.appendChild(el('h4', { class: 'preset-group-title', text: category }));
        for (const item of items) {
          const btn = el(
            'button',
            { class: 'preset-pick', type: 'button' },
            el('span', { class: 'preset-pick-name', text: item.name }),
            el('span', { class: 'preset-pick-watts', text: `${item.watts} W` })
          );
          btn.addEventListener('click', () => {
            dialog?.close('pick');
            applyPreset(item);
          });
          list.appendChild(btn);
        }
      }
    }

    const searchInput = el('input', {
      class: 'input',
      type: 'search',
      placeholder: 'Cari preset…',
      'aria-label': 'Cari preset perangkat',
    });
    searchInput.addEventListener('input', () => {
      search = searchInput.value;
      render();
    });

    const content = el(
      'div',
      {},
      searchInput,
      el('p', { class: 'field-hint', text: 'Nilai daya preset hanyalah contoh awal — selalu sesuaikan dengan label perangkat Anda.' }),
      list
    );
    render();

    dialog = createDialog({ title: 'Pilih preset perangkat', content, wide: true });
    return dialog.open();
  }

  function applyPreset(preset) {
    setValues({
      name: preset.name,
      category: preset.category,
      powerValue: preset.watts,
      powerUnit: 'W',
      powerMethod: preset.suggestedMethod === 'measured' ? 'measured' : preset.suggestedMethod === 'average' ? 'average' : 'nominal',
      calcMode: preset.suggestedMethod === 'range' ? 'range' : preset.suggestedMethod === 'average' ? 'average' : 'constant',
      fromPreset: true,
    });
    if (preset.suggestedMethod === 'range') {
      powerMinInput.value = String(Math.round(preset.watts * 0.5));
      powerMaxInput.value = String(preset.watts);
    }
    presetHint.hidden = false;
    presetHint.textContent = `Daya contoh dari preset (${preset.watts} W) — sesuaikan dengan spesifikasi perangkat Anda.`;
    emit();
  }

  // helper: modal with content that can close itself
  reset();
  if (initialValues && Object.keys(initialValues).length > 0) setValues(initialValues);

  return { root, getRawValues, setValues, reset, showErrors, focusName: () => nameInput.focus(), emit };
}
