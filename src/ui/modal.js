import { el } from './dom.js';

export function createDialog({ title, content, actions = [], wide = false, onClose = null }) {
  let resolvePromise;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  const dialog = el('dialog', { class: `modal${wide ? ' modal--wide' : ''}` });
  const form = el('form', { class: 'modal-body', method: 'dialog' });

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
  dialog.addEventListener('close', () => {
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
