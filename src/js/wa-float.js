// Tombol WhatsApp mengambang untuk tanya-tanya tanpa memesan. Dipakai di semua halaman.
import { CONFIG } from './config.js';

export const numberOk = () => /^[1-9]\d{9,14}$/.test(CONFIG.WA_NUMBER);
export const waLink = text => `https://wa.me/${CONFIG.WA_NUMBER}` + (text ? `?text=${encodeURIComponent(text)}` : '');

export function initWaFloat() {
  if (!numberOk()) return; // nomor belum benar: jangan tampilkan tombol yang rusak
  const a = document.createElement('a');
  a.className = 'wa-float';
  a.href = waLink(`Halo ${CONFIG.STORE_NAME}, saya mau tanya-tanya produk.`);
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.setAttribute('aria-label', 'Chat penjual via WhatsApp');
  a.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg><span class="wa-label">Tanya via WhatsApp</span>`;
  document.body.append(a);
}
