const UMD_PATH = '../../node_modules/html-to-image/dist/html-to-image.js';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Gagal memuat pustaka ekspor PNG.'));
    document.head.appendChild(script);
  });
}

export async function getHtmlToImage() {
  const mod = await import('html-to-image').catch(async () => {
    if (!globalThis.htmlToImage) await loadScript(new URL(UMD_PATH, import.meta.url).href);
    if (!globalThis.htmlToImage) throw new Error('Pustaka ekspor PNG tidak tersedia.');
    return globalThis.htmlToImage;
  });
  return mod.toPng ? mod : { toPng: globalThis.htmlToImage.toPng };
}
