import { el } from '../dom.js';
import { iconEl } from '../icons.js';
import { renderReceiptInto } from '../../services/receipt.js';

export function createReceiptView({
  mode = 'detail',
  onSave,
  onExport,
  onPrint,
  onNew,
  onSaveAsPreset,
  onModeChange,
  actions = ['save', 'export', 'print', 'preset', 'new'],
  labels = {},
} = {}) {
  let currentMode = mode === 'ringkas' ? 'ringkas' : 'detail';

  const root = el('section', { class: 'receipt-view', 'aria-label': 'Pratinjau struk perhitungan' });

  const head = el('div', { class: 'receipt-view__head' });
  head.appendChild(el('h2', { class: 'panel-title', text: 'Pratinjau Struk' }));

  const modeToggle = el('div', { class: 'segmented', role: 'group', 'aria-label': 'Mode struk' });
  const modeButtons = {};
  for (const m of ['ringkas', 'detail']) {
    const btn = el('button', {
      class: 'segmented-btn',
      type: 'button',
      text: m === 'ringkas' ? 'Ringkas' : 'Detail',
      'aria-pressed': 'false',
      on: {
        click: () => setMode(m),
      },
    });
    modeButtons[m] = btn;
    modeToggle.appendChild(btn);
  }
  head.appendChild(modeToggle);
  root.appendChild(head);

  const scroll = el('div', { class: 'receipt-scroll' });
  const receiptEl = el('div', { class: 'receipt', id: 'receipt-preview' });
  scroll.appendChild(receiptEl);
  root.appendChild(scroll);

  const actionBar = el('div', { class: 'receipt-actions' });

  const makeButton = (label, icon, variant, handler) => {
    const btn = el(
      'button',
      { class: `btn btn--${variant}`, type: 'button' },
      iconEl(icon, { size: 16 }),
      el('span', { text: label })
    );
    btn.addEventListener('click', handler);
    return btn;
  };

  const buttons = {
    save: makeButton(labels.save ?? 'Simpan perhitungan', 'save', 'primary', () => onSave?.()),
    export: makeButton(labels.export ?? 'Ekspor PNG', 'image', 'accent', () => onExport?.()),
    print: makeButton(labels.print ?? 'Cetak', 'print', 'ghost', () => onPrint?.()),
    preset: makeButton(labels.preset ?? 'Simpan sebagai preset', 'box', 'ghost', () => onSaveAsPreset?.()),
    new: makeButton(labels.new ?? 'Perhitungan baru', 'refresh', 'ghost', () => onNew?.()),
  };

  const saveButton = buttons.save;
  const exportButton = buttons.export;
  const printButton = buttons.print;
  const presetButton = buttons.preset;

  for (const key of actions) {
    if (buttons[key]) actionBar.appendChild(buttons[key]);
  }
  root.appendChild(actionBar);

  function setMode(next) {
    currentMode = next === 'ringkas' ? 'ringkas' : 'detail';
    for (const [m, btn] of Object.entries(modeButtons)) {
      const active = m === currentMode;
      btn.classList.toggle('segmented-btn--active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    onModeChange?.(currentMode);
    return currentMode;
  }

  function update(data) {
    renderReceiptInto(receiptEl, data);
    const disabled = !data;
    for (const btn of [saveButton, exportButton, printButton, presetButton]) btn.disabled = disabled;
  }

  setMode(currentMode);

  return {
    root,
    update,
    setMode,
    getMode: () => currentMode,
    getElement: () => receiptEl,
    setBusy: (busy) => {
      exportButton.disabled = busy;
      exportButton.querySelector('span').textContent = busy ? 'Mengekspor…' : 'Ekspor PNG';
    },
  };
}
