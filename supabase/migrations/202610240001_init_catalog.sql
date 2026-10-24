create extension if not exists pgcrypto;

create table if not exists public.categories (
  category_id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  product_id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(category_id) on delete set null,
  name text not null,
  slug text not null unique,
  base_price integer not null default 0,
  compare_price integer,
  image_main text,
  status text not null default 'active' check (status in ('active', 'hidden', 'sold_out')),
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.product_images (
  image_id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(product_id) on delete cascade,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  variant_id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(product_id) on delete cascade,
  label text not null,
  price_adjustment integer not null default 0,
  status text not null default 'active' check (status in ('active', 'sold_out')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_categories_sort_order on public.categories (sort_order asc, deleted_at);
create index if not exists idx_products_category on public.products (category_id, deleted_at, status);
create index if not exists idx_products_created_at on public.products (created_at desc);
create index if not exists idx_product_images_product on public.product_images (product_id, sort_order);
create index if not exists idx_product_variants_product on public.product_variants (product_id, sort_order);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;

create policy "Allow public read active categories"
on public.categories
for select
to anon, authenticated
using (deleted_at is null);

create policy "Allow public read active products"
on public.products
for select
to anon, authenticated
using (deleted_at is null and status <> 'hidden');

create policy "Allow public read active product images"
on public.product_images
for select
to anon, authenticated
using (exists (
  select 1 from public.products p
  where p.product_id = product_images.product_id
    and p.deleted_at is null
    and p.status <> 'hidden'
));

create policy "Allow public read active product variants"
on public.product_variants
for select
to anon, authenticated
using (exists (
  select 1 from public.products p
  where p.product_id = product_variants.product_id
    and p.deleted_at is null
    and p.status <> 'hidden'
));

insert into public.categories (name, slug, sort_order)
values
  ('Elektronik', 'elektronik', 1),
  ('Rumah Tangga', 'rumah-tangga', 2),
  ('Fashion', 'fashion', 3)
on conflict (slug) do nothing;

with cat as (
  select category_id from public.categories where slug = 'elektronik'
)
insert into public.products (category_id, name, slug, base_price, compare_price, image_main, status, is_featured)
values
  ((select category_id from cat), 'Headphone Wireless', 'headphone-wireless', 450000, 520000, 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80', 'active', true),
  ((select category_id from cat), 'Smartwatch Pro', 'smartwatch-pro', 890000, 1200000, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80', 'active', true),
  ((select category_id from public.categories where slug = 'rumah-tangga'), 'Teko Stainless', 'teko-stainless', 180000, 220000, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80', 'active', false),
  ((select category_id from public.categories where slug = 'fashion'), 'Tas Kanvas', 'tas-kanvas', 240000, 320000, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80', 'sold_out', false)
on conflict (slug) do nothing;

with p as (
  select product_id, slug from public.products
)
insert into public.product_images (product_id, url, sort_order)
values
  ((select product_id from p where slug = 'headphone-wireless'), 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80', 0),
  ((select product_id from p where slug = 'headphone-wireless'), 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80', 1),
  ((select product_id from p where slug = 'headphone-wireless'), 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80', 2),
  ((select product_id from p where slug = 'smartwatch-pro'), 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80', 0),
  ((select product_id from p where slug = 'smartwatch-pro'), 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=900&q=80', 1),
  ((select product_id from p where slug = 'smartwatch-pro'), 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=80', 2),
  ((select product_id from p where slug = 'teko-stainless'), 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80', 0),
  ((select product_id from p where slug = 'teko-stainless'), 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80', 1),
  ((select product_id from p where slug = 'tas-kanvas'), 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80', 0),
  ((select product_id from p where slug = 'tas-kanvas'), 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80', 1)
on conflict do nothing;

with p as (
  select product_id, slug from public.products
)
insert into public.product_variants (product_id, label, price_adjustment, status, sort_order)
values
  ((select product_id from p where slug = 'headphone-wireless'), 'Hitam', 0, 'active', 0),
  ((select product_id from p where slug = 'headphone-wireless'), 'Putih', 50000, 'active', 1),
  ((select product_id from p where slug = 'smartwatch-pro'), '42mm', 0, 'active', 0),
  ((select product_id from p where slug = 'smartwatch-pro'), '46mm', 150000, 'sold_out', 1),
  ((select product_id from p where slug = 'teko-stainless'), '1 Liter', 0, 'active', 0),
  ((select product_id from p where slug = 'tas-kanvas'), 'Default', 0, 'sold_out', 0)
on conflict do nothing;
