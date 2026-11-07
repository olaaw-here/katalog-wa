// Komunikasi dengan Supabase (REST API, tanpa library).
import { CONFIG } from './config.js';

const DEMO_CATEGORIES = [
  { category_id: 'cat-elektronik', name: 'Elektronik', slug: 'elektronik', sort_order: 1 },
  { category_id: 'cat-rumah-tangga', name: 'Rumah Tangga', slug: 'rumah-tangga', sort_order: 2 },
  { category_id: 'cat-fashion', name: 'Fashion', slug: 'fashion', sort_order: 3 }
];

const DEMO_PRODUCTS = [
  {
    product_id: 'prod-headphone',
    category_id: 'cat-elektronik',
    name: 'Headphone Wireless',
    slug: 'headphone-wireless',
    base_price: 450000,
    compare_price: 520000,
    image_main: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80',
    status: 'active',
    is_featured: true,
    created_at: '2026-11-01T09:00:00.000Z',
    variants: [
      { variant_id: 'var-headphone-black', label: 'Hitam', price_adjustment: 0, status: 'active' },
      { variant_id: 'var-headphone-white', label: 'Putih', price_adjustment: 50000, status: 'active' }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80', sort_order: 0 },
      { url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80', sort_order: 1 },
      { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80', sort_order: 2 }
    ]
  },
  {
    product_id: 'prod-smartwatch',
    category_id: 'cat-elektronik',
    name: 'Smartwatch Pro',
    slug: 'smartwatch-pro',
    base_price: 890000,
    compare_price: 1200000,
    image_main: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
    status: 'active',
    is_featured: true,
    created_at: '2026-11-02T09:00:00.000Z',
    variants: [
      { variant_id: 'var-smartwatch-42', label: '42mm', price_adjustment: 0, status: 'active' },
      { variant_id: 'var-smartwatch-46', label: '46mm', price_adjustment: 150000, status: 'sold_out' }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80', sort_order: 0 },
      { url: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=900&q=80', sort_order: 1 },
      { url: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=80', sort_order: 2 }
    ]
  },
  {
    product_id: 'prod-teko',
    category_id: 'cat-rumah-tangga',
    name: 'Teko Stainless',
    slug: 'teko-stainless',
    base_price: 180000,
    compare_price: 220000,
    image_main: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80',
    status: 'active',
    is_featured: false,
    created_at: '2026-11-03T09:00:00.000Z',
    variants: [
      { variant_id: 'var-teko-1l', label: '1 Liter', price_adjustment: 0, status: 'active' }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80', sort_order: 0 },
      { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80', sort_order: 1 }
    ]
  },
  {
    product_id: 'prod-tas',
    category_id: 'cat-fashion',
    name: 'Tas Kanvas',
    slug: 'tas-kanvas',
    base_price: 240000,
    compare_price: 320000,
    image_main: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
    status: 'sold_out',
    is_featured: false,
    created_at: '2026-11-04T09:00:00.000Z',
    variants: [
      { variant_id: 'var-tas-default', label: 'Default', price_adjustment: 0, status: 'sold_out' }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80', sort_order: 0 },
      { url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80', sort_order: 1 }
    ]
  }
];

const DEMO_STORE_CONFIG = {
  store_name: CONFIG.STORE_NAME,
  whatsapp_number: CONFIG.WA_NUMBER,
  description: CONFIG.ABOUT.description,
  address: CONFIG.ABOUT.address,
  open_hours: CONFIG.ABOUT.open_hours,
  instagram: CONFIG.ABOUT.instagram,
  tiktok: CONFIG.ABOUT.tiktok,
  facebook: CONFIG.ABOUT.facebook,
  maps_url: CONFIG.ABOUT.maps_url
};

const DEMO_PRODUCTS_BY_ID = new Map(DEMO_PRODUCTS.map(p => [p.product_id, p]));

function isMissingRelationshipError(err) {
  if (!err) return false;
  const details = `${err.code || ''} ${err.details || ''} ${err.message || ''}`;
  return /PGRST200|Could not find a relationship|Searched for a foreign key relationship/i.test(details);
}

function shouldUseDemoFallback(err) {
  if (!err) return true;
  if (err.message === 'CONFIG') return true;
  if (err.name === 'AbortError') return true;
  const msg = String(err.message || '');
  return /ERR_NAME_NOT_RESOLVED|Failed to fetch|NetworkError|fetch\s+failed|Failed to load resource/i.test(msg);
}

async function request(path) {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) throw new Error('CONFIG');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CONFIG.TIMEOUT_MS);
  try {
    const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey: CONFIG.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
      },
      signal: ctrl.signal
    });

    const bodyText = await res.text();
    let payload;

    if (bodyText) {
      try {
        payload = JSON.parse(bodyText);
      } catch {
        payload = bodyText;
      }
    }

    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.code = payload && typeof payload === 'object' && 'code' in payload ? payload.code : undefined;
      err.details = payload && typeof payload === 'object' && 'details' in payload ? payload.details : undefined;
      throw err;
    }

    return payload ?? [];
  } finally {
    clearTimeout(timer);
  }
}

async function retryWithoutRelationship(path, fallbackPath) {
  try {
    return await request(path);
  } catch (err) {
    if (!isMissingRelationshipError(err)) throw err;
    return request(fallbackPath);
  }
}

export const fetchProducts = async () => {
  const primary = 'products?select=product_id,name,slug,base_price,compare_price,image_main,status,is_featured,created_at,category_id,'
    + 'images:product_images(url,sort_order),variants:product_variants(variant_id,label,price_adjustment,status)'
    + '&deleted_at=is.null&status=neq.hidden&order=created_at.desc';
  const fallback = 'products?select=product_id,name,slug,base_price,compare_price,image_main,status,is_featured,created_at,category_id'
    + '&deleted_at=is.null&status=neq.hidden&order=created_at.desc';

  try {
    return await retryWithoutRelationship(primary, fallback);
  } catch (err) {
    if (!shouldUseDemoFallback(err)) throw err;
    return DEMO_PRODUCTS;
  }
};

export const fetchCategories = async () => {
  try {
    return await request('categories?select=category_id,name,slug&deleted_at=is.null&order=sort_order.asc');
  } catch (err) {
    if (!shouldUseDemoFallback(err)) throw err;
    return DEMO_CATEGORIES;
  }
};

// Detail satu produk: foto tambahan + varian.
export async function fetchProductDetail(id) {
  const primary = 'products?select=*,images:product_images(url,sort_order),'
    + 'variants:product_variants(variant_id,label,price_adjustment,status)'
    + `&product_id=eq.${encodeURIComponent(id)}&deleted_at=is.null&limit=1`;
  const fallback = `products?select=*&product_id=eq.${encodeURIComponent(id)}&deleted_at=is.null&limit=1`;

  try {
    const rows = await retryWithoutRelationship(primary, fallback);
    return rows[0] || DEMO_PRODUCTS_BY_ID.get(id) || null;
  } catch (err) {
    if (!shouldUseDemoFallback(err)) throw err;
    return DEMO_PRODUCTS_BY_ID.get(id) || null;
  }
}

// Profil toko (satu baris) yang diatur penjual dari panel admin.
export async function fetchStoreConfig() {
  try {
    const rows = await request('store_config?select=store_name,whatsapp_number,description,address,open_hours,instagram,tiktok,facebook,maps_url&limit=1');
    return rows[0] || DEMO_STORE_CONFIG;
  } catch (err) {
    if (!shouldUseDemoFallback(err)) throw err;
    return DEMO_STORE_CONFIG;
  }
}
