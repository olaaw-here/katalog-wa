-- Admin: tabel admin, fungsi is_admin(), kebijakan CRUD, aturan hapus kategori, batas foto, bucket Storage.
-- Jalankan di Supabase SQL Editor (atau `supabase db push`). Aman dijalankan berulang.

-- 1. Admin ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
drop policy if exists "Admin reads own row" on public.admin_users;
create policy "Admin reads own row" on public.admin_users
  for select to authenticated using (user_id = auth.uid());

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid())
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Daftarkan akun admin (buat dulu penggunanya di Authentication > Users), ganti emailnya:
-- insert into public.admin_users (user_id, email)
--   select id, email from auth.users where email = 'emailkamu@contoh.com';

-- 2. Kolom tambahan ------------------------------------------------------------------
alter table public.products   add column if not exists description text;
alter table public.products   add column if not exists updated_at timestamptz not null default now();
alter table public.products   add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.categories add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_product() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end $$;
drop trigger if exists trg_touch_product on public.products;
create trigger trg_touch_product before update on public.products
  for each row execute function public.touch_product();

create or replace function public.touch_category() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists trg_touch_category on public.categories;
create trigger trg_touch_category before update on public.categories
  for each row execute function public.touch_category();

-- 3. Aturan data ---------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'products_price_rules') then
    alter table public.products add constraint products_price_rules
      check (base_price >= 0 and (compare_price is null or compare_price > base_price));
  end if;
end $$;

-- Kategori yang masih punya produk aktif tidak boleh dihapus (soft delete maupun hapus permanen).
create or replace function public.block_category_delete() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' or (old.deleted_at is null and new.deleted_at is not null) then
    if exists (select 1 from public.products where category_id = old.category_id and deleted_at is null) then
      raise exception 'CATEGORY_HAS_PRODUCTS' using hint = 'Pindahkan atau arsipkan produk di kategori ini dulu.';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists trg_block_category_delete on public.categories;
create trigger trg_block_category_delete before update or delete on public.categories
  for each row execute function public.block_category_delete();

-- Maksimal 5 foto per produk.
create or replace function public.limit_product_images() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.product_images where product_id = new.product_id) >= 5 then
    raise exception 'MAX_5_IMAGES';
  end if;
  return new;
end $$;
drop trigger if exists trg_limit_product_images on public.product_images;
create trigger trg_limit_product_images before insert on public.product_images
  for each row execute function public.limit_product_images();

-- 4. Hak akses admin (menambah kebijakan baca publik yang sudah ada) ----------------------
do $$
declare t text;
begin
  foreach t in array array['categories', 'products', 'product_images', 'product_variants'] loop
    execute format('drop policy if exists "Admin full access" on public.%I', t);
    execute format('create policy "Admin full access" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- 5. Storage foto produk -------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin manage product images" on storage.objects;
create policy "Admin manage product images" on storage.objects
  for all to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());
