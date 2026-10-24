// Semua urusan tampilan: loading, error, kosong, chip, kartu produk, toast.
import { rupiah, esc, PLACEHOLDER } from './utils.js';

export const grid = document.getElementById('grid');
export const chips = document.getElementById('chips');
const info = document.getElementById('info');
const toastEl = document.getElementById('toast');

export function showLoading() {
  grid.setAttribute('aria-busy', 'true');
  info.textContent = 'Memuat produk...';
  grid.innerHTML = Array.from({ length: 8 }, () =>
    `<div class="card sk" aria-hidden="true">
       <div class="thumb"></div><div class="line s"></div><div class="line m"></div><div class="line s"></div>
     </div>`).join('');
}

export function showError(err, onRetry) {
  grid.setAttribute('aria-busy', 'false');
  info.textContent = '';
  let msg = 'Terjadi kendala saat mengambil data produk. Periksa koneksi internetmu lalu coba lagi.';
  if (err.message === 'CONFIG') msg = 'URL dan kunci Supabase belum diisi. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di js/config.js.';
  else if (err.name === 'AbortError') msg = 'Server terlalu lama merespons. Coba muat ulang.';
  else if (/HTTP (401|403)/.test(err.message)) msg = 'Akses ditolak. Periksa anon key dan aturan Row Level Security (izin SELECT untuk pengunjung).';
  else if (/HTTP 404/.test(err.message)) msg = 'Tabel produk tidak ditemukan. Pastikan tabel products dan categories sudah dibuat.';

  grid.innerHTML = `<div class="state error" role="alert">
    <h2>Produk gagal dimuat</h2><p>${esc(msg)}</p>
    <button type="button" id="retry">Coba lagi</button></div>`;
  document.getElementById('retry').addEventListener('click', onRetry);
}

export function renderChips(categories, activeId) {
  const items = [{ category_id: 'all', name: 'Semua' }, ...categories];
  chips.innerHTML = items.map(c =>
    `<button class="chip" type="button" data-cat="${esc(c.category_id)}" aria-pressed="${activeId === c.category_id}">${esc(c.name)}</button>`
  ).join('');
}

function card(p, categories) {
  const out = p.status === 'sold_out';
  const promo = p.compare_price && p.compare_price > p.base_price;
  const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
  const cat = categories.find(c => c.category_id === p.category_id);
  const id = esc(p.product_id);
  const action = out
    ? '<button class="add" type="button" disabled>Stok habis</button>'
    : hasVariants
      ? `<button class="add" type="button" data-open="${id}">Pilih varian</button>`
      : `<button class="add" type="button" data-id="${id}">Tambah ke keranjang</button>`;
  return `<article class="card${out ? ' soldout' : ''}">
    <button class="thumb" type="button" data-open="${id}" aria-label="Lihat detail ${esc(p.name)}">
      <img src="${esc(p.image_main || PLACEHOLDER)}" alt="" loading="lazy" width="400" height="400">
      ${out ? '<span class="badge out">Habis</span>' : promo ? '<span class="badge">Promo</span>' : ''}
    </button>
    ${cat ? `<p class="cat">${esc(cat.name)}</p>` : ''}
    <h3 class="name"><button type="button" class="name-btn" data-open="${id}">${esc(p.name)}</button></h3>
    <div class="price"><strong>${rupiah(p.base_price)}</strong>${promo ? `<s>${rupiah(p.compare_price)}</s>` : ''}</div>
    ${action}
  </article>`;
}

export function renderProducts(list, categories, { filtered, onReset }) {
  grid.setAttribute('aria-busy', 'false');
  info.textContent = list.length ? `${list.length} produk` : '';

  if (!list.length) {
    grid.innerHTML = `<div class="state">
      <h2>${filtered ? 'Produk tidak ditemukan' : 'Belum ada produk'}</h2>
      <p>${filtered ? 'Ubah kata kunci atau pilih kategori lain.' : 'Produk akan tampil di sini setelah penjual menambahkannya.'}</p>
      ${filtered ? '<button type="button" id="reset">Hapus filter</button>' : ''}</div>`;
    const reset = document.getElementById('reset');
    if (reset) reset.addEventListener('click', onReset);
    return;
  }
  grid.innerHTML = list.map(p => card(p, categories)).join('');
}

export function setCartCount(n) {
  document.getElementById('cartCount').textContent = n;
}

let toastTimer;
export function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
}
