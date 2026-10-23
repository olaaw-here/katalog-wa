// Fungsi bantu umum.
export const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#E6EAE6"/><path d="M30 68l14-18 10 12 8-9 8 15z" fill="#B9C3BC"/><circle cx="38" cy="38" r="6" fill="#B9C3BC"/></svg>');

export const rupiah = n =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

// Escape teks dari database sebelum dimasukkan ke HTML (cegah XSS).
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));