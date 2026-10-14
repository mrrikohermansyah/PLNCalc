const PATHS = {
  bolt: 'M13 2 3 14h7l-1 8 10-12h-7z',
  layers: 'M12 2 2 7l10 5 10-5zM2 12l10 5 10-5M2 17l10 5 10-5',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm8.5 3a8.5 8.5 0 0 0-.14-1.5l2-1.56-2-3.46-2.36.95a8.5 8.5 0 0 0-2.6-1.5L15 2h-4l-.4 2.43a8.5 8.5 0 0 0-2.6 1.5L5.64 5 3.64 8.44l2 1.56A8.5 8.5 0 0 0 5.5 12c0 .52.05 1.02.14 1.5l-2 1.56 2 3.46 2.36-.95c.77.63 1.65 1.14 2.6 1.5L11 22h4l.4-2.43a8.5 8.5 0 0 0 2.6-1.5l2.36.95 2-3.46-2-1.56c.09-.48.14-.98.14-1.5z',
  book: 'M4 3h12a4 4 0 0 1 4 4v14H8a4 4 0 0 1-4-4zM4 17a4 4 0 0 1 4-4h12',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  edit: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z',
  copy: 'M9 9h10v10H9zM5 15H3V3h12v2',
  download: 'M12 3v12m0 0 4-4m-4 4-4-4M3 21h18',
  upload: 'M12 21V9m0 0 4 4m-4-4-4 4M3 3h18',
  print: 'M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z',
  save: 'M5 3h11l3 3v15H5zM8 3v6h8V3M8 14h8v7H8z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  x: 'M18 6 6 18M6 6l12 12',
  check: 'M20 6 9 17l-5-5',
  refresh: 'M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6',
  share: 'M12 16V4m0 0L8 8m4-4 4 4M4 14v6h16v-6',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  chevronDown: 'm6 9 6 6 6-6',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8h.01M11 12h1v4h1',
  wallet: 'M3 7h18v10H3zM16 12h2M3 7l3-3h12l3 3',
};

export function iconEl(name, { size = 18, label = null } = {}) {
  const path = PATHS[name] ?? PATHS.info;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', label ? 'false' : 'true');
  if (label) svg.setAttribute('role', 'img');
  const elPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  elPath.setAttribute('d', path);
  svg.appendChild(elPath);
  return svg;
}

export function iconButton(name, label, onClick, { variant = 'ghost', size = 18 } = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `btn btn--icon btn--${variant}`;
  btn.setAttribute('aria-label', label);
  btn.title = label;
  btn.appendChild(iconEl(name, { size }));
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}
