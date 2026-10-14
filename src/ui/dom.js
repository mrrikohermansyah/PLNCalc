export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'htmlFor') node.setAttribute('for', value);
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'style') node.setAttribute('style', value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'on' && typeof value === 'object') {
      for (const [event, handler] of Object.entries(value)) node.addEventListener(event, handler);
    } else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, value);
  }
  appendChildren(node, children);
  return node;
}

export function appendChildren(node, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    node.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function debounce(fn, ms = 200) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function downloadTextFile(text, filename, mime = 'application/json') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename, rel: 'noopener' });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function labeledField(labelText, control, { hint = null, htmlFor = control.id || null } = {}) {
  const wrapper = el('div', { class: 'field' });
  const label = el('label', { class: 'field-label', text: labelText });
  if (htmlFor) label.setAttribute('for', htmlFor);
  wrapper.appendChild(label);
  wrapper.appendChild(control);
  if (hint) wrapper.appendChild(el('p', { class: 'field-hint', text: hint }));
  const error = el('p', { class: 'field-error', role: 'alert', hidden: true });
  wrapper.appendChild(error);
  control.dataset.errorNode = '1';
  wrapper.dataset.fieldError = '';
  control._errorNode = error;
  return { wrapper, error, control };
}

export function setFieldError(control, message) {
  if (!control) return;
  if (control._errorNode) {
    control._errorNode.textContent = message ?? '';
    control._errorNode.hidden = !message;
  }
  if (message) control.setAttribute('aria-invalid', 'true');
  else control.removeAttribute('aria-invalid');
}

export function clearFieldErrors(root) {
  root.querySelectorAll('.field-error').forEach((node) => {
    node.textContent = '';
    node.hidden = true;
  });
  root.querySelectorAll('[aria-invalid]').forEach((node) => node.removeAttribute('aria-invalid'));
}
