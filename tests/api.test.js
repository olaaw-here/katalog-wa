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
  assert.ok(!calls[1].includes('product_variants'));
  assert.ok(!calls[1].includes('product_images'));
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
  assert.ok(!calls[1].includes('product_variants'));
  assert.ok(!calls[1].includes('product_images'));
});

test('fetchProducts falls back correctly when product_variants relation is missing', async () => {
  const calls = [];
  global.fetch = async (url) => {
    calls.push(url);
    if (url.includes('product_variants')) {
      return {
        ok: false,
        status: 400,
        text: async () => '{"code":"PGRST200","details":"Searched for a foreign key relationship between \'products\' and \'product_variants\' in the schema \'public\'"}'
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
  assert.ok(calls[0].includes('product_variants'));
  assert.ok(calls[1].includes('products?select=product_id,name,slug,base_price,compare_price,image_main,status,is_featured,created_at,category_id'));
  assert.ok(!calls[1].includes('product_variants'));
});

test('fetchProducts uses demo products when the Supabase host is unreachable', async () => {
  global.fetch = async () => {
    throw new TypeError('Failed to fetch');
  };

  const result = await api.fetchProducts();

  assert.ok(Array.isArray(result));
  assert.ok(result.length > 0);
  assert.equal(result[0].name, 'Headphone Wireless');
});
