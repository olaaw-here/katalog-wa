// Klien Supabase untuk panel admin (dimuat hanya di halaman admin, tidak di katalog pembeli).
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config.js';

export const BUCKET = 'product-images';

// "Ingat saya": sesi disimpan di localStorage; kalau tidak, di sessionStorage (hilang saat tab ditutup).
const REMEMBER_KEY = 'admin_remember';
const remembered = () => { try { return localStorage.getItem(REMEMBER_KEY) === '1'; } catch { return false; } };
export function setRemember(on) {
  try { on ? localStorage.setItem(REMEMBER_KEY, '1') : localStorage.removeItem(REMEMBER_KEY); } catch { /* abaikan */ }
}

const storage = {
  getItem: k => { try { return localStorage.getItem(k) ?? sessionStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => {
    try {
      const [keep, drop] = remembered() ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
      keep.setItem(k, v); drop.removeItem(k);
    } catch { /* abaikan */ }
  },
  removeItem: k => { for (const s of [localStorage, sessionStorage]) { try { s.removeItem(k); } catch { /* abaikan */ } } }
};

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storage }
});
