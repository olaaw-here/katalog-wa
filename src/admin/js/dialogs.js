// Dialog konfirmasi/peringatan dan toast untuk admin.
import { esc } from '../../js/utils.js';

export function toast(message, kind = 'ok') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.textContent = message;
  el.classList.toggle('err', kind === 'err');
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), kind === 'err' ? 4500 : 2600);
}

function ask({ title, message, confirmText, cancelText, danger }) {
  return new Promise(resolve => {
    const d = document.createElement('dialog');
    d.className = 'ad-dialog';
    d.setAttribute('aria-labelledby', 'dlgTitle');
    d.innerHTML = `<h2 id="dlgTitle">${esc(title)}</h2><p>${esc(message)}</p>
      <div class="ad-dialog-actions">
        ${cancelText ? `<button type="button" class="ad-btn" data-no>${esc(cancelText)}</button>` : ''}
        <button type="button" class="ad-btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(confirmText)}</button>
      </div>`;
    document.body.append(d);
    let result = false;
    d.addEventListener('click', e => {
      if (e.target.closest('[data-yes]')) { result = true; d.close(); }
      else if (e.target === d || e.target.closest('[data-no]')) d.close();
    });
    d.addEventListener('close', () => { d.remove(); resolve(result); });
    d.showModal();
    (danger ? d.querySelector('[data-no]') : d.querySelector('[data-yes]'))?.focus(); // aksi berbahaya: fokus awal di Batal
  });
}

export const confirmDialog = ({ title, message, confirmText = 'Ya', cancelText = 'Batal', danger = false }) =>
  ask({ title, message, confirmText, cancelText, danger });
export const alertDialog = ({ title, message, okText = 'Mengerti' }) =>
  ask({ title, message, confirmText: okText, cancelText: '', danger: false });
