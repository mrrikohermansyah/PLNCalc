import { el, clear } from './dom.js';
import { iconEl } from './icons.js';

export const ROUTES = [
  { id: 'kalkulator', label: 'Kalkulator', icon: 'bolt', title: 'Kalkulator Perangkat' },
  { id: 'multi', label: 'Multi-Perangkat', icon: 'layers', title: 'Kalkulator Multi-Perangkat' },
  { id: 'riwayat', label: 'Riwayat', icon: 'clock', title: 'Riwayat Perhitungan' },
  { id: 'preset', label: 'Preset Perangkat', icon: 'box', title: 'Preset Perangkat' },
  { id: 'pengaturan', label: 'Pengaturan', icon: 'gear', title: 'Pengaturan' },
  { id: 'panduan', label: 'Panduan', icon: 'book', title: 'Panduan Penggunaan' },
];

export function parseHash(hash = globalThis.location?.hash ?? '') {
  const raw = hash.replace(/^#/, '') || '/kalkulator';
  const [pathPart, queryPart] = raw.split('?');
  const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  const params = new URLSearchParams(queryPart ?? '');
  const id = ROUTES.find((r) => `/${r.id}` === path)?.id ?? 'kalkulator';
  return { id, path, params: Object.fromEntries(params.entries()) };
}

export function createRouter({ container, navList, renderers, onChange }) {
  let currentCleanup = null;

  function renderNav() {
    clear(navList);
    for (const route of ROUTES) {
      const link = el(
        'a',
        {
          class: 'nav-link',
          href: `#/${route.id}`,
          dataset: { route: route.id },
          'aria-current': 'false',
        },
        iconEl(route.icon, { size: 16 }),
        el('span', { text: route.label })
      );
      navList.appendChild(el('li', {}, link));
    }
  }

  function activateNav(id) {
    navList.querySelectorAll('.nav-link').forEach((link) => {
      const active = link.dataset.route === id;
      link.classList.toggle('nav-link--active', active);
      link.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  async function navigate() {
    const { id, params } = parseHash();
    if (typeof currentCleanup === 'function') currentCleanup();
    currentCleanup = null;
    clear(container);
    activateNav(id);
    const renderer = renderers[id] ?? renderers.kalkulator;
    const result = await renderer(container, { params, routeId: id });
    if (typeof result === 'function') currentCleanup = result;
    document.title = `PLNCalc — ${ROUTES.find((r) => r.id === id)?.title ?? 'Kalkulator'}`;
    onChange?.(id);
    globalThis.scrollTo?.({ top: 0, behavior: 'auto' });
  }

  renderNav();
  globalThis.addEventListener('hashchange', navigate);
  navigate();

  return {
    navigate(hash) {
      globalThis.location.hash = hash;
    },
    current: () => parseHash().id,
    stop() {
      globalThis.removeEventListener('hashchange', navigate);
      if (typeof currentCleanup === 'function') currentCleanup();
    },
  };
}
