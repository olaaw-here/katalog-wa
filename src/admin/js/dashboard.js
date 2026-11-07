// Dashboard: ringkasan jumlah produk (sekaligus memastikan token admin diterima server).
import { initAdminPage } from './shell.js';
import { supabase } from '../../js/supabase.js';

const session = await initAdminPage({ page: 'index.html', title: 'Dashboard' });
document.getElementById('hello').textContent = `Halo, ${session.user.email}`;

const set = (id, v) => { document.getElementById(id).textContent = v; };
const { data, error } = await supabase.from('products').select('status').is('deleted_at', null);
if (error) {
  const box = document.getElementById('stError');
  box.textContent = 'Ringkasan belum bisa dimuat. Pastikan migrasi admin_crud.sql sudah dijalankan.';
  box.hidden = false;
} else {
  set('stAvail', data.filter(r => r.status === 'active').length);
  set('stOut', data.filter(r => r.status === 'sold_out').length);
  set('stHidden', data.filter(r => r.status === 'hidden').length);
}
