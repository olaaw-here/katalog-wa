// Halaman login admin.
import { CONFIG } from '../../js/config.js';
import { login, hasSession, AuthError, AUTH_MESSAGES } from './auth.js';

const form = document.getElementById('loginForm');
const errBox = document.getElementById('loginError');
const info = document.getElementById('loginInfo');
const btn = document.getElementById('loginBtn');
const params = new URLSearchParams(location.search);

// Hanya izinkan tujuan berupa nama halaman admin (cegah open redirect).
const next = (() => { const n = params.get('next') || ''; return /^[a-z0-9-]+\.html$/.test(n) && n !== 'login.html' ? n : 'index.html'; })();

document.title = `Masuk | Admin ${CONFIG.STORE_NAME}`;
document.getElementById('loginBrand').textContent = CONFIG.STORE_NAME;

const NOTICES = {
  idle: 'Kamu otomatis keluar karena lama tidak ada aktivitas. Silakan masuk lagi.',
  expired: 'Sesi berakhir. Silakan masuk lagi.',
  bye: 'Kamu sudah keluar.'
};
if (NOTICES[params.get('reason')]) { info.textContent = NOTICES[params.get('reason')]; info.hidden = false; }

hasSession().then(ok => { if (ok) location.replace(next); }).catch(() => {});

document.getElementById('togglePw').addEventListener('click', e => {
  const pw = document.getElementById('password');
  const show = pw.type === 'password';
  pw.type = show ? 'text' : 'password';
  e.currentTarget.textContent = show ? 'Sembunyikan' : 'Tampilkan';
  e.currentTarget.setAttribute('aria-pressed', String(show));
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  errBox.hidden = true;
  const email = form.email.value.trim();
  const password = form.password.value;
  if (!email || !password) return showError('Email dan password wajib diisi.');

  btn.disabled = true;
  btn.textContent = 'Memeriksa...';
  try {
    await login(email, password, form.remember.checked);
    location.replace(next);
  } catch (err) {
    showError(AUTH_MESSAGES[err instanceof AuthError ? err.code : 'server']);
    form.password.value = '';
    form.password.focus();
    btn.disabled = false;
    btn.textContent = 'Masuk';
  }
});

function showError(msg) { errBox.textContent = msg; errBox.hidden = false; }
