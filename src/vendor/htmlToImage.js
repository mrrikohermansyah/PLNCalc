// html-to-image dibundel relatif (UMD resmi, MIT) sehingga ekspor PNG tidak lagi
// mengambil node_modules/... saat runtime — sebelumnya gagal 404 di hasil build.
import './html-to-image.umd.js';

export function getHtmlToImage() {
  const lib = globalThis.htmlToImage;
  if (!lib || typeof lib.toPng !== 'function') {
    throw new Error('Pustaka ekspor PNG tidak tersedia.');
  }
  return lib;
}
