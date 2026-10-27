// Tampilan keranjang: badge di header dan panel keranjang (drawer).
import { getItems, getCount, getTotal, setQty, remove, clear } from './cart.js';
import { rupiah, esc, PLACEHOLDER } from './utils.js';
import { toast } from './ui.js';

const dlg = document.getElementById('cart');
const list = document.getElementById('cartItems');
const foot = document.getElementById('cartFoot');
const noticeBox = document.getElementById('cartNotices');
const badge = document.getElementById('cartCount');
const cartBtn = document.getElementById('cartBtn');
let notices = [];
let refocus = null;

function render() {
  const items = getItems();
  const count = getCount();

  badge.textContent = count;
  badge.hidden = count === 0;
  cartBtn.setAttribute('aria-label', count ? `Buka keranjang, ${count} item` : 'Buka keranjang');

  noticeBox.innerHTML = notices.length
    ? `<div class="c-notice" role="status"><ul>${notices.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
         <button type="button" data-dismiss>Tutup</button></div>`
    : '';

  if (!items.length) {
    list.innerHTML = `<li class="c-empty"><h3>Keranjang masih kosong</h3>
      <p>Pilih produk di katalog, lalu tambahkan ke keranjang.</p>
      <button type="button" class="add" data-close>Lanjut belanja</button></li>`;
    foot.innerHTML = '';
  } else {
    list.innerHTML = items.map(i => `
      <li class="ci">
        <img src="${esc(i.image || PLACEHOLDER)}" alt="" width="72" height="72">
        <div class="ci-info">
          <p class="ci-name">${esc(i.name)}</p>
          ${i.variant_label ? `<p class="ci-var">${esc(i.variant_label)}</p>` : ''}
          <p class="ci-unit">${rupiah(i.unit_price)}</p>
          <div class="ci-row">
            <div class="qty">
              <button type="button" data-qty="-1" data-id="${esc(i.id)}" aria-label="Kurangi ${esc(i.name)}">&minus;</button>
              <output>${i.quantity}</output>
              <button type="button" data-qty="1" data-id="${esc(i.id)}" aria-label="Tambah ${esc(i.name)}">+</button>
            </div>
            <button type="button" class="ci-del" data-remove="${esc(i.id)}">Hapus</button>
          </div>
        </div>
        <strong class="ci-sub">${rupiah(i.unit_price * i.quantity)}</strong>
      </li>`).join('');
    foot.innerHTML = `
      <div class="c-total"><span>Total (${count} item)</span><strong>${rupiah(getTotal())}</strong></div>
      <button type="button" class="add" data-checkout>Checkout via WhatsApp</button>
      <button type="button" class="c-clear" data-clear>Kosongkan keranjang</button>`;
  }

  if (refocus) { dlg.querySelector(refocus)?.focus(); refocus = null; }
}

export function showNotices(list) {
  if (!list.length) return;
  notices = list;
  render();
  toast('Keranjang diperbarui, cek isinya');
}

export function initCartUI() {
  cartBtn.addEventListener('click', () => dlg.showModal());
  document.addEventListener('cart:change', render);
  document.addEventListener('cart:add', e => {
    const { product, variant } = e.detail;
    toast(`${product.name}${variant ? ' (' + variant.label + ')' : ''} masuk keranjang`);
  });

  dlg.addEventListener('click', e => {
    if (e.target === dlg || e.target.closest('[data-close]')) return dlg.close();
    if (e.target.closest('[data-dismiss]')) { notices = []; return render(); }

    const q = e.target.closest('[data-qty]');
    if (q) {
      const item = getItems().find(i => i.id === q.dataset.id);
      if (!item) return;
      const next = item.quantity + Number(q.dataset.qty);
      if (next >= 1) refocus = `[data-qty="${q.dataset.qty}"][data-id="${CSS.escape(q.dataset.id)}"]`;
      return setQty(item.id, next);
    }
    const del = e.target.closest('[data-remove]');
    if (del) return remove(del.dataset.remove);

    if (e.target.closest('[data-clear]')) {
      if (confirm('Kosongkan semua isi keranjang?')) clear();
      return;
    }
    if (e.target.closest('[data-checkout]')) {
      document.dispatchEvent(new CustomEvent('cart:checkout', { detail: { items: getItems(), total: getTotal() } }));
    }
  });

  dlg.addEventListener('close', () => { notices = []; render(); });
  dlg.addEventListener('error', e => {
    if (e.target.tagName === 'IMG' && e.target.src !== PLACEHOLDER) e.target.src = PLACEHOLDER;
  }, true);
}
