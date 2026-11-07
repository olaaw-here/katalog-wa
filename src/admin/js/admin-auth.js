import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../../js/config.js';

export function isAdminProtectedPath(pathname = '') {
  const normalized = (pathname || '').toLowerCase();
  return normalized.includes('/admin') || normalized.includes('/src/admin');
}

export function getAdminRedirectTarget(currentPath = '/src/admin/products.html', isSignedIn = false) {
  if (isSignedIn) {
    return currentPath || '/src/admin/products.html';
  }

  return '/src/admin/index.html';
}

export function createSupabaseAdminClient() {
  return createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

export function getLoginRoute() {
  return '/src/admin/index.html';
}
