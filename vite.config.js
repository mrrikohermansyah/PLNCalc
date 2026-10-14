import { defineConfig } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function swVersionStamp() {
  return {
    name: 'plncalc-sw-version-stamp',
    closeBundle() {
      const swPath = resolve('dist/sw.js');
      try {
        const src = readFileSync(swPath, 'utf8');
        const version = `${Date.now().toString(36)}`;
        writeFileSync(swPath, src.replaceAll('__APP_VERSION__', version));
      } catch {
        // sw.js tidak ada di build — abaikan
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [swVersionStamp()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
