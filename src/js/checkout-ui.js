// Tampilan checkout: form, pratinjau pesan, validasi, dan membuka WhatsApp.
import { getItems, getTotal, getCount, clear } from './cart.js';
import { CONFIG } from './config.js';
import { rupiah, esc } from './utils.js';
import { toast } from './ui.js';
import { loadDraft, saveDraft, validate, normalize, prepare, isNumberValid, LIMITS } from './checkout.js';

const dlg = document.getElementById('checkout');
const body = document.getElementById('checkoutBody');
const cartDlg = document.getElementById('cart');
let last = null;
const $ = id => body.querySelector('#' + id);

function openWhatsApp(url) {
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
  document.body.append(a); a.click(); a.remove();
}

function readForm() {
  const f = $('coForm').elements;
  return { name: f.name.value, method: f.method.value, address: f.address.value, note: f.note.value };
}

function build() {
  const items = getItems();
  const d = loadDraft();
  const delivery = d.method === 'delivery';
  body.innerHTML = `
  <form class="co" id="coForm" novalidate>
    <div class="co-sum">
      <ul class="co-items">${items.map(i =>
        `<li><span>${esc(i.name)}${i.variant_label ? ' (' + esc(i.variant_label) + ')' : ''} &times;${i.quantity}</span><span>${rupiah(i.unit_price * i.quantity)}</span></li>`).join('')}</ul>
      <div class="co-total"><span>Total (${getCount()} item)</span><strong>${rupiah(getTotal())}</strong></div>
    </div>

    <div class="field">
      <label for="coName">Nama</label>
      <input id="coName" name="name" type="text" maxlength="${LIMITS.name}" autocomplete="name" aria-describedby="coNameErr" value="${esc(d.name)}">
      <p class="f-err" id="coNameErr" hidden></p>
    </div>

    <fieldset class="field">
      <legend>Metode</legend>
      <div class="methods">
        <label class="method"><input type="radio" name="method" value="pickup" ${delivery ? '' : 'checked'}><span>Ambil di tempat</span></label>
        <label class="method"><input type="radio" name="method" value="delivery" ${delivery ? 'checked' : ''}><span>Kirim ke alamat</span></label>
      </div>
    </fieldset>

    <div class="field" id="coAddrWrap" ${delivery ? '' : 'hidden'}>
      <label for="coAddr">Alamat lengkap pengiriman</label>
      <textarea id="coAddr" name="address" maxlength="${LIMITS.address}" autocomplete="street-address" aria-describedby="coAddrErr">${esc(d.address)}</textarea>
      <p class="f-err" id="coAddrErr" hidden></p>
    </div>

    <div class="field">
      <label for="coNote">Catatan <small>(opsional)</small></label>
      <textarea id="coNote" name="note" maxlength="${LIMITS.note}">${esc(d.note)}</textarea>
    </div>

    <details id="coDetails"><summary>Lihat isi pesan WhatsApp</summary><pre id="coPreview"></pre><p class="f-hint" id="coLen"></p></details>
    <div id="coAlert" role="alert"></div>

    <button class="add" type="submit">Kirim pesanan via WhatsApp</button>
    <p class="f-hint">Ongkir dan pembayaran dikonfirmasi lewat chat dengan penjual.</p>
    <button type="button" class="c-clear" data-back>&larr; Kembali ke keranjang</button>
  </form>`;

  const form = $('coForm');
  const onChange = e => {
    const raw = readForm();
    saveDraft(raw);
    $('coAddrWrap').hidden = raw.method !== 'delivery';
    if (e.target.name) clearError(e.target.name);
    $('coAlert').innerHTML = '';
    preview();
  };
  form.addEventListener('input', onChange);
  form.addEventListener('change', onChange);
  form.addEventListener('submit', onSubmit);
  preview();
}

function preview() {
  const v = normalize(readForm());
  const r = prepare(getItems(), getTotal(), { ...v, name: v.name || '(belum diisi)', address: v.address || '(belum diisi)' });
  $('coPreview').textContent = r.message;
  $('coLen').textContent = r.tooLong
    ? 'Pesan terlalu panjang untuk dikirim otomatis. Kurangi item atau salin manual saat mengirim.'
    : r.compact ? 'Pesan diringkas otomatis (tanpa harga per baris) karena cukup panjang.' : '';
}

function showError(field, msg) {
  const err = $(field === 'name' ? 'coNameErr' : 'coAddrErr');
  const input = $(field === 'name' ? 'coName' : 'coAddr');
  err.textContent = msg || '';
  err.hidden = !msg;
  input.setAttribute('aria-invalid', String(!!msg));
}
const clearError = field => { if (field === 'name' || field === 'address') showError(field, ''); };

function onSubmit(e) {
  e.preventDefault();
  const { ok, errors, values } = validate(readForm());
  showError('name', errors.name);
  showError('address', errors.address);
  if (!ok) { body.querySelector('[aria-invalid="true"]')?.focus(); return; }

  if (!isNumberValid()) {
    $('coAlert').innerHTML = '<p class="f-err">Nomor WhatsApp toko belum diatur dengan benar. Hubungi penjual.</p>';
    return;
  }
  const items = getItems();
  if (!items.length) { dlg.close(); toast('Keranjang masih kosong'); return; }

  last = prepare(items, getTotal(), values);
  if (last.tooLong) {
    $('coAlert').innerHTML = `<div class="co-box">
      <p>Pesanan terlalu panjang untuk dikirim otomatis lewat link WhatsApp.
      Kurangi jumlah item, atau salin pesan lalu tempel di chat penjual.</p>
      <button type="button" class="co-alt" data-copy>Salin pesan dan buka WhatsApp</button></div>`;
    return;
  }
  openWhatsApp(last.url);
  showDone();
}

function showDone() {
  body.innerHTML = `<div class="co co-done">
    <h3>WhatsApp sudah dibuka</h3>
    <p>Tekan Kirim di WhatsApp untuk mengirim pesananmu. Setelah pesan terkirim, keranjang bisa dikosongkan.</p>
    <a class="co-link" href="${esc(last.url)}" target="_blank" rel="noopener noreferrer">WhatsApp tidak terbuka? Buka lagi</a>
    <button type="button" class="add" data-clear-cart>Pesanan terkirim, kosongkan keranjang</button>
    <button type="button" class="c-clear" data-edit>Belum terkirim, ubah pesanan</button>
  </div>`;
}

function copyAndOpen() {
  const copied = navigator.clipboard?.writeText(last.full);
  openWhatsApp(`https://wa.me/${CONFIG.WA_NUMBER}`); // dibuka langsung dari klik agar tidak diblokir browser
  if (copied) copied.then(() => toast('Pesan disalin. Tempel di chat WhatsApp.'), manual);
  else manual();
  function manual() { $('coPreview').textContent = last.full; $('coDetails').open = true; toast('Salin pesan secara manual dari kotak pratinjau'); }
}

export function initCheckout() {
  document.addEventListener('cart:checkout', () => {
    if (!getItems().length) return toast('Keranjang masih kosong');
    cartDlg.close();
    build();
    dlg.showModal();
  });

  dlg.addEventListener('click', e => {
    if (e.target === dlg || e.target.closest('[data-close]')) return dlg.close();
    if (e.target.closest('[data-back]')) { dlg.close(); return cartDlg.showModal(); }
    if (e.target.closest('[data-copy]')) return copyAndOpen();
    if (e.target.closest('[data-edit]')) return build();
    if (e.target.closest('[data-clear-cart]')) {
      clear();
      dlg.close();
      toast('Keranjang dikosongkan. Terima kasih!');
    }
  });
}
