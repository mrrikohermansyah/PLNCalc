function randomPart(length) {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  if (globalThis.crypto?.getRandomValues) {
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => chars[b % chars.length]).join('');
  }
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function generateReportNumber(now = Date.now()) {
  const timePart = now.toString(36).toUpperCase().slice(-4).padStart(4, '0');
  return `PLC-${timePart}${randomPart(4)}`;
}
