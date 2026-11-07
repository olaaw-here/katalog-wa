import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRupiah, slugify, uniqueSlug, validateProduct, validateCategory, storagePath } from '../src/admin/js/validate.js';
import { fitSize, validateFile, IMAGE_RULES } from '../src/admin/js/images.js';

const CATS = ['c1', 'c2'];
const okProduct = { name: 'Keripik Pisang', category_id: 'c1', base_price: 'Rp 15.000', compare_price: '', status: 'active', description: '' };

test('parseRupiah membaca angka dari teks berformat', () => {
  assert.equal(parseRupiah('Rp 15.000'), 15000);
  assert.equal(parseRupiah('1.250.000'), 1250000);
  assert.equal(parseRupiah(''), null);
  assert.equal(parseRupiah('abc'), null);
});

test('slugify menghapus aksen dan simbol, uniqueSlug menambah akhiran', () => {
  assert.equal(slugify('  Kopi Susu Gula Aren!! '), 'kopi-susu-gula-aren');
  assert.equal(slugify('Crème Brûlée'), 'creme-brulee');
  assert.equal(slugify('###'), 'item');
  assert.equal(uniqueSlug('teh', ['teh', 'teh-2']), 'teh-3');
  assert.equal(uniqueSlug('teh', []), 'teh');
});

test('validateProduct: data benar lolos dan dinormalkan', () => {
  const r = validateProduct({ ...okProduct, name: '  Keripik   Pisang ', compare_price: '20.000', description: ' enak ', is_featured: 1 }, { categoryIds: CATS });
  assert.equal(r.ok, true);
  assert.deepEqual(r.values, { name: 'Keripik Pisang', category_id: 'c1', base_price: 15000, compare_price: 20000, status: 'active', is_featured: true, description: 'enak' });
});

test('validateProduct: menolak nama, kategori, harga, status, dan foto yang salah', () => {
  const bad = (patch, opts = {}) => validateProduct({ ...okProduct, ...patch }, { categoryIds: CATS, ...opts }).errors;
  assert.ok(bad({ name: 'ab' }).name);
  assert.ok(bad({ name: 'x'.repeat(121) }).name);
  assert.ok(bad({ category_id: '' }).category_id);
  assert.ok(bad({ category_id: 'zzz' }).category_id);
  assert.match(validateProduct(okProduct, { categoryIds: [] }).errors.category_id, /Buat kategori/);
  assert.ok(bad({ base_price: '' }).base_price);
  assert.ok(bad({ base_price: '0' }).base_price);
  assert.ok(bad({ base_price: '9.999.999.999' }).base_price);
  assert.ok(bad({ compare_price: '15.000' }).compare_price);   // sama dengan harga jual
  assert.ok(bad({ compare_price: '10.000' }).compare_price);   // lebih kecil
  assert.equal(bad({ compare_price: '15.001' }).compare_price, undefined);
  assert.ok(bad({ status: 'available' }).status);
  assert.ok(bad({ description: 'x'.repeat(1001) }).description);
  assert.ok(bad({}, { photoCount: 6 }).photos);
  assert.equal(bad({}, { photoCount: 5 }).photos, undefined);
});

test('validateCategory: panjang dan duplikat tanpa peduli huruf besar/kecil', () => {
  assert.ok(validateCategory({ name: 'a' }).errors.name);
  assert.ok(validateCategory({ name: 'x'.repeat(41) }).errors.name);
  assert.ok(validateCategory({ name: ' fashion ' }, { existingNames: ['Fashion'] }).errors.name);
  const ok = validateCategory({ name: '  Rumah   Tangga ' }, { existingNames: ['Fashion'] });
  assert.equal(ok.ok, true);
  assert.equal(ok.values.name, 'Rumah Tangga');
});

test('storagePath hanya mengenali URL milik bucket produk', () => {
  const url = 'https://x.supabase.co/storage/v1/object/public/product-images/products/abc/f%201.webp?t=1';
  assert.equal(storagePath(url), 'products/abc/f 1.webp');
  assert.equal(storagePath('https://images.unsplash.com/photo-1?w=900'), null);
  assert.equal(storagePath(null), null);
});

test('fitSize mengecilkan sisi terpanjang dan tidak membesarkan', () => {
  assert.deepEqual(fitSize(3000, 2000, 1200), { width: 1200, height: 800 });
  assert.deepEqual(fitSize(2000, 3000, 1200), { width: 800, height: 1200 });
  assert.deepEqual(fitSize(800, 600, 1200), { width: 800, height: 600 });
});

test('validateFile: format, ukuran, dan file kosong', () => {
  const f = (type, size, name = 'a.jpg') => ({ type, size, name });
  assert.equal(validateFile(f('image/jpeg', 1000)), '');
  assert.equal(validateFile(f('image/png', 1000, 'a.png')), '');
  assert.equal(validateFile(f('image/webp', 1000, 'a.webp')), '');
  assert.equal(validateFile(f('', 1000, 'foto.JPG')), '');                     // tipe kosong, ekstensi sah
  assert.match(validateFile(f('image/gif', 1000, 'a.gif')), /Format/);
  assert.match(validateFile(f('application/pdf', 1000, 'a.pdf')), /Format/);
  assert.match(validateFile(f('text/plain', 1000, 'a.jpg')), /Format/);          // menyamar .jpg tapi tipenya teks
  assert.match(validateFile(f('image/jpeg', 0)), /kosong/);
  assert.match(validateFile(f('image/jpeg', IMAGE_RULES.maxSourceBytes + 1)), /maksimal 10 MB/);
});
