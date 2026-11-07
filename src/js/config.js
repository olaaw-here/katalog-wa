// Konfigurasi proyek. Isi dengan data Supabase kamu.
export const CONFIG = {
  SUPABASE_URL: 'https://aznndwhweuhjanjvfxdy.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_cqQ_jH48U37Ku23jiZniVQ_FmwLI65E', // kunci publik (anon), jangan pakai service_role
  STORE_NAME: 'Toko Berkah',
  WA_NUMBER: '6287888236551', // nomor WhatsApp tujuan (format internasional, tanpa tanda +)
  MAX_URL_LENGTH: 2000, // batas panjang URL WhatsApp (lebih dari ini akan ditawarkan salin manual)
  TIMEOUT_MS: 10000,
  ADMIN_IDLE_MINUTES: 30, // admin otomatis keluar setelah sekian menit tanpa aktivitas

  ABOUT: {
    description: 'Toko Berkah menjual berbagai macam produk berkualitas dengan harga terjangkau. Kami berkomitmen untuk memberikan pelayanan terbaik kepada pelanggan kami.',
    address: 'Jl. Contoh Alamat No. 123, Kota Contoh, Provinsi Contoh',
    open_hours: 'Senin - Jumat: 08.00 - 17.00\nSabtu: 09.00 - 14.00\nMinggu: Tutup',
    instagram: 'tokoberkah',
    tiktok: 'tokoberkah',
    maps_url: 'https://goo.gl/maps/abcd1234efgh5678', // opsional: link Google Maps
    facebook: 'tokoberkah'
  }
};