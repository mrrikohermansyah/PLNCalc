import { storage as globalStorage } from './storage.js';
import { SCHEMA_VERSION } from '../core/constants.js';

const HISTORY_KEY = 'history';
const MAX_ITEMS = 500;

function createId() {
  return `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createHistoryStore(store = globalStorage) {
  function load() {
    const saved = store.read(HISTORY_KEY, null);
    if (saved && Array.isArray(saved.items)) {
      return { items: saved.items.filter((i) => i && typeof i === 'object') };
    }
    return { items: [] };
  }

  let state = load();

  function persist() {
    store.write(HISTORY_KEY, state);
  }

  function list() {
    return state.items;
  }

  function get(id) {
    return state.items.find((i) => i.id === id) ?? null;
  }

  function save(entry) {
    const record = {
      id: entry.id ?? createId(),
      createdAt: entry.createdAt ?? new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
      reportNumber: entry.reportNumber ?? null,
      name: String(entry.name ?? '').trim(),
      category: entry.category ?? 'Kustom',
      brand: entry.brand ?? '',
      model: entry.model ?? '',
      quantity: Number(entry.quantity) || 1,
      powerValue: Number(entry.powerValue) || 0,
      powerUnit: entry.powerUnit === 'kW' ? 'kW' : 'W',
      powerMethod: entry.powerMethod ?? 'nominal',
      calcMode: entry.calcMode ?? 'constant',
      powerMin: entry.powerMin ?? null,
      powerMax: entry.powerMax ?? null,
      hoursPerDay: Number(entry.hoursPerDay) || 0,
      extraMinutes: Number(entry.extraMinutes) || 0,
      daysPerWeek: entry.daysPerWeek ?? 7,
      daysPerMonth: entry.daysPerMonth ?? null,
      daysPerYear: entry.daysPerYear ?? null,
      tariff: Number(entry.tariff) || 0,
      energy: entry.energy ?? {},
      cost: entry.cost ?? {},
      notes: entry.notes ?? '',
      assumptions: entry.assumptions ?? [],
      mode: entry.mode ?? 'single',
    };
    const index = state.items.findIndex((i) => i.id === record.id);
    if (index === -1) {
      state.items.unshift(record);
    } else {
      state.items[index] = { ...state.items[index], ...record };
    }
    if (state.items.length > MAX_ITEMS) state.items = state.items.slice(0, MAX_ITEMS);
    persist();
    return record;
  }

  function remove(id) {
    const before = state.items.length;
    state.items = state.items.filter((i) => i.id !== id);
    const removed = state.items.length !== before;
    if (removed) persist();
    return removed;
  }

  function clear() {
    state.items = [];
    persist();
  }

  function query({ search = '', category = '', sort = 'date', order = 'desc' } = {}) {
    const term = search.trim().toLowerCase();
    let items = state.items.filter((item) => {
      if (category && item.category !== category) return false;
      if (!term) return true;
      return [item.name, item.brand, item.model, item.notes, item.category]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(term));
    });
    items = [...items];
    items.sort((a, b) => {
      if (sort === 'cost') {
        return (a.cost?.perMonth ?? 0) - (b.cost?.perMonth ?? 0);
      }
      if (sort === 'name') {
        return a.name.localeCompare(b.name, 'id');
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    if (order !== 'asc') items.reverse();
    return items;
  }

  function exportJSON() {
    return JSON.stringify(state.items, null, 2);
  }

  function exportCSV() {
    const headers = [
      'id',
      'createdAt',
      'reportNumber',
      'name',
      'category',
      'brand',
      'model',
      'quantity',
      'powerValue',
      'powerUnit',
      'powerMethod',
      'hoursPerDay',
      'extraMinutes',
      'daysPerWeek',
      'daysPerMonth',
      'daysPerYear',
      'tariff',
      'energyPerDay',
      'energyPerMonth',
      'energyPerYear',
      'costPerDay',
      'costPerMonth',
      'costPerYear',
      'notes',
    ];
    const esc = (value) => {
      if (value == null) return '';
      const s = String(value);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = state.items.map((item) =>
      [
        item.id,
        item.createdAt,
        item.reportNumber,
        item.name,
        item.category,
        item.brand,
        item.model,
        item.quantity,
        item.powerValue,
        item.powerUnit,
        item.powerMethod,
        item.hoursPerDay,
        item.extraMinutes,
        item.daysPerWeek,
        item.daysPerMonth,
        item.daysPerYear,
        item.tariff,
        item.energy?.perDay,
        item.energy?.perMonth,
        item.energy?.perYear,
        item.cost?.perDay,
        item.cost?.perMonth,
        item.cost?.perYear,
        item.notes,
      ]
        .map(esc)
        .join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  return {
    list,
    get,
    save,
    remove,
    clear,
    query,
    exportJSON,
    exportCSV,
    reload: () => { state = load(); },
  };
}

export const historyStore = createHistoryStore();
