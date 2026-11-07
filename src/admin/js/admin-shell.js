import { createSupabaseAdminClient, getAdminRedirectTarget } from './admin-auth.js';

const supabase = createSupabaseAdminClient();

const renderUserEmail = (email) => {
  const el = document.querySelector('#adminUserEmail');
  if (el) {
    el.textContent = email || 'Admin';
  }
};

const redirectToLogin = () => {
  window.location.replace(getAdminRedirectTarget(window.location.pathname, false));
};

const initializeAdminShell = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    redirectToLogin();
    return;
  }

  renderUserEmail(session.user?.email || 'Admin');

  const logoutBtn = document.querySelector('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.error('Logout gagal:', signOutError);
        return;
      }

      window.location.replace('/src/admin/index.html');
    });
  }

  supabase.auth.onAuthStateChange((event, nextSession) => {
    if (event === 'SIGNED_OUT' || !nextSession) {
      redirectToLogin();
    }
  });
};

initializeAdminShell();
