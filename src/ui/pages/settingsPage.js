import { el } from '../dom.js';
import { iconEl } from '../icons.js';
import { toastSuccess, toastError } from '../toast.js';
import { confirmDialog } from '../modal.js';
import { formatRupiah, formatInteger } from '../../core/format.js';

function field(labelText, control, hint) {
  const wrap = el('div', { class: 'field' });
  const label = el('label', { class: 'field-label', text: labelText });
  if (control.id) label.setAttribute('for', control.id);
  wrap.append(label, control);
  if (hint) wrap.appendChild(el('p', { class: 'field-hint', text: hint }));
  return wrap;
}

export function renderSettingsPage(ctx, container) {
  const { settings, history, presets, theme } = ctx;
  const current = settings.get();

  const page = el('div', { class: 'page page--settings' });
  page.append(
    el(
      'div',
      { class: 'page-head' },
      el('h1', { class: 'page-title', text: 'Pengaturan' }),
      el('p', { class: 'page-sub', text: 'Preferensi disimpan secara lokal di browser ini.' })
    )
  );

  const form = el('form', { class: 'settings-grid', novalidate: true });

  // ---------- Tarif default ----------
  const tariffCard = el('section', { class: 'panel' }, el('h2', { class: 'panel-title', text: 'Tarif Listrik Default' }));
  const tariffInput = el('input', { class: 'input', type: 'number', id: 'set-tariff', min: '0', step: 'any', value: String(current.tariff) });
  const tariffNameInput = el('input', { class: 'input', type: 'text', id: 'set-tariff-name', value: current.tariffName });
  const tariffCategoryInput = el('input', { class: 'input', type: 'text', id: 'set-tariff-category', value: current.tariffCategory ?? '' });
  const tariffBody = el('div', { class: 'field-grid' });
  tariffBody.append(
    field('Tarif per kWh (Rp)', tariffInput, `Nilai contoh awal ${formatRupiah(1444.7)}/kWh — dapat diubah kapan saja.`),
    field('Nama tarif', tariffNameInput, 'mis. R-1/TR 1300 VA atau "Tarif rumah"'),
    field('Kategori tarif', tariffCategoryInput, 'Opsional, mis. Rumah tangga / Bisnis / Industri')
  );
  tariffCard.appendChild(tariffBody);
  tariffCard.appendChild(
    el('p', {
      class: 'field-hint',
      text: 'PLNCalc tidak menyertakan preset tarif PLN resmi. Selalu periksa tarif terbaru pada sumber resmi PLN sebelum memakai angka untuk keputusan penting. Biaya yang dihitung di sini adalah konsumsi energi perangkat saja, tanpa pajak, PPJ, biaya administrasi, atau komponen tagihan lain.',
    })
  );
  form.appendChild(tariffCard);

  // ---------- Periode default ----------
  const periodCard = el('section', { class: 'panel' }, el('h2', { class: 'panel-title', text: 'Periode Default' }));
  const monthInput = el('input', { class: 'input', type: 'number', id: 'set-month', min: '1', max: '31', step: '1', value: String(current.daysPerMonth) });
  const yearInput = el('input', { class: 'input', type: 'number', id: 'set-year', min: '1', max: '366', step: '1', value: String(current.daysPerYear) });
  const periodBody = el('div', { class: 'field-grid' });
  periodBody.append(
    field('Jumlah hari default per bulan', monthInput, 'Default 30 hari kalender.'),
    field('Jumlah hari default per tahun', yearInput, 'Default 365 hari kalender.')
  );
  periodCard.appendChild(periodBody);
  form.appendChild(periodCard);

  // ---------- Tampilan ----------
  const uiCard = el('section', { class: 'panel' }, el('h2', { class: 'panel-title', text: 'Tampilan & Format' }));
  const themeSelect = el(
    'select',
    { class: 'input', id: 'set-theme' },
    el('option', { value: 'light', text: 'Terang (default)', selected: current.theme !== 'dark' }),
    el('option', { value: 'dark', text: 'Gelap', selected: current.theme === 'dark' })
  );
  const receiptSelect = el(
    'select',
    { class: 'input', id: 'set-receipt' },
    el('option', { value: 'ringkas', text: 'Ringkas', selected: current.receiptMode === 'ringkas' }),
    el('option', { value: 'detail', text: 'Detail', selected: current.receiptMode !== 'ringkas' })
  );
  const currencyInput = el('input', { class: 'input', type: 'text', id: 'set-currency', value: `${current.currency} · locale id-ID`, disabled: true });
  const uiBody = el('div', { class: 'field-grid' });
  uiBody.append(
    field('Tema', themeSelect, 'Tema gelap opsional; ekspor PNG selalu memakai latar putih.'),
    field('Format receipt', receiptSelect, 'Detail memuat formula, asumsi, dan biaya per unit.'),
    field('Mata uang', currencyInput, 'Rupiah (IDR) dengan format angka locale id-ID.')
  );
  uiCard.appendChild(uiBody);
  form.appendChild(uiCard);

  // ---------- Preferensi ----------
  const prefCard = el('section', { class: 'panel' }, el('h2', { class: 'panel-title', text: 'Preferensi' }));
  const confirmCheckbox = el('input', { class: 'switch', type: 'checkbox', id: 'set-confirm' });
  confirmCheckbox.checked = Boolean(current.confirmDestructive);
  const switchRow = el('div', { class: 'switch-row' }, confirmCheckbox, el('label', { htmlFor: 'set-confirm', text: 'Tampilkan konfirmasi sebelum tindakan menghapus (riwayat, preset, daftar multi-perangkat)' }));
  prefCard.appendChild(switchRow);
  form.appendChild(prefCard);

  // ---------- Data & preset ----------
  const dataCard = el('section', { class: 'panel' }, el('h2', { class: 'panel-title', text: 'Data Lokal & Preset' }));
  const dataBody = el('div', { class: 'settings-data' });
  dataBody.append(
    el('p', { class: 'data-stat', text: `Riwayat tersimpan: ${formatInteger(history.list().length)} catatan` }),
    el('p', { class: 'data-stat', text: `Preset tersedia: ${formatInteger(presets.list().length)} preset` }),
    el('p', { class: 'field-hint', text: 'Semua data hanya ada di browser ini (LocalStorage). Tidak ada akun, tidak ada sinkronisasi otomatis antarperangkat, dan tidak ada data yang dikirim ke server.' })
  );
  dataCard.appendChild(dataBody);

  const dataActions = el('div', { class: 'form-actions' });
  const presetButton = el('button', { class: 'btn btn--ghost', type: 'button' }, iconEl('box', { size: 16 }), el('span', { text: 'Kelola preset' }));
  presetButton.addEventListener('click', () => {
    globalThis.location.hash = '#/preset';
  });
  const restoreButton = el('button', { class: 'btn btn--ghost', type: 'button' }, iconEl('refresh', { size: 16 }), el('span', { text: 'Pulihkan preset bawaan' }));
  restoreButton.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Pulihkan preset bawaan',
      message: 'Perubahan pada preset bawaan dikembalikan ke nilai awal. Preset buatan Anda tetap tersimpan.',
      confirmLabel: 'Pulihkan',
      danger: false,
    });
    if (!ok) return;
    presets.resetSeeds();
    toastSuccess('Preset bawaan dipulihkan.');
  });
  const clearHistoryButton = el('button', { class: 'btn btn--ghost btn--danger-text', type: 'button' }, iconEl('trash', { size: 16 }), el('span', { text: 'Hapus riwayat' }));
  clearHistoryButton.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Hapus riwayat',
      message: `Seluruh ${formatInteger(history.list().length)} catatan perhitungan akan dihapus permanen.`,
      confirmLabel: 'Hapus riwayat',
    });
    if (!ok) return;
    history.clear();
    toastSuccess('Riwayat dihapus.');
  });
  dataActions.append(presetButton, restoreButton, clearHistoryButton);
  dataCard.appendChild(dataActions);
  form.appendChild(dataCard);

  // ---------- Aksi simpan ----------
  const submitRow = el('div', { class: 'form-actions form-actions--sticky' });
  const saveButton = el('button', { class: 'btn btn--primary', type: 'submit' }, iconEl('save', { size: 16 }), el('span', { text: 'Simpan pengaturan' }));
  const resetButton = el('button', { class: 'btn btn--ghost btn--danger-text', type: 'button' }, iconEl('refresh', { size: 16 }), el('span', { text: 'Reset ke default' }));
  resetButton.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Reset pengaturan',
      message: 'Seluruh pengaturan dikembalikan ke nilai default (tarif contoh, 30 hari/bulan, 365 hari/tahun, tema terang). Riwayat dan preset tidak dihapus.',
      confirmLabel: 'Reset pengaturan',
      danger: false,
    });
    if (!ok) return;
    settings.reset();
    theme?.apply(settings.get().theme);
    toastSuccess('Pengaturan dikembalikan ke default.');
    globalThis.location.reload();
  });
  submitRow.append(saveButton, resetButton);
  form.appendChild(submitRow);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const tariff = Number(tariffInput.value);
    const daysPerMonth = Number(monthInput.value);
    const daysPerYear = Number(yearInput.value);
    if (!Number.isFinite(tariff) || tariff < 0) {
      toastError('Tarif harus berupa angka tidak negatif.');
      tariffInput.focus();
      return;
    }
    if (!Number.isInteger(daysPerMonth) || daysPerMonth < 1 || daysPerMonth > 31) {
      toastError('Hari per bulan harus bilangan bulat 1–31.');
      monthInput.focus();
      return;
    }
    if (!Number.isInteger(daysPerYear) || daysPerYear < 1 || daysPerYear > 366) {
      toastError('Hari per tahun harus bilangan bulat 1–366.');
      yearInput.focus();
      return;
    }
    settings.update({
      tariff,
      tariffName: tariffNameInput.value.trim(),
      tariffCategory: tariffCategoryInput.value.trim(),
      daysPerMonth,
      daysPerYear,
      theme: themeSelect.value,
      receiptMode: receiptSelect.value,
      confirmDestructive: confirmCheckbox.checked,
    });
    theme?.apply(themeSelect.value);
    toastSuccess('Pengaturan disimpan.');
  });

  themeSelect.addEventListener('change', () => theme?.apply(themeSelect.value));

  page.appendChild(form);
  container.appendChild(page);
  return () => {};
}
