// Titik masuk: state, filter, event, dan alur memuat data.
import { CONFIG } from './config.js';
import { PLACEHOLDER } from './utils.js';
import { fetchProducts, fetchCategories } from './api.js';
import { openDetail } from './detail.js';
import { grid, chips, showLoading, showError, renderChips, renderProducts, toast } from './ui.js';
import { initCart, reconcile } from './cart.js';
import { initCartUI, showNotices } from './cart-ui.js';
import { initCheckout } from './checkout-ui.js';

const state = { products: [], categories: [], q: '', cat: 'all', sort: 'new' };

const sorters = {
  new:  (a, b) => new Date(b.created_at) - new Date(a.created_at),
  low:  (a, b) => a.base_price - b.base_price,
  high: (a, b) => b.base_price - a.base_price,
  name: (a, b) => a.name.localeCompare(b.name, 'id')
};

function visibleProducts() {
  const q = state.q.trim().toLowerCase();
  return state.products
    .filter(p => (state.cat === 'all' || p.category_id === state.cat) && (!q || p.name.toLowerCase().includes(q)))
    .sort(sorters[state.sort]);
}

function render() {
  renderProducts(visibleProducts(), state.categories, {
    filtered: Boolean(state.q || state.cat !== 'all'),
    onReset: () => {
      state.q = ''; state.cat = 'all';
      document.getElementById('q').value = '';
      renderChips(state.categories, state.cat);
      render();
    }
  });
}

async function loadCatalog() {
  showLoading();
  try {
    [state.products, state.categories] = await Promise.all([fetchProducts(), fetchCategories()]);
    renderChips(state.categories, state.cat);
    render();
    showNotices(reconcile(state.products)); // sinkronkan harga/stok keranjang dengan data terbaru
  } catch (err) {
    showError(err, loadCatalog);
  }
}

/* ----- Event ----- */
let debounce;
document.getElementById('q').addEventListener('input', e => {
  clearTimeout(debounce);
  debounce = setTimeout(() => { state.q = e.target.value; render(); }, 200);
});

document.getElementById('sort').addEventListener('change', e => {
  state.sort = e.target.value;
  render();
});

chips.addEventListener('click', e => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  state.cat = btn.dataset.cat;
  renderChips(state.categories, state.cat);
  render();
});

// Gambar gagal dimuat -> ganti placeholder.
grid.addEventListener('error', e => {
  if (e.target.tagName === 'IMG' && e.target.src !== PLACEHOLDER) e.target.src = PLACEHOLDER;
}, true);

// Klik foto, nama, atau "Pilih varian" membuka detail; tombol tambah langsung ke keranjang.
grid.addEventListener('click', e => {
  const opener = e.target.closest('[data-open]');
  if (opener) { openDetail(opener.dataset.open, state.categories); return; }
  const btn = e.target.closest('.add[data-id]');
  if (!btn) return;
  const product = state.products.find(p => p.product_id === btn.dataset.id);
  document.dispatchEvent(new CustomEvent('cart:add', { detail: { product, variant: null, quantity: 1 } }));
});

/* ----- Mulai ----- */
document.getElementById('storeName').textContent = CONFIG.STORE_NAME;
document.title = `${CONFIG.STORE_NAME} | Katalog Produk`;
initCart();
initCartUI();
initCheckout();
loadCatalog();
