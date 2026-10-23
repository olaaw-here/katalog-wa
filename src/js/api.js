// Komunikasi dengan Supabase (REST API, tanpa library).
import { CONFIG } from './config.js';

async function request(path) {
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
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export const fetchProducts = () => request(
  'products?select=product_id,name,slug,base_price,compare_price,image_main,status,is_featured,created_at,category_id'
  + '&deleted_at=is.null&status=neq.hidden&order=created_at.desc'
);

export const fetchCategories = () => request(
  'categories?select=category_id,name,slug&deleted_at=is.null&order=sort_order.asc'
);