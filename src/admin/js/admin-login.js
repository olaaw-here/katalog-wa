import { createSupabaseAdminClient, getAdminRedirectTarget } from './admin-auth.js';

const supabase = createSupabaseAdminClient();
const form = document.querySelector('#admin-login-form');
const message = document.querySelector('#login-message');
const submitButton = document.querySelector('#login-submit');

const showMessage = (text, isError = false) => {
  if (!message) return;
  message.textContent = text;
  message.classList.toggle('error', isError);
};

const redirectToDashboard = () => {
  window.location.replace('/src/admin/products.html');
};

const initialize = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Admin session check failed:', error);
  }

  if (session) {
    redirectToDashboard();
    return;
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const email = String(formData.get('email') || '').trim();
      const password = String(formData.get('password') || '').trim();

      if (!email || !password) {
        showMessage('Email dan password wajib diisi.', true);
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = 'Memproses...';
      showMessage('');

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        showMessage(signInError.message || 'Login gagal. Periksa email dan password Anda.', true);
        submitButton.disabled = false;
        submitButton.textContent = 'Masuk';
        return;
      }

      if (data?.session) {
        redirectToDashboard();
      }
    });
  }
};

initialize();
