import { DEFAULTS, SCHEMA_VERSION } from '../core/constants.js';
import { storage as globalStorage } from './storage.js';

const SETTINGS_KEY = 'settings';

export const defaultSettings = () => ({
  schemaVersion: SCHEMA_VERSION,
  tariff: DEFAULTS.tariff,
  tariffName: DEFAULTS.tariffName,
  tariffCategory: 'Rumah tangga',
  daysPerMonth: DEFAULTS.daysPerMonth,
  daysPerYear: DEFAULTS.daysPerYear,
  theme: 'light',
  currency: 'IDR',
  receiptMode: 'detail',
  confirmDestructive: true,
  showUpdatePrompt: true,
});

export function createSettingsStore(store = globalStorage) {
  let settings = { ...defaultSettings() };

  function load() {
    const saved = store.read(SETTINGS_KEY, null);
    if (saved && typeof saved === 'object') {
      settings = { ...defaultSettings(), ...saved };
    } else {
      settings = defaultSettings();
    }
    return settings;
  }

  function get() {
    return settings;
  }

  function update(patch) {
    settings = { ...settings, ...patch };
    store.write(SETTINGS_KEY, settings);
    return settings;
  }

  function reset() {
    settings = defaultSettings();
    store.write(SETTINGS_KEY, settings);
    return settings;
  }

  load();
  return { load, get, update, reset };
}

export const settingsStore = createSettingsStore();
