import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const page = p => fileURLToPath(new URL(p, import.meta.url));

// Multi-halaman: semua HTML harus didaftarkan agar ikut dibuild ke dist/.
export default defineConfig({
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        main: page('./index.html'),
        tentang: page('./tentang.html'),
        adminLogin: page('./admin/login.html'),
        adminDashboard: page('./admin/index.html'),
        adminCategories: page('./admin/categories.html'),
        adminProducts: page('./admin/products.html'),
        adminProductForm: page('./admin/product-form.html'),
        adminSettings: page('./admin/settings.html')
      }
    }
  }
});
