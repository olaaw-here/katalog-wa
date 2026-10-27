// Komunikasi dengan Supabase (REST API, tanpa library).
import { CONFIG } from './config.js';

const PRODUCT_LIST_SELECT = 'product_id,name,slug,base_price,compare_price,image_main,status,is_featured,created_at,category_id';
const PRODUCT_VARIANT_SELECT = 'variants:product_variants(variant_id,label,price_adjustment,status)';
const PRODUCT_IMAGE_SELECT = 'images:product_images(url,sort_order)';
const PRODUCT_DETAIL_BASE_SELECT = '*';

function isMissingRelationError(err) {
  const text = String(err?.message || '');
  return /PGRST200|relationship.*(product_images|product_variants)|foreign key relationship|Could not find a relationship/i.test(text);
}

async function parseResponseBody(res) {
  if (typeof res.json === 'function') return res.json();
  if (typeof res.text !== 'function') return null;

  const raw = await res.text();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

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

    if (!res.ok) {
      const body = await parseResponseBody(res);
      const detail = body && typeof body === 'object' ? (body.details || body.message || body.error) : '';
      const err = new Error(detail ? `HTTP ${res.status}: ${detail}` : `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }

    return await parseResponseBody(res);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchProducts() {
  const listSelect = PRODUCT_LIST_SELECT;
  const withVariants = `${listSelect},${PRODUCT_VARIANT_SELECT}`;
  const withImages = `${withVariants},${PRODUCT_IMAGE_SELECT}`;

  try {
    return await request(
      `products?select=${withImages}&deleted_at=is.null&status=neq.hidden&order=created_at.desc`
    );
  } catch (err) {
    if (!isMissingRelationError(err)) throw err;
    return request(
      `products?select=${listSelect}&deleted_at=is.null&status=neq.hidden&order=created_at.desc`
    );
  }
}

export const fetchCategories = () => request(
  'categories?select=category_id,name,slug&deleted_at=is.null&order=sort_order.asc'
);

// Detail satu produk: foto tambahan + varian.
export async function fetchProductDetail(id) {
  const detailSelect = PRODUCT_DETAIL_BASE_SELECT;
  const withImages = `${detailSelect},${PRODUCT_IMAGE_SELECT},${PRODUCT_VARIANT_SELECT}`;

  try {
    const rows = await request(
      `products?select=${withImages}`
      + `&product_id=eq.${encodeURIComponent(id)}&deleted_at=is.null&limit=1`
    );
    return rows[0] || null;
  } catch (err) {
    if (!isMissingRelationError(err)) throw err;
    const rows = await request(
      `products?select=${detailSelect}`
      + `&product_id=eq.${encodeURIComponent(id)}&deleted_at=is.null&limit=1`
    );
    return rows[0] || null;
  }
}
