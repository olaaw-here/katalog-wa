// Halaman Tentang Toko: profil, jam buka, alamat, media sosial.
import { CONFIG } from './config.js';
import { fetchStoreConfig } from './api.js';
import { esc, safeUrl } from './utils.js';
import { initWaFloat, numberOk, waLink } from './wa-float.js';

const FIELDS = ['store_name', 'description', 'address', 'open_hours', 'instagram', 'tiktok', 'facebook', 'maps_url'];
const root = document.getElementById('about');

async function load() {
  const data = { store_name: CONFIG.STORE_NAME, ...CONFIG.ABOUT };
  try {
    const row = await fetchStoreConfig();
    if (row) FIELDS.forEach(k => { if (row[k]) data[k] = row[k]; });
  } catch { /* gagal/ belum dikonfigurasi: pakai profil bawaan dari config.js */ }
  render(data);
}

const social = (value, base) => {
  const v = String(value || '').trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? safeUrl(v) : safeUrl(base + encodeURIComponent(v.replace(/^@/, '')));
};

function render(d) {
  document.getElementById('storeName').textContent = d.store_name;
  document.getElementById('footName').textContent = d.store_name;
  document.title = `Tentang Toko | ${d.store_name}`;

  const hours = String(d.open_hours || '').split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const m = line.match(/^(.*?):\s*(.+)$/);
    return m ? `<div><dt>${esc(m[1])}</dt><dd>${esc(m[2])}</dd></div>` : `<div><dd>${esc(line)}</dd></div>`;
  }).join('');

  const map = safeUrl(d.maps_url) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.address || d.store_name)}`;
  const socials = [
    ['Instagram', social(d.instagram, 'https://instagram.com/')],
    ['TikTok', social(d.tiktok, 'https://www.tiktok.com/@')],
    ['Facebook', social(d.facebook, 'https://facebook.com/')]
  ].filter(([, url]) => url);

  root.innerHTML = `
    <section class="about-hero">
      <h1>${esc(d.store_name)}</h1>
      <p>${esc(d.description)}</p>
      <div class="actions">
        <a class="btn" href="index.html">Lihat katalog</a>
        ${numberOk() ? `<a class="btn ghost" href="${esc(waLink(`Halo ${d.store_name}, saya mau tanya-tanya.`))}" target="_blank" rel="noopener noreferrer">Chat via WhatsApp</a>` : ''}
      </div>
    </section>
    <div class="about-grid">
      ${hours ? `<section class="panel"><h2>Jam buka</h2><dl class="hours">${hours}</dl></section>` : ''}
      ${d.address ? `<section class="panel"><h2>Alamat</h2><p>${esc(d.address)}</p>
        <div class="actions"><a class="btn ghost" href="${esc(map)}" target="_blank" rel="noopener noreferrer">Buka di Google Maps</a></div></section>` : ''}
      ${socials.length ? `<section class="panel"><h2>Media sosial</h2><ul class="socials">${socials.map(([n, u]) =>
        `<li><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${n}</a></li>`).join('')}</ul></section>` : ''}
      <section class="panel"><h2>Cara memesan</h2>
        <ol class="steps"><li>Pilih produk di katalog dan masukkan ke keranjang.</li><li>Isi nama dan metode pengambilan, lalu tekan Kirim via WhatsApp.</li><li>Penjual mengonfirmasi stok, ongkir, dan pembayaran lewat chat.</li></ol></section>
    </div>`;
}

initWaFloat();
load();
