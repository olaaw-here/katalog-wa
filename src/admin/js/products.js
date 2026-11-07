// Daftar produk: cari, filter, ubah status cepat, arsipkan (soft delete), pulihkan.
import { initAdminPage } from './shell.js';
import { supabase } from '../../js/supabase.js';
import { esc, rupiah, PLACEHOLDER } from '../../js/utils.js';
import { toast, confirmDialog } from './dialogs.js';
import { STATUSES } from './validate.js';

await initAdminPage({ page: 'products.html', title: 'Produk' });

const $ = id => document.getElementById(id);
const list = $('prodList');
const state = { products: [], cats: {}, q: '', cat: 'all', status: 'all', view: 'active' };

const flash = sessionStorage.getItem('admin_flash');
if (flash) { sessionStorage.removeItem('admin_flash'); toast(flash); }

async function load() {
  list.setAttribute('aria-busy', 'true');
  list.innerHTML = Array.from({ length: 4 }, () => '<li class="ad-row sk" aria-hidden="true"><div class="line m"></div></li>').join('');
  let q = supabase.from('products')
    .select('product_id,name,slug,base_price,compare_price,image_main,status,is_featured,category_id,created_at')
    .order('created_at', { ascending: false });
  q = state.view === 'active' ? q.is('deleted_at', null) : q.not('deleted_at', 'is', null);
  const [p, c] = await Promise.all([q, supabase.from('categories').select('category_id,name,deleted_at').order('sort_order')]);
  list.setAttribute('aria-busy', 'false');
  if (p.error || c.error) {
    list.innerHTML = '<li class="ad-empty">Produk gagal dimuat. <button type="button" class="ad-btn" id="retry">Coba lagi</button></li>';
    $('retry').addEventListener('click', load);
    return;
  }
  state.products = p.data;
  state.cats = Object.fromEntries(c.data.map(x => [x.category_id, x]));
  const opts = c.data.filter(x => !x.deleted_at).map(x => `<option value="${esc(x.category_id)}">${esc(x.name)}</option>`).join('');
  $('fCat').innerHTML = `<option value="all">Semua kategori</option>${opts}`;
  $('fCat').value = state.cat in state.cats || state.cat === 'all' ? state.cat : 'all';
  render();
}

function visible() {
  const q = state.q.trim().toLowerCase();
  return state.products.filter(p =>
    (!q || p.name.toLowerCase().includes(q)) &&
    (state.cat === 'all' || p.category_id === state.cat) &&
    (state.status === 'all' || p.status === state.status));
}

function render() {
  const rows = visible();
  $('count').textContent = `${rows.length} produk`;
  if (!rows.length) {
    list.innerHTML = `<li class="ad-empty">${state.products.length ? 'Tidak ada produk yang cocok dengan filter.'
      : state.view === 'active' ? 'Belum ada produk. Tambahkan produk pertamamu.' : 'Arsip kosong.'}</li>`;
    return;
  }
  const archived = state.view === 'archive';
  list.innerHTML = rows.map(p => {
    const promo = p.compare_price && p.compare_price > p.base_price;
    const cat = state.cats[p.category_id];
    return `<li class="ad-row ad-prod" data-id="${esc(p.product_id)}">
      <img class="ad-thumb" src="${esc(p.image_main || PLACEHOLDER)}" alt="" width="56" height="56" loading="lazy">
      <div class="ad-row-main">
        <strong>${esc(p.name)}${p.is_featured ? ' <span class="ad-tag">Unggulan</span>' : ''}</strong>
        <small>${cat ? esc(cat.name) + (cat.deleted_at ? ' (dihapus)' : '') : 'Tanpa kategori'} &middot;
          ${rupiah(p.base_price)}${promo ? ` <s>${rupiah(p.compare_price)}</s>` : ''}</small>
      </div>
      <div class="ad-row-actions">
        ${archived
          ? '<button type="button" class="ad-btn" data-act="restore">Pulihkan</button>'
          : `<label class="sr" for="st-${esc(p.product_id)}">Status ${esc(p.name)}</label>
             <select class="ad-select st-${esc(p.status)}" id="st-${esc(p.product_id)}" data-act="status">
               ${Object.entries(STATUSES).map(([v, l]) => `<option value="${v}"${v === p.status ? ' selected' : ''}>${l}</option>`).join('')}
             </select>
             <a class="ad-btn" href="product-form.html?id=${encodeURIComponent(p.product_id)}">Ubah</a>
             <button type="button" class="ad-btn danger-ghost" data-act="archive">Arsipkan</button>`}
      </div></li>`;
  }).join('');
}

list.addEventListener('error', e => { if (e.target.tagName === 'IMG' && e.target.src !== PLACEHOLDER) e.target.src = PLACEHOLDER; }, true);

async function setDeleted(p, at) {
  const { error } = await supabase.from('products').update({ deleted_at: at }).eq('product_id', p.product_id);
  if (error) return toast('Gagal mengubah produk. Coba lagi.', 'err');
  toast(at ? 'Produk diarsipkan' : 'Produk dipulihkan');
  await load();
}

list.addEventListener('change', async e => {
  const sel = e.target.closest('[data-act="status"]');
  if (!sel) return;
  const p = state.products.find(x => x.product_id === sel.closest('.ad-row').dataset.id);
  const prev = p.status;
  sel.disabled = true;
  const { error } = await supabase.from('products').update({ status: sel.value }).eq('product_id', p.product_id);
  sel.disabled = false;
  if (error) { sel.value = prev; return toast('Gagal mengubah status. Coba lagi.', 'err'); }
  p.status = sel.value;
  sel.className = `ad-select st-${p.status}`;
  toast(`Status "${p.name}": ${STATUSES[p.status]}`);
  if (state.status !== 'all') render();
});

list.addEventListener('click', async e => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const p = state.products.find(x => x.product_id === btn.closest('.ad-row').dataset.id);
  if (btn.dataset.act === 'archive') {
    const yes = await confirmDialog({
      title: 'Arsipkan produk?', confirmText: 'Arsipkan', danger: true,
      message: `"${p.name}" akan hilang dari katalog. Produk tidak dihapus permanen dan bisa dipulihkan dari tab Arsip.`
    });
    if (yes) await setDeleted(p, new Date().toISOString());
  } else if (btn.dataset.act === 'restore') await setDeleted(p, null);
});

let t;
$('fQ').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value; render(); }, 150); });
$('fCat').addEventListener('change', e => { state.cat = e.target.value; render(); });
$('fStatus').addEventListener('change', e => { state.status = e.target.value; render(); });
$('fView').addEventListener('change', e => { state.view = e.target.value; load(); });

await load();
