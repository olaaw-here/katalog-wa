// Validasi dan fungsi bantu murni (tanpa DOM) untuk form admin. Diuji di tests/admin.test.js.
export const STATUSES = { active: 'Tersedia', sold_out: 'Habis', hidden: 'Disembunyikan' };
export const LIMITS = { nameMin: 3, nameMax: 120, catMin: 2, catMax: 40, descMax: 1000, priceMax: 1_000_000_000, photos: 5 };

const squash = s => String(s ?? '').replace(/\s+/g, ' ').trim();

// "Rp 15.000" -> 15000, kosong -> null
export function parseRupiah(v) {
  const digits = String(v ?? '').replace(/\D/g, '');
  return digits === '' ? null : Number(digits);
}

export function slugify(s) {
  return String(s ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '') || 'item';
}

export function uniqueSlug(base, taken = []) {
  const used = new Set(taken);
  let slug = base, n = 2;
  while (used.has(slug)) slug = `${base}-${n++}`;
  return slug;
}

export function validateCategory(input, { existingNames = [] } = {}) {
  const name = squash(input.name);
  const errors = {};
  if (name.length < LIMITS.catMin) errors.name = `Nama kategori minimal ${LIMITS.catMin} karakter.`;
  else if (name.length > LIMITS.catMax) errors.name = `Nama kategori maksimal ${LIMITS.catMax} karakter.`;
  else if (existingNames.some(n => n.trim().toLowerCase() === name.toLowerCase())) errors.name = 'Nama kategori sudah dipakai.';
  return { ok: !Object.keys(errors).length, errors, values: { name } };
}

export function validateProduct(input, { categoryIds = [], photoCount = 0 } = {}) {
  const errors = {};
  const name = squash(input.name);
  const description = String(input.description ?? '').trim();
  const base = parseRupiah(input.base_price);
  const compare = parseRupiah(input.compare_price);

  if (name.length < LIMITS.nameMin) errors.name = `Nama produk minimal ${LIMITS.nameMin} karakter.`;
  else if (name.length > LIMITS.nameMax) errors.name = `Nama produk maksimal ${LIMITS.nameMax} karakter.`;

  if (!categoryIds.includes(input.category_id)) errors.category_id = categoryIds.length ? 'Pilih kategori.' : 'Buat kategori dulu di menu Kategori.';

  if (base === null) errors.base_price = 'Harga jual wajib diisi.';
  else if (base < 1) errors.base_price = 'Harga jual harus lebih dari 0.';
  else if (base > LIMITS.priceMax) errors.base_price = 'Harga terlalu besar.';

  if (compare !== null && !errors.base_price && compare <= base) errors.compare_price = 'Harga coret harus lebih besar dari harga jual.';
  if (compare !== null && compare > LIMITS.priceMax) errors.compare_price = 'Harga terlalu besar.';

  if (!(input.status in STATUSES)) errors.status = 'Pilih status produk.';
  if (description.length > LIMITS.descMax) errors.description = `Deskripsi maksimal ${LIMITS.descMax} karakter.`;
  if (photoCount > LIMITS.photos) errors.photos = `Maksimal ${LIMITS.photos} foto per produk.`;

  return {
    ok: !Object.keys(errors).length, errors,
    values: {
      name, category_id: input.category_id, base_price: base, compare_price: compare,
      status: input.status, is_featured: Boolean(input.is_featured), description: description || null
    }
  };
}

// Path objek di Storage dari URL publik; null kalau bukan milik bucket kita (misalnya foto contoh dari Unsplash).
export function storagePath(url, bucket = 'product-images') {
  const marker = `/object/public/${bucket}/`;
  const i = String(url ?? '').indexOf(marker);
  return i < 0 ? null : decodeURIComponent(String(url).slice(i + marker.length).split('?')[0]);
}
