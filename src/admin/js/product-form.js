// Form tambah/ubah produk + manajer foto (validasi, resize WebP di klien, unggah ke Storage, foto utama, urutan).
import { initAdminPage } from './shell.js';
import { supabase, BUCKET } from '../../js/supabase.js';
import { esc, rupiah, PLACEHOLDER } from '../../js/utils.js';
import { toast } from './dialogs.js';
import { STATUSES, LIMITS, parseRupiah, slugify, uniqueSlug, validateProduct, storagePath } from './validate.js';
import { validateFile, toWebp } from './images.js';

const session = await initAdminPage({ page: 'products.html', title: 'Produk' });

const $ = id => document.getElementById(id);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const rawId = new URLSearchParams(location.search).get('id');
const state = { id: null, persisted: false, categories: [], photos: [], removed: [], dirty: false, saving: false };
const ERR = { name: 'eName', category_id: 'eCat', base_price: 'eBase', compare_price: 'eCompare', description: 'eDesc', photos: 'ePhotos' };
const INPUT = { name: 'fName', category_id: 'fCat', base_price: 'fBase', compare_price: 'fCompare', description: 'fDesc' };

/* ---------- Muat data ---------- */
async function init() {
  $('fStatus').innerHTML = Object.entries(STATUSES).map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  const cats = await supabase.from('categories').select('category_id,name').is('deleted_at', null).order('sort_order');
  if (cats.error) return fatal('Kategori gagal dimuat. Pastikan migrasi admin_crud.sql sudah dijalankan.');
  state.categories = cats.data;
  $('fCat').innerHTML = `<option value="">Pilih kategori</option>` + cats.data.map(c => `<option value="${esc(c.category_id)}">${esc(c.name)}</option>`).join('');

  if (rawId) {
    if (!UUID.test(rawId)) return fatal('Produk tidak ditemukan.');
    const { data, error } = await supabase.from('products')
      .select('*,images:product_images(image_id,url,sort_order)').eq('product_id', rawId).is('deleted_at', null);
    if (error) return fatal('Produk gagal dimuat. Coba muat ulang halaman.');
    if (!data.length) return fatal('Produk tidak ditemukan atau sudah diarsipkan.');
    const p = data[0];
    state.id = p.product_id; state.persisted = true;
    $('pfTitle').textContent = 'Ubah produk';
    $('fName').value = p.name;
    $('fCat').value = p.category_id || '';
    $('fStatus').value = p.status;
    $('fBase').value = new Intl.NumberFormat('id-ID').format(p.base_price);
    $('fCompare').value = p.compare_price ? new Intl.NumberFormat('id-ID').format(p.compare_price) : '';
    $('fDesc').value = p.description || '';
    $('fFeat').checked = p.is_featured;
    state.photos = (p.images || []).slice().sort((a, b) => a.sort_order - b.sort_order)
      .map(i => ({ key: i.image_id, kind: 'existing', image_id: i.image_id, url: i.url, sort_order: i.sort_order }));
  } else {
    $('pfTitle').textContent = 'Tambah produk';
    $('fStatus').value = 'active';
  }
  hints(); renderPhotos();
  $('pf').hidden = false;
}

function fatal(msg) {
  $('pfError').textContent = msg; $('pfError').hidden = false; $('pf').hidden = true;
}

/* ---------- Form ---------- */
function hints() {
  const b = parseRupiah($('fBase').value), c = parseRupiah($('fCompare').value);
  $('hBase').textContent = b ? rupiah(b) : '';
  $('hCompare').textContent = c ? rupiah(c) : '';
  $('hDesc').textContent = `${$('fDesc').value.length}/${LIMITS.descMax}`;
}

function showErrors(errors) {
  for (const [field, id] of Object.entries(ERR)) {
    const el = $(id), msg = errors[field] || '';
    el.textContent = msg; el.hidden = !msg;
    const input = $(INPUT[field] || '');
    if (input) input.setAttribute('aria-invalid', String(Boolean(msg)));
  }
  const first = Object.keys(errors).find(k => INPUT[k]);
  if (first) $(INPUT[first]).focus();
}

const read = () => ({
  name: $('fName').value, category_id: $('fCat').value, base_price: $('fBase').value, compare_price: $('fCompare').value,
  status: $('fStatus').value, is_featured: $('fFeat').checked, description: $('fDesc').value
});

$('pf').addEventListener('input', e => {
  state.dirty = true;
  hints();
  const field = Object.keys(INPUT).find(k => INPUT[k] === e.target.id);
  if (field) { $(ERR[field]).hidden = true; e.target.removeAttribute('aria-invalid'); }
});
for (const id of ['fBase', 'fCompare']) {
  $(id).addEventListener('blur', e => { const n = parseRupiah(e.target.value); e.target.value = n === null ? '' : new Intl.NumberFormat('id-ID').format(n); });
}
addEventListener('beforeunload', e => { if (state.dirty && !state.saving) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- Foto ---------- */
function renderPhotos() {
  const n = state.photos.length;
  $('phCount').textContent = `${n}/${LIMITS.photos}`;
  $('phDrop').hidden = n >= LIMITS.photos;
  $('phGrid').innerHTML = state.photos.map((p, i) => `
    <li class="ph" data-key="${esc(p.key)}">
      <img src="${esc(p.preview || p.url)}" alt="Foto ${i + 1}" loading="lazy">
      ${i === 0 ? '<span class="ph-main">Utama</span>' : ''}
      ${p.kind === 'new' ? `<span class="ph-new">Baru &middot; ${Math.round(p.blob.size / 1024)} KB</span>` : ''}
      <div class="ph-actions">
        <button type="button" data-ph="left" aria-label="Geser foto ${i + 1} ke kiri" ${i === 0 ? 'disabled' : ''}>&larr;</button>
        <button type="button" data-ph="right" aria-label="Geser foto ${i + 1} ke kanan" ${i === n - 1 ? 'disabled' : ''}>&rarr;</button>
        ${i > 0 ? `<button type="button" data-ph="main" aria-label="Jadikan foto ${i + 1} sebagai foto utama">Utama</button>` : ''}
        <button type="button" data-ph="del" class="danger" aria-label="Hapus foto ${i + 1}">Hapus</button>
      </div>
    </li>`).join('');
}

async function addFiles(files) {
  const msgs = [];
  for (const f of files) {
    if (state.photos.length >= LIMITS.photos) { msgs.push(`${f.name}: batas ${LIMITS.photos} foto per produk tercapai.`); continue; }
    const bad = validateFile(f);
    if (bad) { msgs.push(`${f.name}: ${bad}`); continue; }
    try {
      const { blob } = await toWebp(f);
      state.photos.push({ key: 'n' + crypto.randomUUID(), kind: 'new', blob, preview: URL.createObjectURL(blob) });
      state.dirty = true;
    } catch (err) { msgs.push(`${f.name}: ${err.message}`); }
  }
  $('phErrors').innerHTML = msgs.map(m => `<li>${esc(m)}</li>`).join('');
  $('phErrors').hidden = !msgs.length;
  renderPhotos();
}

$('phInput').addEventListener('change', async e => { const files = [...e.target.files]; e.target.value = ''; await addFiles(files); });
['dragenter', 'dragover'].forEach(ev => $('phDrop').addEventListener(ev, e => { e.preventDefault(); $('phDrop').classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => $('phDrop').addEventListener(ev, e => { e.preventDefault(); $('phDrop').classList.remove('over'); }));
$('phDrop').addEventListener('drop', e => addFiles([...e.dataTransfer.files]));

$('phGrid').addEventListener('click', e => {
  const btn = e.target.closest('[data-ph]');
  if (!btn) return;
  const key = btn.closest('.ph').dataset.key, act = btn.dataset.ph;
  const i = state.photos.findIndex(p => p.key === key);
  const arr = state.photos;
  if (btn.dataset.ph === 'left' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
  else if (btn.dataset.ph === 'right' && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
  else if (btn.dataset.ph === 'main' && i > 0) arr.unshift(arr.splice(i, 1)[0]);
  else if (btn.dataset.ph === 'del') {
    const [gone] = arr.splice(i, 1);
    if (gone.kind === 'existing') state.removed.push(gone); else URL.revokeObjectURL(gone.preview);
  }
  state.dirty = true;
  renderPhotos();
  // Pertahankan fokus keyboard setelah daftar digambar ulang.
  const li = $('phGrid').querySelector(`[data-key="${CSS.escape(key)}"]`);
  (li?.querySelector(`[data-ph="${act}"]:not(:disabled)`) || li?.querySelector('button:not(:disabled)') || $('phInput')).focus();
});

/* ---------- Simpan ---------- */
async function makeSlug(name) {
  const base = slugify(name);
  const { data } = await supabase.from('products').select('slug').like('slug', base + '%');
  return uniqueSlug(base, (data || []).map(r => r.slug));
}

async function saveProduct(values) {
  const payload = { ...values, updated_by: session.user.id };
  if (state.persisted) return supabase.from('products').update(payload).eq('product_id', state.id);
  state.id ??= crypto.randomUUID();
  let slug = await makeSlug(values.name);
  let res = await supabase.from('products').insert({ product_id: state.id, slug, ...payload });
  if (res.error?.code === '23505') { // slug bentrok (mis. dipakai produk yang diarsipkan): beri akhiran acak
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    res = await supabase.from('products').insert({ product_id: state.id, slug, ...payload });
  }
  if (!res.error) state.persisted = true;
  return res;
}

async function syncPhotos() {
  const bucket = supabase.storage.from(BUCKET);
  // 1. Hapus foto yang dibuang (baris database dulu, lalu file di Storage; foto contoh eksternal dilewati).
  if (state.removed.length) {
    const { error } = await supabase.from('product_images').delete().in('image_id', state.removed.map(r => r.image_id));
    if (error) throw error;
    const paths = state.removed.map(r => storagePath(r.url)).filter(Boolean);
    state.removed = [];
    if (paths.length) await bucket.remove(paths);
  }
  // 2. Unggah foto baru dan catat di product_images.
  for (const [idx, p] of state.photos.entries()) {
    if (p.kind !== 'new') continue;
    const path = `products/${state.id}/${crypto.randomUUID()}.webp`;
    const up = await bucket.upload(path, p.blob, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
    if (up.error) throw up.error;
    const url = bucket.getPublicUrl(path).data.publicUrl;
    const ins = await supabase.from('product_images').insert({ product_id: state.id, url, sort_order: idx }).select('image_id');
    if (ins.error) { await bucket.remove([path]); throw ins.error; }
    URL.revokeObjectURL(p.preview);
    Object.assign(p, { kind: 'existing', image_id: ins.data[0].image_id, url, sort_order: idx, preview: null, blob: null });
  }
  // 3. Urutan, lalu foto pertama menjadi foto utama (products.image_main).
  const moved = state.photos.map((p, i) => ({ p, i })).filter(({ p, i }) => p.sort_order !== i);
  const res = await Promise.all(moved.map(({ p, i }) => supabase.from('product_images').update({ sort_order: i }).eq('image_id', p.image_id)));
  const bad = res.find(r => r.error);
  if (bad) throw bad.error;
  moved.forEach(({ p, i }) => { p.sort_order = i; });
  const { error } = await supabase.from('products').update({ image_main: state.photos[0]?.url ?? null }).eq('product_id', state.id);
  if (error) throw error;
}

$('pf').addEventListener('submit', async e => {
  e.preventDefault();
  if (state.saving) return;
  const { ok, errors, values } = validateProduct(read(), { categoryIds: state.categories.map(c => c.category_id), photoCount: state.photos.length });
  showErrors(errors);
  if (!ok) { toast('Periksa kembali isian yang ditandai.', 'err'); return; }

  state.saving = true;
  $('pfSave').disabled = true; $('pfSave').textContent = 'Menyimpan...';
  $('pfError').hidden = true;
  try {
    const res = await saveProduct(values);
    if (res.error) throw res.error;
    await syncPhotos();
    state.dirty = false;
    sessionStorage.setItem('admin_flash', 'Produk disimpan');
    location.href = 'products.html';
  } catch (err) {
    $('pfError').textContent = `Gagal menyimpan (${err.message || 'kesalahan tidak dikenal'}). Isian dan foto tetap ada, tekan Simpan untuk mencoba lagi.`;
    $('pfError').hidden = false;
    $('pfError').scrollIntoView({ block: 'center' });
    state.saving = false;
    $('pfSave').disabled = false; $('pfSave').textContent = 'Simpan';
    renderPhotos();
  }
});

await init();
