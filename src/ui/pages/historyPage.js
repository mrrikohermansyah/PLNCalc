import { el, clear, downloadTextFile } from '../dom.js';
import { iconEl } from '../icons.js';
import { toastSuccess, toastError } from '../toast.js';
import { confirmDialog } from '../modal.js';
import { CATEGORIES } from '../../core/constants.js';
import {
  formatRupiah,
  formatKWh,
  formatWatt,
  formatInteger,
  formatDuration,
  formatDateID,
} from '../../core/format.js';

export function renderHistoryPage(ctx, container) {
  const { settings, history } = ctx;

  const filters = { search: '', category: '', sort: 'date', order: 'desc' };

  const page = el('div', { class: 'page page--history' });
  page.append(
    el(
      'div',
      { class: 'page-head' },
      el('h1', { class: 'page-title', text: 'Riwayat Perhitungan' }),
      el('p', {
        class: 'page-sub',
        text: 'Perhitungan tersimpan di LocalStorage browser ini. Data tidak otomatis tersinkron ke perangkat atau browser lain.',
      })
    )
  );

  const toolbar = el('div', { class: 'toolbar toolbar--filters' });

  const searchInput = el('input', {
    class: 'input',
    type: 'search',
    id: 'history-search',
    placeholder: 'Cari nama, merek, model, atau catatan…',
    'aria-label': 'Cari riwayat',
  });
  searchInput.addEventListener('input', () => {
    filters.search = searchInput.value;
    render();
  });

  const categorySelect = el(
    'select',
    { class: 'input', id: 'history-category', 'aria-label': 'Filter kategori' },
    el('option', { value: '', text: 'Semua kategori' }),
    ...CATEGORIES.map((cat) => el('option', { value: cat, text: cat }))
  );
  categorySelect.addEventListener('change', () => {
    filters.category = categorySelect.value;
    render();
  });

  const sortSelect = el(
    'select',
    { class: 'input', id: 'history-sort', 'aria-label': 'Urutkan riwayat' },
    el('option', { value: 'date-desc', text: 'Tanggal terbaru' }),
    el('option', { value: 'date-asc', text: 'Tanggal terlama' }),
    el('option', { value: 'cost-desc', text: 'Biaya terbesar' }),
    el('option', { value: 'cost-asc', text: 'Biaya terkecil' }),
    el('option', { value: 'name-asc', text: 'Nama (A–Z)' })
  );
  sortSelect.addEventListener('change', () => {
    const [sort, order] = sortSelect.value.split('-');
    filters.sort = sort;
    filters.order = order;
    render();
  });

  toolbar.append(
    el('div', { class: 'field field--inline field--grow' }, el('label', { class: 'field-label', htmlFor: 'history-search', text: 'Cari' }), searchInput),
    el('div', { class: 'field field--inline' }, el('label', { class: 'field-label', htmlFor: 'history-category', text: 'Kategori' }), categorySelect),
    el('div', { class: 'field field--inline' }, el('label', { class: 'field-label', htmlFor: 'history-sort', text: 'Urutkan' }), sortSelect)
  );
  page.appendChild(toolbar);

  const actionBar = el('div', { class: 'toolbar' });
  const jsonButton = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, iconEl('download', { size: 15 }), el('span', { text: 'Ekspor JSON' }));
  const csvButton = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, iconEl('download', { size: 15 }), el('span', { text: 'Ekspor CSV' }));
  const clearButton = el('button', { class: 'btn btn--ghost btn--sm btn--danger-text', type: 'button' }, iconEl('trash', { size: 15 }), el('span', { text: 'Hapus seluruh riwayat' }));
  jsonButton.addEventListener('click', () => exportFile('json'));
  csvButton.addEventListener('click', () => exportFile('csv'));
  clearButton.addEventListener('click', clearAll);
  actionBar.append(jsonButton, csvButton, clearButton);
  page.appendChild(actionBar);

  const summary = el('p', { class: 'history-summary', role: 'status' });
  page.appendChild(summary);

  const listWrap = el('div', { class: 'history-list' });
  page.appendChild(listWrap);
  container.appendChild(page);

  function exportFile(kind) {
    const items = history.list();
    if (items.length === 0) {
      toastError('Riwayat masih kosong, tidak ada yang bisa diekspor.');
      return;
    }
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      if (kind === 'csv') {
        downloadTextFile(history.exportCSV(), `PLNCalc-riwayat-${stamp}.csv`, 'text/csv');
        toastSuccess(`CSV riwayat diunduh (${items.length} baris).`);
      } else {
        downloadTextFile(history.exportJSON(), `PLNCalc-riwayat-${stamp}.json`, 'application/json');
        toastSuccess(`JSON riwayat diunduh (${items.length} catatan).`);
      }
    } catch (err) {
      toastError(err?.message ?? 'Gagal mengekspor riwayat.');
    }
  }

  async function clearAll() {
    if (history.list().length === 0) {
      toastError('Riwayat sudah kosong.');
      return;
    }
    const ok = await confirmDialog({
      title: 'Hapus seluruh riwayat',
      message: `${formatInteger(history.list().length)} catatan perhitungan akan dihapus permanen dari browser ini. Tindakan tidak dapat dibatalkan.`,
      confirmLabel: 'Hapus semua',
    });
    if (!ok) return;
    history.clear();
    render();
    toastSuccess('Seluruh riwayat dihapus.');
  }

  async function removeOne(record) {
    const ok = await confirmDialog({
      title: 'Hapus catatan',
      message: `Hapus perhitungan "${record.name}"?`,
      confirmLabel: 'Hapus',
    });
    if (!ok) return;
    history.remove(record.id);
    render();
    toastSuccess(`Catatan "${record.name}" dihapus.`);
  }

  function historyCard(record) {
    const card = el('article', { class: 'history-card' });
    const head = el('div', { class: 'device-card__head' });
    head.append(
      el('div', { class: 'device-card__title' }, el('h3', { text: record.name }), el('span', { class: 'badge', text: record.category })),
      el('span', { class: 'device-card__cost', text: `${formatRupiah(record.cost?.perMonth ?? 0)}/bln` })
    );
    card.appendChild(head);

    const stats = el('dl', { class: 'device-stats' });
    const addStat = (label, value) => stats.append(el('dt', { text: label }), el('dd', { text: value }));
    addStat('Dibuat', `${formatDateID(record.createdAt)} · ${record.reportNumber ?? '—'}`);
    addStat('Daya', `${formatWatt(Number(record.powerValue) || 0)}${record.powerUnit === 'kW' ? ' (kW)' : ''} × ${formatInteger(record.quantity)} unit`);
    addStat('Durasi', formatDuration((Number(record.hoursPerDay) || 0) + (Number(record.extraMinutes) || 0) / 60));
    addStat('Hari operasi', `${formatInteger(record.daysPerMonth ?? 30)} hari/bln`);
    addStat('Tarif', `${formatRupiah(record.tariff)}/kWh`);
    addStat('Energi/bulan', formatKWh(record.energy?.perMonth ?? 0));
    addStat('Energi/tahun', formatKWh(record.energy?.perYear ?? 0));
    addStat('Biaya/tahun', formatRupiah(record.cost?.perYear ?? 0));
    card.appendChild(stats);

    if (record.notes) card.appendChild(el('p', { class: 'history-note', text: `Catatan: ${record.notes}` }));

    const actions = el('div', { class: 'device-card__buttons' });
    const openBtn = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, iconEl('edit', { size: 15 }), el('span', { text: 'Buka & hitung ulang' }));
    openBtn.addEventListener('click', () => {
      globalThis.location.hash = `#/kalkulator?id=${record.id}`;
    });
    const dupBtn = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, iconEl('copy', { size: 15 }), el('span', { text: 'Duplikat' }));
    dupBtn.addEventListener('click', () => {
      globalThis.location.hash = `#/kalkulator?dup=${record.id}`;
    });
    const delBtn = el('button', { class: 'btn btn--ghost btn--sm btn--danger-text', type: 'button' }, iconEl('trash', { size: 15 }), el('span', { text: 'Hapus' }));
    delBtn.addEventListener('click', () => removeOne(record));
    actions.append(openBtn, dupBtn, delBtn);
    card.appendChild(actions);
    return card;
  }

  function render() {
    const items = history.query(filters);
    clear(listWrap);
    const total = history.list().length;
    summary.textContent =
      total === 0
        ? 'Belum ada perhitungan tersimpan.'
        : `Menampilkan ${formatInteger(items.length)} dari ${formatInteger(total)} catatan.`;

    if (items.length === 0) {
      listWrap.appendChild(
        el(
          'div',
          { class: 'empty-state' },
          iconEl('clock', { size: 28 }),
          el('h3', { text: total === 0 ? 'Riwayat masih kosong' : 'Tidak ada hasil yang cocok' }),
          el('p', {
            text:
              total === 0
                ? 'Simpan perhitungan dari halaman Kalkulator agar muncul di sini.'
                : 'Ubah kata kunci pencarian atau filter kategori.',
          })
        )
      );
      return;
    }
    for (const record of items) listWrap.appendChild(historyCard(record));
  }

  const info = el('div', { class: 'info-bar' });
  info.append(
    iconEl('info', { size: 16 }),
    el('span', {
      text: 'Gunakan Ekspor JSON/CSV untuk mencadangkan data. Menghapus data browser atau berpindah perangkat akan menghilangkan riwayat ini.',
    })
  );
  page.insertBefore(info, listWrap);

  render();
  return () => {};
}
