import test from 'node:test';
import assert from 'node:assert/strict';
import { getAdminRedirectTarget, isAdminProtectedPath } from '../src/admin/js/admin-auth.js';

test('admin login redirect should send signed-out users to the login page', () => {
  assert.equal(getAdminRedirectTarget('/src/admin/products.html', false), '/src/admin/index.html');
  assert.equal(getAdminRedirectTarget('/src/admin/settings.html', false), '/src/admin/index.html');
});

test('admin paths should be protected when they are under the admin area', () => {
  assert.equal(isAdminProtectedPath('/src/admin/products.html'), true);
  assert.equal(isAdminProtectedPath('/src/admin/index.html'), true);
  assert.equal(isAdminProtectedPath('/index.html'), false);
});
