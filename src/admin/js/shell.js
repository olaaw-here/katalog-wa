// Kerangka halaman admin: penjaga login, sidebar/navigasi, tombol keluar.
// Setiap halaman berisi <template id="page"> (isi) dan memanggil initAdminPage().
import { CONFIG } from '../../js/config.js';
import { esc } from '../../js/utils.js';
import { requireAdmin, logout } from './auth.js';

const NAV = [
  ['index.html', 'Dashboard'],
  ['products.html', 'Produk'],
  ['categories.html', 'Kategori'],
  ['settings.html', 'Pengaturan']
];

export async function initAdminPage({ page, title }) {
  const session = await requireAdmin(); // tidak kembali jika belum login
  document.title = `${title} | Admin ${CONFIG.STORE_NAME}`;

  const root = document.getElementById('adminRoot');
  root.innerHTML = `
    <div class="ad-app">
      <aside class="ad-side">
        <a class="ad-brand" href="index.html">${esc(CONFIG.STORE_NAME)}<small>Panel admin</small></a>
        <nav class="ad-nav" aria-label="Menu admin">
          ${NAV.map(([href, label]) => `<a href="${href}"${href === page ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
          <a class="ad-ext" href="../index.html" target="_blank" rel="noopener">Lihat toko &#8599;</a>
        </nav>
        <div class="ad-user">
          <span class="ad-email" title="${esc(session.user.email)}">${esc(session.user.email)}</span>
          <button class="ad-logout" id="adLogout" type="button">Keluar</button>
        </div>
      </aside>
      <main class="ad-main" id="adContent"></main>
    </div>`;
  root.querySelector('#adContent').append(document.getElementById('page').content);
  root.querySelector('#adLogout').addEventListener('click', () => logout('bye'));
  document.body.classList.remove('ad-loading');
  return session;
}
