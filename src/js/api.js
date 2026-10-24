// Komunikasi dengan Supabase (REST API, tanpa library).
import { CONFIG } from './config.js';

async function request(path, fallbackPath = null) {
  if (CONFIG.SUPABASE_URL.includes('YOUR-PROJECT')) throw new Error('CONFIG');

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
    const text = await res.text();
    if (!res.ok) {
      const body = text || `HTTP ${res.status}`;
      const canFallback = fallbackPath && /PGRST200|Could not find a relationship|relationship.*schema/.test(body);
      if (canFallback) return request(fallbackPath);
      throw new Error(body);
    }
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timer);
  }
}

export const fetchProducts = () => request(
  'products?select=product_id,name,slug,base_price,compare_price,image_main,status,is_featured,created_at,category_id,images:product_images(url,sort_order)'
  + '&deleted_at=is.null&status=neq.hidden&order=created_at.desc',
  'products?select=product_id,name,slug,base_price,compare_price,image_main,status,is_featured,created_at,category_id'
  + '&deleted_at=is.null&status=neq.hidden&order=created_at.desc'
);

export const fetchCategories = () => request(
  'categories?select=category_id,name,slug&deleted_at=is.null&order=sort_order.asc'
);

// Detail satu produk: foto tambahan + varian.
export async function fetchProductDetail(id) {
  const rows = await request(
    'products?select=*,images:product_images(url,sort_order),'
    + 'variants:product_variants(variant_id,label,price_adjustment,status)'
    + `&product_id=eq.${encodeURIComponent(id)}&deleted_at=is.null&limit=1`,
    'products?select=*'
    + `&product_id=eq.${encodeURIComponent(id)}&deleted_at=is.null&limit=1`
  );
  return rows[0] || null;
}
