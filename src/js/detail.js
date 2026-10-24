// Modal detail produk: galeri foto, pilihan varian, harga coret, status stok, jumlah.
import { fetchProductDetail } from './api.js';
import { rupiah, esc, PLACEHOLDER } from './utils.js';

const dlg = document.getElementById('detail');
const body = document.getElementById('detailBody');
const st = { id: null, product: null, categories: [], images: [], img: 0, variant: null, qty: 1 };
const $ = id => body.querySelector('#' + id);

export function openDetail(id, categories = []) {
  st.id = id;
  st.categories = categories;
  dlg.showModal();
  load();
}

async function load() {
  const id = st.id;
  body.innerHTML = `<div class="sk"><div class="d-main"></div></div>
    <div class="sk"><div class="line s"></div><div class="line m"></div><div class="line s"></div><div class="line m"></div></div>`;
  try {
    const p = await fetchProductDetail(id);
    if (id !== st.id) return; // modal sudah ditutup/ganti produk
    if (!p) return message('Produk tidak ditemukan', 'Produk ini mungkin sudah tidak dijual.');
    init(p);
    build();
    refresh();
  } catch {
    if (id === st.id) message('Detail gagal dimuat', 'Periksa koneksi internetmu lalu coba lagi.', true);
  }
}

function message(title, text, retry = false) {
  body.innerHTML = `<div class="state error" role="alert"><h2>${title}</h2><p>${text}</p>
    ${retry ? '<button type="button" data-retry>Coba lagi</button>' : ''}</div>`;
}

function init(p) {
  st.product = p;
  const extra = (p.images || []).slice().sort((a, b) => a.sort_order - b.sort_order).map(i => i.url);
  st.images = [...new Set([p.image_main, ...extra].filter(Boolean))];
  if (!st.images.length) st.images = [PLACEHOLDER];
  st.img = 0;
  st.qty = 1;
  st.variant = (p.variants || []).find(v => v.status !== 'sold_out') || null;
}

function build() {
  const p = st.product, vs = p.variants || [];
  const cat = st.categories.find(c => c.category_id === p.category_id);
  const thumbs = st.images.length > 1
    ? `<div class="d-thumbs">${st.images.map((u, i) =>
        `<button type="button" class="d-thumb" data-thumb="${i}" aria-label="Foto ${i + 1}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join('')}</div>`
    : '';
  const variants = vs.length
    ? `<div role="radiogroup" aria-label="Pilih varian">
         <p class="d-label">Varian: <span id="dVarName"></span></p>
         <div class="d-variants">${vs.map(v =>
           `<button type="button" class="vchip" role="radio" data-variant="${esc(v.variant_id)}" ${v.status === 'sold_out' ? 'disabled' : ''}>${esc(v.label)}${v.status === 'sold_out' ? ' (habis)' : ''}</button>`).join('')}</div>
       </div>`
    : '';
  body.innerHTML = `
    <div class="d-gallery">
      <div class="d-main"><img id="dMain" alt="${esc(p.name)}"><span class="badge" id="dBadge" hidden></span></div>
      ${thumbs}
    </div>
    <div class="d-info">
      ${cat ? `<p class="cat">${esc(cat.name)}</p>` : ''}
      <h2>${esc(p.name)}</h2>
      <div class="d-price"><strong id="dPrice"></strong><s id="dCompare"></s><span class="save" id="dSave"></span></div>
      <p class="stock" id="dStock"></p>
      ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ''}
      ${variants}
      <div class="d-buy">
        <div class="qty">
          <button type="button" data-qty="-1" aria-label="Kurangi jumlah">&minus;</button>
          <output id="dQty" aria-live="polite">1</output>
          <button type="button" data-qty="1" aria-label="Tambah jumlah">+</button>
        </div>
        <button type="button" class="add" id="dAdd" data-add></button>
      </div>
    </div>`;
}

// Perbarui harga, stok, tombol, dan pilihan aktif tanpa membangun ulang HTML.
function refresh() {
  const p = st.product, vs = p.variants || [], v = st.variant;
  const adj = v ? (v.price_adjustment || 0) : 0;
  const price = p.base_price + adj;
  const promo = p.compare_price && p.compare_price > p.base_price;
  const compare = promo ? p.compare_price + adj : 0;
  const out = p.status === 'sold_out' || (vs.length > 0 && !v);

  $('dMain').src = st.images[st.img];
  $('dPrice').textContent = rupiah(price);
  $('dCompare').textContent = compare ? rupiah(compare) : '';
  $('dCompare').hidden = !compare;
  $('dSave').textContent = compare ? `Hemat ${Math.round((1 - price / compare) * 100)}%` : '';
  $('dSave').hidden = !compare;

  const badge = $('dBadge');
  badge.hidden = !(out || promo);
  badge.textContent = out ? 'Habis' : 'Promo';
  badge.classList.toggle('out', out);

  const stock = $('dStock');
  stock.className = 'stock ' + (out ? 'out' : 'ok');
  stock.textContent = out ? 'Stok habis' : 'Tersedia';

  if ($('dVarName')) $('dVarName').textContent = v ? v.label : 'semua varian habis';
  body.querySelectorAll('[data-thumb]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.thumb === st.img)));
  body.querySelectorAll('[data-variant]').forEach(b => b.setAttribute('aria-checked', String(!!v && b.dataset.variant === v.variant_id)));

  $('dQty').textContent = st.qty;
  const add = $('dAdd');
  add.disabled = out;
  add.textContent = out ? 'Stok habis' : `Tambah ke keranjang \u00b7 ${rupiah(price * st.qty)}`;
}

dlg.addEventListener('click', e => {
  if (e.target === dlg || e.target.closest('[data-close]')) return dlg.close();
  if (e.target.closest('[data-retry]')) return load();
  if (!st.product) return;

  const thumb = e.target.closest('[data-thumb]');
  if (thumb) { st.img = +thumb.dataset.thumb; return refresh(); }

  const variant = e.target.closest('[data-variant]');
  if (variant) {
    st.variant = st.product.variants.find(x => x.variant_id === variant.dataset.variant) || st.variant;
    return refresh();
  }

  const qty = e.target.closest('[data-qty]');
  if (qty) { st.qty = Math.min(99, Math.max(1, st.qty + +qty.dataset.qty)); return refresh(); }

  const add = e.target.closest('[data-add]');
  if (add && !add.disabled) {
    document.dispatchEvent(new CustomEvent('cart:add', {
      detail: { product: st.product, variant: st.variant, quantity: st.qty }
    }));
    dlg.close();
  }
});

dlg.addEventListener('close', () => { st.id = null; st.product = null; });

// Foto gagal dimuat -> placeholder.
dlg.addEventListener('error', e => {
  if (e.target.tagName === 'IMG' && e.target.src !== PLACEHOLDER) e.target.src = PLACEHOLDER;
}, true);
