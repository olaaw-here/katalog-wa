import test from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../src/js/api.js';

test('fetchProducts falls back when product_images relation does not exist', async () => {
  const calls = [];
  global.fetch = async (url) => {
    calls.push(url);
    if (url.includes('product_images')) {
      return {
        ok: false,
        status: 400,
        text: async () => '{"code":"PGRST200","details":"Searched for a foreign key relationship between \'products\' and \'product_images\' in the schema \'public\'"}'
      };
    }
    return {
      ok: true,
      status: 200,
      text: async () => '[]'
    };
  };

  const result = await api.fetchProducts();

  assert.deepEqual(result, []);
  assert.equal(calls.length, 2);
  assert.ok(calls[0].includes('product_images'));
  assert.ok(calls[1].includes('products?select=product_id,name,slug,base_price,compare_price,image_main,status,is_featured,created_at,category_id'));
});

test('fetchProductDetail falls back when relation tables do not exist', async () => {
  const calls = [];
  global.fetch = async (url) => {
    calls.push(url);
    if (url.includes('product_images')) {
      return {
        ok: false,
        status: 400,
        text: async () => '{"code":"PGRST200","details":"Could not find a relationship between \'products\' and \'product_images\' in the schema cache"}'
      };
    }
    return {
      ok: true,
      status: 200,
      text: async () => '[{"product_id":"abc","name":"Demo"}]'
    };
  };

  const result = await api.fetchProductDetail('abc');

  assert.ok(result);
  assert.equal(calls.length, 2);
  assert.ok(calls[0].includes('product_images'));
  assert.ok(calls[1].includes('products?select=*'));
});
