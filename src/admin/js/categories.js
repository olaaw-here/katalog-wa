// CRUD kategori: tambah, ubah, atur urutan tampil, hapus (ditolak jika masih ada produk).
import { initAdminPage } from './shell.js';
import { supabase } from '../../js/supabase.js';
import { esc } from '../../js/utils.js';
import { toast, confirmDialog, alertDialog } from './dialogs.js';
import { slugify, uniqueSlug, validateCategory } from './validate.js';

await initAdminPage({ page: 'categories.html', title: 'Kategori' });

const $ = id => document.getElementById(id);
const list = $('catList'), dlg = $('catDialog'), form = $('catForm'), nameInput = $('catName'), nameErr = $('catNameErr');
let cats = [], counts = {}, editing = null, busy = false;

async function load() {
  list.setAttribute('aria-busy', 'true');
  const [c, p] = await Promise.all([
    supabase.from('categories').select('category_id,name,slug,sort_order').is('deleted_at', null).order('sort_order').order('created_at'),
    supabase.from('products').select('category_id').is('deleted_at', null)
  ]);
  list.setAttribute('aria-busy', 'false');
  if (c.error || p.error) {
    $('catError').textContent = 'Kategori gagal dimuat. Pastikan migrasi admin_crud.sql sudah dijalankan, lalu muat ulang halaman.';
    $('catError').hidden = false;
    return;
  }
  $('catError').hidden = true;
  cats = c.data;
  counts = {};
  p.data.forEach(r => { if (r.category_id) counts[r.category_id] = (counts[r.category_id] || 0) + 1; });
  render();
}

function render() {
  if (!cats.length) {
    list.innerHTML = '<li class="ad-empty">Belum ada kategori. Tambahkan yang pertama dengan tombol di atas.</li>';
    return;
  }
  list.innerHTML = cats.map((c, i) => {
    const n = counts[c.category_id] || 0;
    return `<li class="ad-row" data-id="${esc(c.category_id)}">
      <span class="ad-num" aria-hidden="true">${i + 1}</span>
      <div class="ad-row-main"><strong>${esc(c.name)}</strong><small>/${esc(c.slug)} &middot; ${n} produk</small></div>
      <div class="ad-row-actions">
        <button type="button" class="ad-icon" data-act="up" aria-label="Naikkan ${esc(c.name)}" ${i === 0 ? 'disabled' : ''}>&uarr;</button>
        <button type="button" class="ad-icon" data-act="down" aria-label="Turunkan ${esc(c.name)}" ${i === cats.length - 1 ? 'disabled' : ''}>&darr;</button>
        <button type="button" class="ad-btn" data-act="edit">Ubah</button>
        <button type="button" class="ad-btn danger-ghost" data-act="del">Hapus</button>
      </div></li>`;
  }).join('');
}

/* ----- Tambah / ubah ----- */
function openForm(cat = null) {
  editing = cat;
  $('catDlgTitle').textContent = cat ? 'Ubah kategori' : 'Tambah kategori';
  nameInput.value = cat ? cat.name : '';
  nameErr.hidden = true;
  nameInput.removeAttribute('aria-invalid');
  dlg.showModal();
  nameInput.focus();
}

async function insertCategory(name) {
  const base = slugify(name);
  const { data: rows } = await supabase.from('categories').select('slug').like('slug', base + '%');
  const slug = uniqueSlug(base, (rows || []).map(r => r.slug));
  const sort_order = cats.length ? Math.max(...cats.map(c => c.sort_order)) + 1 : 0;
  return supabase.from('categories').insert({ name, slug, sort_order });
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (busy) return;
  const { ok, errors, values } = validateCategory({ name: nameInput.value }, {
    existingNames: cats.filter(c => c.category_id !== editing?.category_id).map(c => c.name)
  });
  nameErr.textContent = errors.name || '';
  nameErr.hidden = ok;
  nameInput.setAttribute('aria-invalid', String(!ok));
  if (!ok) { nameInput.focus(); return; }

  busy = true;
  $('catSave').disabled = true;
  const { error } = editing
    ? await supabase.from('categories').update({ name: values.name }).eq('category_id', editing.category_id)
    : await insertCategory(values.name);
  busy = false;
  $('catSave').disabled = false;
  if (error) { toast('Gagal menyimpan kategori. Coba lagi.', 'err'); return; }
  dlg.close();
  toast(editing ? 'Kategori diperbarui' : 'Kategori ditambahkan');
  await load();
});
dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-cancel]')) dlg.close(); });
$('addCat').addEventListener('click', () => openForm());

/* ----- Urutan ----- */
async function move(id, dir) {
  const i = cats.findIndex(c => c.category_id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= cats.length) return;
  const next = [...cats];
  [next[i], next[j]] = [next[j], next[i]];
  // Tulis ulang sort_order = posisi, hanya untuk baris yang berubah.
  const changes = next.map((c, idx) => ({ c, idx })).filter(({ c, idx }) => c.sort_order !== idx);
  const results = await Promise.all(changes.map(({ c, idx }) =>
    supabase.from('categories').update({ sort_order: idx }).eq('category_id', c.category_id)));
  if (results.some(r => r.error)) toast('Gagal mengubah urutan. Coba lagi.', 'err');
  await load();
}

/* ----- Hapus (soft delete) ----- */
const blocked = (name, n) => alertDialog({
  title: 'Kategori tidak bisa dihapus',
  message: `Kategori "${name}" masih punya ${n} produk. Pindahkan produknya ke kategori lain atau arsipkan dulu.`
});

async function remove(cat) {
  const n = counts[cat.category_id] || 0;
  if (n > 0) return blocked(cat.name, n);
  const yes = await confirmDialog({
    title: 'Hapus kategori?', message: `Kategori "${cat.name}" akan dihapus dari katalog.`, confirmText: 'Hapus', danger: true
  });
  if (!yes) return;
  const { error } = await supabase.from('categories').update({ deleted_at: new Date().toISOString() }).eq('category_id', cat.category_id);
  if (error) {
    if (/CATEGORY_HAS_PRODUCTS/.test(error.message)) { await load(); return blocked(cat.name, counts[cat.category_id] || 1); }
    return toast('Gagal menghapus kategori. Coba lagi.', 'err');
  }
  toast('Kategori dihapus');
  await load();
}

list.addEventListener('click', async e => {
  const btn = e.target.closest('[data-act]');
  if (!btn || busy) return;
  const cat = cats.find(c => c.category_id === btn.closest('.ad-row').dataset.id);
  if (!cat) return;
  btn.disabled = true;
  try {
    if (btn.dataset.act === 'up') await move(cat.category_id, -1);
    else if (btn.dataset.act === 'down') await move(cat.category_id, 1);
    else if (btn.dataset.act === 'edit') openForm(cat);
    else if (btn.dataset.act === 'del') await remove(cat);
  } finally { btn.disabled = false; }
});

await load();
