import { sanitizeFilename, formatDateFile } from '../core/format.js';
import { getHtmlToImage } from '../vendor/htmlToImage.js';

export function buildExportFilename(deviceName, date = new Date()) {
  return `PLNCalc-${sanitizeFilename(deviceName)}-${formatDateFile(date)}.png`;
}

function dataUrlToBlob(dataUrl) {
  const [head, body] = dataUrl.split(',');
  const mimeMatch = head.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function renderReceiptPng(element, scale = 2) {
  const { toPng } = await getHtmlToImage();
  const rect = element.getBoundingClientRect();
  const width = Math.max(Math.ceil(rect.width), Math.ceil(element.scrollWidth));
  const height = Math.ceil(element.scrollHeight);
  if (width <= 0 || height <= 0) {
    throw new Error('Elemen struk tidak memiliki ukuran yang valid. Buka halaman kalkulator terlebih dahulu.');
  }

  const clone = element.cloneNode(true);
  clone.classList.add('rc-export');
  clone.style.width = `${width}px`;
  clone.style.margin = '0';
  clone.style.boxShadow = 'none';
  clone.style.transform = 'none';

  const wrapper = document.createElement('div');
  wrapper.style.cssText =
    'position:fixed;left:-100000px;top:0;padding:0;background:#ffffff;color-scheme:light;';
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    if (document.fonts?.ready) {
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]);
    }
    const dataUrl = await toPng(clone, {
      pixelRatio: scale,
      backgroundColor: '#ffffff',
      width,
      height,
      cacheBust: true,
      style: { margin: '0', transform: 'none', boxShadow: 'none' },
    });
    if (!dataUrl || !dataUrl.startsWith('data:image/png')) {
      throw new Error('Hasil ekspor PNG tidak valid.');
    }
    return dataUrlToBlob(dataUrl);
  } finally {
    wrapper.remove();
  }
}

export async function exportReceiptPng(element, { filename, scale = 2, preferShare = false } = {}) {
  if (!element) throw new Error('Elemen struk tidak ditemukan.');
  let blob;
  try {
    blob = await renderReceiptPng(element, scale);
  } catch (err) {
    const message = err?.message ?? '';
    if (/Failed to execute|foreignObject|cross-origin|font/i.test(message)) {
      throw new Error('Ekspor PNG gagal karena browser tidak dapat merender elemen struk. Coba muat ulang halaman lalu ulangi.');
    }
    throw err instanceof Error ? err : new Error('Ekspor PNG gagal.');
  }

  const name = filename ?? `PLNCalc-${formatDateFile(new Date())}.png`;

  if (preferShare && typeof File === 'function' && navigator.canShare) {
    const file = new File([blob], name, { type: 'image/png' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'PLNCalc', text: 'Struk perhitungan PLNCalc' });
        return { method: 'share', filename: name, blob };
      } catch (err) {
        if (err?.name === 'AbortError') return { method: 'canceled', filename: name, blob };
        // lanjut ke fallback download
      }
    }
  }

  downloadBlob(blob, name);
  return { method: 'download', filename: name, blob };
}
