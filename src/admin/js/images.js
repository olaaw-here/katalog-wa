// Validasi file gambar dan resize ke WebP di sisi klien.
export const IMAGE_RULES = {
  types: ['image/jpeg', 'image/png', 'image/webp'],
  maxSourceBytes: 10 * 1024 * 1024, // file asli maksimal 10 MB
  maxSide: 1200,                    // sisi terpanjang hasil resize
  minSide: 200,                     // gambar lebih kecil dari ini ditolak
  targetBytes: 300 * 1024           // target ukuran hasil
};

export function fitSize(w, h, max) {
  const scale = Math.min(1, max / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

// Mengembalikan pesan error, atau '' kalau file layak diproses.
export function validateFile(file) {
  const byType = IMAGE_RULES.types.includes(file.type);
  const byExt = !file.type && /\.(jpe?g|png|webp)$/i.test(file.name || '');
  if (!byType && !byExt) return 'Format tidak didukung. Gunakan JPG, PNG, atau WebP.';
  if (!file.size) return 'File kosong.';
  if (file.size > IMAGE_RULES.maxSourceBytes) return `Ukuran file maksimal ${IMAGE_RULES.maxSourceBytes / 1024 / 1024} MB.`;
  return '';
}

const toBlob = (canvas, quality) => new Promise(res => canvas.toBlob(res, 'image/webp', quality));

// Decode (sekaligus membuktikan file benar-benar gambar), putar sesuai EXIF, kecilkan, simpan sebagai WebP.
export async function toWebp(file) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch { throw new Error('File bukan gambar yang valid atau rusak.'); }
  try {
    if (Math.min(bmp.width, bmp.height) < IMAGE_RULES.minSide) {
      throw new Error(`Gambar terlalu kecil (minimal ${IMAGE_RULES.minSide} x ${IMAGE_RULES.minSide} px).`);
    }
    let side = IMAGE_RULES.maxSide, blob, width, height;
    for (let pass = 0; pass < 3; pass++) {
      ({ width, height } = fitSize(bmp.width, bmp.height, side));
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(bmp, 0, 0, width, height);
      for (let q = 0.85; q >= 0.5; q -= 0.1) {
        blob = await toBlob(canvas, q);
        if (!blob) throw new Error('Browser gagal membuat gambar.');
        if (blob.size <= IMAGE_RULES.targetBytes) break;
      }
      if (blob.type !== 'image/webp') throw new Error('Browser ini tidak mendukung WebP.');
      if (blob.size <= IMAGE_RULES.targetBytes) break;
      side = Math.round(side * 0.8); // masih terlalu besar: kecilkan dimensi lalu ulangi
    }
    return { blob, width, height };
  } finally { bmp.close?.(); }
}
