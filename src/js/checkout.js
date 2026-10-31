// Logika checkout (tanpa DOM): validasi, format pesan, encode, dan batas panjang link wa.me.
import { CONFIG } from './config.js';
import { rupiah } from './utils.js';

export const LIMITS = { name: 60, address: 200, note: 200 };
const DRAFT_KEY = 'checkout_draft_v1';
// Intl memakai spasi tak terputus (U+00A0); di pesan WhatsApp cukup spasi biasa (link lebih pendek).
const money = n => rupiah(n).replace(/\u00a0/g, ' ');

export function loadDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {}; } catch { return {}; }
}
export function saveDraft(d) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* abaikan */ }
}

// Buang karakter kontrol, rapikan spasi/baris baru, potong sesuai batas.
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

export function normalize(raw) {
  return {
    name: clean(raw.name, LIMITS.name),
    method: raw.method === 'delivery' ? 'delivery' : 'pickup',
    address: clean(raw.address, LIMITS.address),
    note: clean(raw.note, LIMITS.note)
  };
}

export function validate(raw) {
  const values = normalize(raw);
  const errors = {};
  if (values.name.length < 2) errors.name = 'Nama wajib diisi (minimal 2 huruf).';
  if (values.method === 'delivery' && values.address.length < 10) {
    errors.address = 'Alamat lengkap wajib diisi untuk pengiriman (minimal 10 karakter).';
  }
  return { ok: Object.keys(errors).length === 0, errors, values };
}

export const isNumberValid = () => /^[1-9]\d{9,14}$/.test(CONFIG.WA_NUMBER);

function format(items, total, v, compact) {
  const lines = [`Halo ${CONFIG.STORE_NAME}, saya ingin memesan:`, ''];
  items.forEach((i, n) => {
    const variant = i.variant_label ? ` (${i.variant_label})` : '';
    const price = compact ? '' : ` = ${money(i.unit_price * i.quantity)}`;
    lines.push(`${n + 1}. ${i.name}${variant} x${i.quantity}${price}`);
  });
  lines.push('', `*Total: ${money(total)}*`, '', `Nama: ${v.name}`,
    `Metode: ${v.method === 'delivery' ? 'Kirim' : 'Ambil di tempat'}`);
  if (v.method === 'delivery') lines.push(`Alamat: ${v.address}`);
  if (v.note) lines.push(`Catatan: ${v.note}`);
  lines.push('', 'Terima kasih.');
  return lines.join('\n');
}

export const buildUrl = message => `https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(message)}`;

// Susun pesan. Kalau link terlalu panjang, pakai format ringkas (tanpa harga per baris).
// Masih terlalu panjang -> tooLong: true (UI menawarkan salin manual).
export function prepare(items, total, values) {
  const full = format(items, total, values, false);
  let message = full, url = buildUrl(message), compact = false;
  if (url.length > CONFIG.MAX_URL_LENGTH) {
    message = format(items, total, values, true);
    url = buildUrl(message);
    compact = true;
  }
  return { message, full, url, compact, length: url.length, tooLong: url.length > CONFIG.MAX_URL_LENGTH };
}
