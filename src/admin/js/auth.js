// Autentikasi admin lewat Supabase Auth (supabase-js).
// CATATAN: penjaga di browser hanya mengatur tampilan. Yang benar-benar melindungi data adalah RLS di Supabase
// (hanya akun di tabel admin_users yang boleh menulis).
import { supabase, setRemember } from '../../js/supabase.js';
import { CONFIG } from '../../js/config.js';

const ACTIVITY_KEY = 'admin_last_activity';
const IDLE_MS = (CONFIG.ADMIN_IDLE_MINUTES || 30) * 60 * 1000;
const never = () => new Promise(() => {}); // menghentikan inisialisasi halaman saat dialihkan

export class AuthError extends Error {
  constructor(code) { super(code); this.code = code; }
}
export const AUTH_MESSAGES = {
  invalid: 'Email atau password salah.',
  rate: 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.',
  not_admin: 'Akun ini tidak punya akses admin.',
  network: 'Tidak bisa terhubung ke server. Periksa koneksi internetmu.',
  verify: 'Gagal memeriksa hak akses admin. Pastikan migrasi admin_crud.sql sudah dijalankan.',
  server: 'Terjadi kendala di server. Coba lagi sebentar lagi.'
};

const touch = () => { try { localStorage.setItem(ACTIVITY_KEY, String(Date.now())); } catch { /* abaikan */ } };
const lastActivity = () => { try { return Number(localStorage.getItem(ACTIVITY_KEY)) || 0; } catch { return 0; } };
const idleExpired = () => lastActivity() > 0 && Date.now() - lastActivity() > IDLE_MS;

async function roleOf(userId) {
  const { data, error } = await supabase.from('admin_users').select('role').eq('user_id', userId).limit(1);
  if (error) throw new AuthError('verify');
  return data?.[0]?.role ?? null;
}

export async function login(email, password, remember) {
  setRemember(remember);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.status === 429) throw new AuthError('rate');
    if (!error.status) throw new AuthError('network');
    throw new AuthError(error.status >= 500 ? 'server' : 'invalid');
  }
  let role;
  try { role = await roleOf(data.user.id); }
  catch (e) { await supabase.auth.signOut(); throw e; }
  if (!role) { await supabase.auth.signOut(); throw new AuthError('not_admin'); }
  touch();
  return data.session;
}

function toLogin(reason, withNext = true) {
  const q = new URLSearchParams();
  if (reason) q.set('reason', reason);
  const page = location.pathname.split('/').pop() || 'index.html';
  if (withNext && /^[a-z0-9-]+\.html$/.test(page) && page !== 'login.html') q.set('next', page);
  location.replace('login.html' + (q.toString() ? '?' + q : ''));
  return never();
}

export async function logout(reason = 'bye') {
  try { await supabase.auth.signOut(); } catch { /* sesi lokal tetap dihapus */ }
  return toLogin(reason, reason !== 'bye');
}

let watching = false;
function watch() {
  if (watching) return;
  watching = true;
  let last = 0;
  const bump = () => { const n = Date.now(); if (n - last > 5000) { last = n; touch(); } };
  ['pointerdown', 'keydown', 'scroll'].forEach(ev => addEventListener(ev, bump, { passive: true }));
  setInterval(() => { if (idleExpired()) logout('idle'); }, Math.min(30000, IDLE_MS / 2));
  // Keluar di tab lain (atau sesi dicabut) -> tab ini ikut ke halaman login.
  supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') toLogin('bye', false); });
}

// Dipanggil di setiap halaman admin. Mengembalikan { user, role }, atau mengalihkan ke login.
export async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return toLogin('expired');
  if (idleExpired()) return logout('idle');
  let role;
  try { role = await roleOf(session.user.id); } catch { return toLogin('expired'); }
  if (!role) { await supabase.auth.signOut(); return toLogin('expired'); }
  touch();
  watch();
  return { user: session.user, role };
}

export async function hasSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return Boolean(session);
}
