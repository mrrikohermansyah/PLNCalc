import { applyTheme } from './ui/theme.js';
import { createRouter } from './ui/router.js';
import { registerServiceWorker } from './ui/pwa.js';
import { iconEl } from './ui/icons.js';
import { toast } from './ui/toast.js';

import { settingsStore } from './data/settings.js';
import { presetStore } from './data/presets.js';
import { historyStore } from './data/history.js';
import { storage } from './data/storage.js';

import { renderCalculatorPage } from './ui/pages/calculatorPage.js';
import { renderMultiPage } from './ui/pages/multiPage.js';
import { renderHistoryPage } from './ui/pages/historyPage.js';
import { renderPresetsPage } from './ui/pages/presetsPage.js';
import { renderSettingsPage } from './ui/pages/settingsPage.js';
import { renderGuidePage } from './ui/pages/guidePage.js';

const themeToggle = document.getElementById('theme-toggle');
const themeIconHolder = themeToggle.querySelector('.theme-icon');

function syncThemeButton() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  themeIconHolder.replaceChildren(iconEl(isDark ? 'sun' : 'moon', { size: 18 }));
  themeToggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
  themeToggle.setAttribute('aria-label', isDark ? 'Aktifkan tema terang' : 'Aktifkan tema gelap');
}

applyTheme(settingsStore.get().theme);
syncThemeButton();

const ctx = {
  settings: settingsStore,
  presets: presetStore,
  history: historyStore,
  storage,
  theme: {
    apply(next) {
      applyTheme(next);
      syncThemeButton();
    },
    syncButtons: syncThemeButton,
  },
};

themeToggle.addEventListener('click', () => {
  const next = applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  settingsStore.update({ theme: next });
  syncThemeButton();
});

const renderers = {
  kalkulator: (container, opts) => renderCalculatorPage(ctx, container, opts),
  multi: (container, opts) => renderMultiPage(ctx, container, opts),
  riwayat: (container, opts) => renderHistoryPage(ctx, container, opts),
  preset: (container, opts) => renderPresetsPage(ctx, container, opts),
  pengaturan: (container, opts) => renderSettingsPage(ctx, container, opts),
  panduan: (container, opts) => renderGuidePage(ctx, container, opts),
};

createRouter({
  container: document.getElementById('app'),
  navList: document.getElementById('primary-nav'),
  renderers,
  onChange: () => syncThemeButton(),
});

registerServiceWorker({
  onUpdate: () => {
    if (settingsStore.get().showUpdatePrompt !== false) {
      toast('Versi baru PLNCalc sudah terpasang.', 'info', {
        duration: 0,
        action: { label: 'Muat ulang', onClick: () => globalThis.location.reload() },
      });
    }
  },
});
