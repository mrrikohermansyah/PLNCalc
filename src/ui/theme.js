export function applyTheme(theme) {
  const value = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = value;
  document.documentElement.style.colorScheme = value;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', value === 'dark' ? '#0f1420' : '#ffffff');
  return value;
}

export function createThemeController({ settings, onToggle }) {
  const current = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

  function init() {
    applyTheme(settings.get().theme);
  }

  function toggle() {
    const next = current() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    settings.update({ theme: next });
    onToggle?.(next);
    return next;
  }

  return { init, toggle, current };
}
