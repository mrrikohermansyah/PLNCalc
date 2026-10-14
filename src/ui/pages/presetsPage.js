import { el, clear } from '../dom.js';
import { iconEl } from '../icons.js';
import { toastSuccess, toastError } from '../toast.js';
import { confirmDialog, createDialog } from '../modal.js';
import { CATEGORIES } from '../../core/constants.js';
import { formatWatt, formatInteger, formatRupiah } from '../../core/format.js';

const METHOD_LABELS = {
  nominal: 'Daya nominal',
  average: 'Daya rata-rata',
  measured: 'Daya hasil pengukuran',
  range: 'Skenario min–maks',
};

function field(labelText, control, hint) {
  const wrap = el('div', { class: 'field' });
  wrap.append(el('label', { class: 'field-label', text: labelText }), control);
  if (hint) wrap.appendChild(el('p', { class: 'field-hint', text: hint }));
  return wrap;
}

export function renderPresetsPage(ctx, container) {
  const { presets, settings } = ctx;
  const state = { search: '', category: '' };

  const page = el('div', { class: 'page page--presets' });
  page.append(
    el(
      'div',
      { class: 'page-head' },
      el('h1', { class: 'page-title', text: 'Preset Perangkat' }),
      el('p', {
        class: 'page-sub',
        text: 'Daya contoh — sesuaikan dengan spesifikasi perangkat Anda. Preset dapat diedit, ditambah, atau dihapus; daftar ini bukan sumber kebenaran yang tidak dapat diubah.',
      })
    )
  );

  const toolbar = el('div', { class: 'toolbar toolbar--filters' });
  const searchInput = el('input', { class: 'input', type: 'search', id: 'preset-search', placeholder: 'Cari preset…', 'aria-label': 'Cari preset' });
  searchInput.addEventListener('input', () => {
    state.search = searchInput.value;
    render();
  });
  const categorySelect = el(
    'select',
    { class: 'input', id: 'preset-category', 'aria-label': 'Filter kategori preset' },
    el('option', { value: '', text: 'Semua kategori' }),
    ...CATEGORIES.map((cat) => el('option', { value: cat, text: cat }))
  );
  categorySelect.addEventListener('change', () => {
    state.category = categorySelect.value;
    render();
  });
  const addButton = el('button', { class: 'btn btn--primary btn--sm', type: 'button' }, iconEl('plus', { size: 15 }), el('span', { text: 'Tambah preset' }));
  addButton.addEventListener('click', () => openDialog(null));
  const restoreButton = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, iconEl('refresh', { size: 15 }), el('span', { text: 'Pulihkan preset bawaan' }));
  restoreButton.addEventListener('click', restoreSeeds);

  toolbar.append(
    el('div', { class: 'field field--inline field--grow' }, el('label', { class: 'field-label', htmlFor: 'preset-search', text: 'Cari' }), searchInput),
    el('div', { class: 'field field--inline' }, el('label', { class: 'field-label', htmlFor: 'preset-category', text: 'Kategori' }), categorySelect),
    el('div', { class: 'toolbar-actions' }, addButton, restoreButton)
  );
  page.appendChild(toolbar);

  const summary = el('p', { class: 'history-summary', role: 'status' });
  page.appendChild(summary);
  const listWrap = el('div', { class: 'preset-grid' });
  page.appendChild(listWrap);
  container.appendChild(page);

  async function restoreSeeds() {
    const ok = await confirmDialog({
      title: 'Pulihkan preset bawaan',
      message: 'Perubahan pada preset bawaan akan dikembalikan ke nilai awal. Preset buatan Anda sendiri tetap disimpan.',
      confirmLabel: 'Pulihkan',
      danger: false,
    });
    if (!ok) return;
    presets.resetSeeds();
    render();
    toastSuccess('Preset bawaan dipulihkan.');
  }

  function presetCard(preset) {
    const card = el('article', { class: 'preset-card' });
    card.append(
      el('div', { class: 'preset-card__head' }, el('h3', { text: preset.name }), el('span', { class: 'badge', text: preset.category })),
      el('div', { class: 'preset-card__watts' }, iconEl('bolt', { size: 16 }), el('span', { text: `${formatWatt(preset.watts)}` }))
    );
    const meta = el('dl', { class: 'preset-meta' });
    if (preset.source) meta.append(el('dt', { text: 'Sumber' }), el('dd', { text: preset.source }));
    if (preset.variation) meta.append(el('dt', { text: 'Variasi' }), el('dd', { text: preset.variation }));
    meta.append(el('dt', { text: 'Metode disarankan' }), el('dd', { text: METHOD_LABELS[preset.suggestedMethod] ?? preset.suggestedMethod }));
    card.appendChild(meta);

    const actions = el('div', { class: 'device-card__buttons' });
    const useBtn = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, iconEl('bolt', { size: 15 }), el('span', { text: 'Pakai di kalkulator' }));
    useBtn.addEventListener('click', () => {
      globalThis.location.hash = `#/kalkulator?preset=${preset.id}`;
    });
    const editBtn = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, iconEl('edit', { size: 15 }), el('span', { text: 'Edit' }));
    editBtn.addEventListener('click', () => openDialog(preset));
    const delBtn = el('button', { class: 'btn btn--ghost btn--sm btn--danger-text', type: 'button' }, iconEl('trash', { size: 15 }), el('span', { text: 'Hapus' }));
    delBtn.addEventListener('click', () => removePreset(preset));
    actions.append(useBtn, editBtn, delBtn);
    card.appendChild(actions);
    return card;
  }

  async function removePreset(preset) {
    const ok = await confirmDialog({
      title: 'Hapus preset',
      message: `Hapus preset "${preset.name}"?`,
      confirmLabel: 'Hapus',
    });
    if (!ok) return;
    presets.remove(preset.id);
    render();
    toastSuccess(`Preset "${preset.name}" dihapus.`);
  }

  function openDialog(preset) {
    const isEdit = Boolean(preset);
    const nameInput = el('input', { class: 'input', type: 'text', value: preset?.name ?? '', 'aria-label': 'Nama preset' });
    const categorySelect = el(
      'select',
      { class: 'input', 'aria-label': 'Kategori preset' },
      ...CATEGORIES.map((cat) => el('option', { value: cat, text: cat, selected: (preset?.category ?? '') === cat }))
    );
    const wattsInput = el('input', { class: 'input', type: 'number', min: '0', step: 'any', value: String(preset?.watts ?? ''), 'aria-label': 'Daya contoh dalam watt' });
    const sourceInput = el('input', { class: 'input', type: 'text', value: preset?.source ?? '', placeholder: 'mis. label perangkat / datasheet', 'aria-label': 'Sumber referensi daya' });
    const variationInput = el('textarea', { class: 'input', rows: '2', value: '', 'aria-label': 'Catatan variasi konsumsi' });
    variationInput.value = preset?.variation ?? '';
    const methodSelect = el(
      'select',
      { class: 'input', 'aria-label': 'Metode perhitungan disarankan' },
      ...Object.entries(METHOD_LABELS).map(([value, label]) =>
        el('option', { value, text: label, selected: (preset?.suggestedMethod ?? 'nominal') === value })
      )
    );
    const status = el('p', { class: 'form-status form-status--error', role: 'status', hidden: true });

    const content = el(
      'div',
      { class: 'field-grid' },
      field('Nama preset', nameInput),
      field('Kategori', categorySelect),
      field('Daya contoh (W)', wattsInput, 'Hanya nilai awal — bukan nilai universal semua perangkat sejenis.'),
      field('Sumber/dasar referensi', sourceInput),
      field('Catatan variasi konsumsi', variationInput),
      field('Metode perhitungan disarankan', methodSelect),
      status
    );

    const dialog = createDialog({
      title: isEdit ? `Edit preset — ${preset.name}` : 'Tambah preset milik sendiri',
      content,
      wide: true,
      actions: [
        { label: 'Batal', value: 'cancel' },
        { label: isEdit ? 'Simpan perubahan' : 'Tambah preset', value: 'save', variant: 'primary' },
      ],
    });

    dialog.dialog.addEventListener('close', () => {
      if (dialog.dialog.returnValue !== 'save') return;
      const name = nameInput.value.trim();
      const watts = Number(wattsInput.value);
      if (!name) {
        toastError('Nama preset wajib diisi.');
        return;
      }
      if (!Number.isFinite(watts) || watts < 0) {
        toastError('Daya contoh harus berupa angka tidak negatif.');
        return;
      }
      const payload = {
        name,
        category: categorySelect.value,
        watts,
        source: sourceInput.value.trim(),
        variation: variationInput.value.trim(),
        suggestedMethod: methodSelect.value,
      };
      if (isEdit) presets.update(preset.id, payload);
      else presets.add(payload);
      render();
      toastSuccess(isEdit ? `Preset "${name}" diperbarui.` : `Preset "${name}" ditambahkan.`);
    });

    dialog.open();
  }

  function render() {
    const all = presets.list();
    const term = state.search.trim().toLowerCase();
    const filtered = all.filter((p) => {
      if (state.category && p.category !== state.category) return false;
      if (!term) return true;
      return `${p.name} ${p.category} ${p.source ?? ''}`.toLowerCase().includes(term);
    });

    clear(listWrap);
    summary.textContent = `Menampilkan ${formatInteger(filtered.length)} dari ${formatInteger(all.length)} preset.`;

    if (filtered.length === 0) {
      listWrap.appendChild(
        el(
          'div',
          { class: 'empty-state' },
          iconEl('box', { size: 28 }),
          el('h3', { text: 'Tidak ada preset yang cocok' }),
          el('p', { text: 'Ubah pencarian, atau tambahkan preset milik Anda sendiri.' })
        )
      );
      return;
    }

    const groups = new Map();
    for (const preset of filtered) {
      if (!groups.has(preset.category)) groups.set(preset.category, []);
      groups.get(preset.category).push(preset);
    }
    for (const [category, items] of groups) {
      const section = el('section', { class: 'preset-group' });
      section.appendChild(el('h2', { class: 'preset-group__title', text: category }));
      const grid = el('div', { class: 'preset-grid' });
      for (const item of items) grid.appendChild(presetCard(item));
      section.appendChild(grid);
      listWrap.appendChild(section);
    }
  }

  const info = el('div', { class: 'info-bar' });
  info.append(
    iconEl('info', { size: 16 }),
    el('span', {
      text: `Tarif default saat ini ${formatRupiah(settings.get().tariff)}/kWh. Perangkat yang tidak ada dalam preset tetap bisa dihitung manual di halaman Kalkulator.`,
    })
  );
  page.insertBefore(info, listWrap);

  render();
  return () => {};
}
