// Logika keranjang (tanpa DOM): tambah, ubah jumlah, hapus, hitung, simpan ke Local Storage.
// Setiap perubahan memicu event 'cart:change' di document.
import { rupiah } from './utils.js';

const KEY = 'cart_v1';
const MAX_QTY = 99;
let items = [];

const isValid = i => i && i.id && i.product_id && Number.isFinite(i.unit_price) && i.quantity > 0;
const keyOf = (productId, variantId) => `${productId}:${variantId || '-'}`;
const clamp = n => Math.min(MAX_QTY, Math.max(1, Math.floor(n) || 1));

function read() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(data?.items) ? data.items.filter(isValid) : [];
  } catch { return []; } // storage diblokir / data rusak -> mulai kosong
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ updated_at: new Date().toISOString(), items })); }
  catch { /* mode privat / penuh: keranjang tetap jalan di memori */ }
}

function commit() {
  save();
  document.dispatchEvent(new CustomEvent('cart:change', {
    detail: { items: getItems(), count: getCount(), total: getTotal() }
  }));
}

export const getItems = () => items.map(i => ({ ...i }));
export const getCount = () => items.reduce((n, i) => n + i.quantity, 0);
export const getTotal = () => items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

export function initCart() {
  items = read();
  document.addEventListener('cart:add', e => add(e.detail));
  // Sinkron antar tab: tab lain mengubah keranjang -> muat ulang.
  window.addEventListener('storage', e => {
    if (e.key === KEY) { items = read(); commit(); }
  });
  commit();
}

export function add({ product, variant = null, quantity = 1 }) {
  const id = keyOf(product.product_id, variant?.variant_id);
  const unitPrice = product.base_price + (variant?.price_adjustment || 0);
  const found = items.find(i => i.id === id);
  if (found) {
    found.quantity = clamp(found.quantity + quantity);
    found.unit_price = unitPrice;
  } else {
    items.push({
      id,
      product_id: product.product_id,
      variant_id: variant?.variant_id || null,
      name: product.name,
      variant_label: variant?.label || '',
      image: product.image_main || '',
      unit_price: unitPrice,
      quantity: clamp(quantity)
    });
  }
  commit();
}

export function setQty(id, quantity) {
  if (quantity < 1) return remove(id);
  const item = items.find(i => i.id === id);
  if (!item) return;
  item.quantity = clamp(quantity);
  commit();
}

export function remove(id) {
  items = items.filter(i => i.id !== id);
  commit();
}

export function clear() {
  items = [];
  commit();
}

// Cocokkan keranjang dengan data produk terbaru. Mengembalikan daftar pemberitahuan.
export function reconcile(products) {
  const notices = [];
  items = items.filter(i => {
    const p = products.find(x => x.product_id === i.product_id);
    const v = i.variant_id ? p?.variants?.find(x => x.variant_id === i.variant_id) : null;
    const gone = !p || p.status === 'sold_out' || (i.variant_id && (!v || v.status === 'sold_out'));
    if (gone) notices.push(`${i.name}${i.variant_label ? ' (' + i.variant_label + ')' : ''} dihapus karena sudah tidak tersedia.`);
    return !gone;
  });
  items.forEach(i => {
    const p = products.find(x => x.product_id === i.product_id);
    const v = i.variant_id ? p.variants.find(x => x.variant_id === i.variant_id) : null;
    const price = p.base_price + (v?.price_adjustment || 0);
    if (price !== i.unit_price) {
      notices.push(`Harga ${i.name} berubah menjadi ${rupiah(price)}.`);
      i.unit_price = price;
    }
    i.name = p.name;
    i.image = p.image_main || i.image;
  });
  commit();
  return notices;
}
