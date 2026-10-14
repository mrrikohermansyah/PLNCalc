import { el } from './dom.js';

let container = null;

function ensureContainer() {
  if (container && document.body.contains(container)) return container;
  container = el('div', { class: 'toast-stack', role: 'status', 'aria-live': 'polite' });
  document.body.appendChild(container);
  return container;
}

export function toast(message, type = 'info', { duration = 3600, action = null } = {}) {
  const stack = ensureContainer();
  const node = el('div', { class: `toast toast--${type}` });
  node.appendChild(el('span', { class: 'toast-msg', text: message }));
  if (action) {
    node.appendChild(
      el('button', {
        class: 'toast-action btn btn--sm',
        type: 'button',
        text: action.label,
        on: {
          click: () => {
            action.onClick?.();
            dismiss();
          },
        },
      })
    );
  }
  node.appendChild(
    el('button', {
      class: 'toast-close',
      type: 'button',
      'aria-label': 'Tutup notifikasi',
      text: '×',
      on: { click: () => dismiss() },
    })
  );

  let timer = null;
  function dismiss() {
    clearTimeout(timer);
    node.classList.add('toast--leaving');
    setTimeout(() => node.remove(), 220);
  }
  if (duration > 0) timer = setTimeout(dismiss, duration);

  stack.appendChild(node);
  return dismiss;
}

export const toastSuccess = (message, opts) => toast(message, 'success', opts);
export const toastError = (message, opts) => toast(message, 'error', { duration: 6000, ...opts });
export const toastInfo = (message, opts) => toast(message, 'info', opts);
