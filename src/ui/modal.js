import { el } from './dom.js';

let openDialogs = 0;
let savedScrollY = 0;

function lockBackgroundScroll() {
  if (openDialogs === 0) {
    const de = document.documentElement;
    savedScrollY = window.scrollY || de.scrollTop || 0;
    // Kompensasi scrollbar agar layout desktop tidak bergeser saat body dikunci.
    const gutter = Math.max(0, window.innerWidth - de.clientWidth);
    de.style.setProperty('--modal-lock-offset', `${-savedScrollY}px`);
    de.style.setProperty('--modal-lock-gutter', `${gutter}px`);
    de.classList.add('modal-open');
  }
  openDialogs += 1;
}

function unlockBackgroundScroll() {
  openDialogs = Math.max(0, openDialogs - 1);
  if (openDialogs > 0) return;
  const de = document.documentElement;
  de.classList.remove('modal-open');
  const y = savedScrollY;
  savedScrollY = 0;
  de.style.removeProperty('--modal-lock-offset');
  de.style.removeProperty('--modal-lock-gutter');
  // Dibaca/scroll kembali setelah layout normal terpasang.
  requestAnimationFrame(() => window.scrollTo(0, y));
}

export function createDialog({ title, content, actions = [], wide = false, onClose = null }) {
  let resolvePromise;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  const dialog = el('dialog', { class: `modal${wide ? ' modal--wide' : ''}` });
  const form = el('form', { class: 'modal-body', method: 'dialog' });
  // Semua tombol dialog menutup lewat dialog.close(); submit implisit (Enter di HP) tidak boleh menutup dialog.
  form.addEventListener('submit', (e) => e.preventDefault());

  const header = el('div', { class: 'modal-head' });
  header.appendChild(el('h2', { class: 'modal-title', text: title }));
  header.appendChild(
    el('button', {
      class: 'modal-close',
      type: 'button',
      'aria-label': 'Tutup dialog',
      text: '×',
      on: { click: () => dialog.close('dismiss') },
    })
  );
  form.appendChild(header);

  const body = el('div', { class: 'modal-content' });
  if (typeof content === 'string') body.appendChild(el('p', { text: content }));
  else if (content instanceof Node) body.appendChild(content);
  form.appendChild(body);

  if (actions.length > 0) {
    const footer = el('div', { class: 'modal-actions' });
    for (const action of actions) {
      footer.appendChild(
        el('button', {
          class: `btn ${action.variant === 'danger' ? 'btn--danger' : action.variant === 'primary' ? 'btn--primary' : 'btn--ghost'}`,
          type: 'button',
          text: action.label,
          on: { click: () => dialog.close(action.value ?? 'ok') },
        })
      );
    }
    form.appendChild(footer);
  }

  dialog.appendChild(form);
  body.addEventListener('focusin', (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  });
  dialog.addEventListener('close', () => {
    unlockBackgroundScroll();
    const value = dialog.returnValue === 'dismiss' ? null : dialog.returnValue;
    dialog.remove();
    resolvePromise(value);
    onClose?.();
  });

  return {
    dialog,
    promise,
    open() {
      document.body.appendChild(dialog);
      dialog.showModal();
      lockBackgroundScroll();
      return promise;
    },
    close(value) {
      dialog.close(value ?? 'dismiss');
    },
  };
}

export function openModal(options) {
  return createDialog(options).open();
}

export async function confirmDialog({
  title = 'Konfirmasi',
  message = '',
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  danger = true,
}) {
  const result = await openModal({
    title,
    content: message,
    actions: [
      { label: cancelLabel, value: 'cancel' },
      { label: confirmLabel, value: 'confirm', variant: danger ? 'danger' : 'primary' },
    ],
  });
  return result === 'confirm';
}
