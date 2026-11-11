-- DISTRICT 19 — database schema, security policies and storage.
-- Run once in the Supabase SQL editor (or with `supabase db push`).

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.product_category as enum ('shirt', 'pant', 'shoe');
create type public.product_status   as enum ('draft', 'published');
create type public.image_role       as enum ('front', 'back', 'gallery');
create type public.payment_method   as enum ('cod', 'bkash', 'nagad');
create type public.payment_status   as enum ('unpaid', 'pending_verification', 'paid', 'refunded');
create type public.order_status     as enum ('new', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled');
create type public.delivery_zone    as enum ('inside_dhaka', 'outside_dhaka');

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------

create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'admin' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);

-- True when the signed-in user is an administrator. SECURITY DEFINER so the
-- policies below can call it without giving anyone read access to admin_users.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null check (char_length(name) between 1 and 120),
  category     public.product_category not null,
  description  text not null default '',
  price        integer not null check (price >= 0),            -- whole taka
  sale_price   integer check (sale_price is null or (sale_price >= 0 and sale_price < price)),
  status       public.product_status not null default 'draft',
  is_featured  boolean not null default false,
  is_new       boolean not null default false,
  cut          text not null default '',                       -- placeholder shape until photos exist
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  published_at timestamptz
);
create index products_category_status_idx on public.products (category, status);

create table public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  storage_path text not null,                                  -- path inside the product-images bucket
  role         public.image_role not null default 'gallery',
  is_primary   boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, sort_order);
create unique index product_images_one_primary on public.product_images (product_id) where is_primary;

create table public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  size           text not null,
  color          text not null,
  color_hex      text not null default '#a8a29e' check (color_hex ~ '^#[0-9a-fA-F]{6}$'),
  sku            text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  unique (product_id, size, color)
);
create index product_variants_product_idx on public.product_variants (product_id);

create table public.looks (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  model_image_path text,                                       -- path inside the product-images bucket
  sort_order       integer not null default 0,
  is_published     boolean not null default true,
  created_at       timestamptz not null default now()
);

create table public.look_items (
  look_id    uuid not null references public.looks (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (look_id, product_id)
);

-- One row of shop-wide settings.
create table public.shop_settings (
  id                 boolean primary key default true check (id),
  inside_dhaka_fee   integer not null default 70  check (inside_dhaka_fee  >= 0),
  outside_dhaka_fee  integer not null default 130 check (outside_dhaka_fee >= 0),
  bkash_number       text not null default '',
  nagad_number       text not null default '',
  updated_at         timestamptz not null default now()
);
insert into public.shop_settings (id) values (true);

-- ---------------------------------------------------------------------------
-- Customers and orders
-- ---------------------------------------------------------------------------

create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null,
  phone      text not null unique,
  email      text,
  created_at timestamptz not null default now()
);

create table public.orders (
  id                    uuid primary key default gen_random_uuid(),
  order_number          text not null unique,
  customer_id           uuid references public.customers (id) on delete set null,
  customer_name         text not null,
  phone                 text not null,
  email                 text,
  division              text not null,
  district              text not null,
  area                  text not null,
  address_line          text not null,
  note                  text,
  delivery_zone         public.delivery_zone not null,
  delivery_fee          integer not null check (delivery_fee >= 0),
  subtotal              integer not null check (subtotal >= 0),
  total                 integer not null check (total >= 0),
  payment_method        public.payment_method not null,
  payment_status        public.payment_status not null default 'unpaid',
  payment_sender_number text,                                  -- bKash / Nagad number the customer paid from
  payment_trx_id        text,                                  -- transaction ID the customer entered
  status                public.order_status not null default 'new',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index orders_created_idx on public.orders (created_at desc);
create index orders_status_idx  on public.orders (status);

create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  product_id   uuid references public.products (id) on delete set null,
  variant_id   uuid references public.product_variants (id) on delete set null,
  product_name text not null,                                  -- copied, so the order survives product edits
  size         text not null,
  color        text not null,
  unit_price   integer not null check (unit_price >= 0),
  quantity     integer not null check (quantity > 0),
  line_total   integer not null check (line_total >= 0)
);
create index order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- updated_at / published_at upkeep
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.touch_product()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  -- Stamp the moment a product first goes live, or goes live again after being a draft.
  if new.status = 'published' then
    if tg_op = 'INSERT' then
      new.published_at := now();
    elsif old.status is distinct from 'published' then
      new.published_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger products_touch      before insert or update on public.products      for each row execute function public.touch_product();
create trigger orders_touch        before update           on public.orders        for each row execute function public.touch_updated_at();
create trigger shop_settings_touch before update           on public.shop_settings for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.admin_users      enable row level security;
alter table public.products         enable row level security;
alter table public.product_images   enable row level security;
alter table public.product_variants enable row level security;
alter table public.looks            enable row level security;
alter table public.look_items       enable row level security;
alter table public.shop_settings    enable row level security;
alter table public.customers        enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;

-- Admin list: an admin can see and manage it; nobody else can read it.
create policy admin_users_read  on public.admin_users for select using (public.is_admin());
create policy admin_users_write on public.admin_users for all    using (public.is_admin()) with check (public.is_admin());

-- Catalogue: the public reads published rows only; admins read and write everything.
create policy products_public_read on public.products for select using (status = 'published' or public.is_admin());
create policy products_admin_write on public.products for all    using (public.is_admin()) with check (public.is_admin());

create policy product_images_public_read on public.product_images for select using (
  public.is_admin() or exists (select 1 from public.products p where p.id = product_id and p.status = 'published')
);
create policy product_images_admin_write on public.product_images for all using (public.is_admin()) with check (public.is_admin());

create policy product_variants_public_read on public.product_variants for select using (
  public.is_admin() or exists (select 1 from public.products p where p.id = product_id and p.status = 'published')
);
create policy product_variants_admin_write on public.product_variants for all using (public.is_admin()) with check (public.is_admin());

create policy looks_public_read on public.looks for select using (is_published or public.is_admin());
create policy looks_admin_write on public.looks for all    using (public.is_admin()) with check (public.is_admin());

create policy look_items_public_read on public.look_items for select using (
  public.is_admin() or exists (select 1 from public.looks l where l.id = look_id and l.is_published)
);
create policy look_items_admin_write on public.look_items for all using (public.is_admin()) with check (public.is_admin());

-- Delivery fees and payment numbers are shown at checkout, so anyone may read them.
create policy shop_settings_public_read on public.shop_settings for select using (true);
create policy shop_settings_admin_write on public.shop_settings for update using (public.is_admin()) with check (public.is_admin());

-- Customers and orders: admins only. The public never reads or writes these
-- tables directly; orders are created by place_order() below.
create policy customers_admin   on public.customers   for all using (public.is_admin()) with check (public.is_admin());
create policy orders_admin      on public.orders      for all using (public.is_admin()) with check (public.is_admin());
create policy order_items_admin on public.order_items for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Placing an order
-- ---------------------------------------------------------------------------
-- Called by the checkout server action with the service-role key. Prices and
-- stock come from the database, never from the browser. Stock is checked and
-- reduced inside one transaction with the variant rows locked, so two buyers
-- cannot both take the last item.
--
-- payload:
--   { "customer_name", "phone", "email", "division", "district", "area",
--     "address_line", "note", "delivery_zone", "payment_method",
--     "payment_sender_number", "payment_trx_id",
--     "items": [ { "variant_id": uuid, "quantity": int }, ... ] }

create or replace function public.place_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item        jsonb;
  v_variant     record;
  v_quantity    integer;
  v_unit        integer;
  v_subtotal    integer := 0;
  v_fee         integer;
  v_zone        public.delivery_zone := (payload ->> 'delivery_zone')::public.delivery_zone;
  v_method      public.payment_method := (payload ->> 'payment_method')::public.payment_method;
  v_trx         text := nullif(trim(payload ->> 'payment_trx_id'), '');
  v_sender      text := nullif(trim(payload ->> 'payment_sender_number'), '');
  v_customer_id uuid;
  v_order_id    uuid := gen_random_uuid();
  v_number      text;
  v_lines       jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(payload -> 'items') is distinct from 'array' or jsonb_array_length(payload -> 'items') = 0 then
    raise exception 'EMPTY_CART';
  end if;
  if v_method in ('bkash', 'nagad') and (v_trx is null or v_sender is null) then
    raise exception 'PAYMENT_DETAILS_REQUIRED';
  end if;

  -- Lock, check and price every line. Sorted by id so concurrent orders lock in the same order.
  for v_item in
    select value from jsonb_array_elements(payload -> 'items') order by value ->> 'variant_id'
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity is null or v_quantity < 1 or v_quantity > 20 then
      raise exception 'BAD_QUANTITY';
    end if;

    select v.id, v.size, v.color, v.stock_quantity, p.id as product_id, p.name, p.status,
           coalesce(p.sale_price, p.price) as unit_price
      into v_variant
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.id = (v_item ->> 'variant_id')::uuid
       for update of v;

    if not found or v_variant.status <> 'published' then
      raise exception 'ITEM_UNAVAILABLE';
    end if;
    if v_variant.stock_quantity < v_quantity then
      raise exception 'OUT_OF_STOCK:%', v_variant.name || ' (' || v_variant.size || ', ' || v_variant.color || ')';
    end if;

    v_unit := v_variant.unit_price;
    v_subtotal := v_subtotal + v_unit * v_quantity;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_variant.product_id, 'variant_id', v_variant.id, 'product_name', v_variant.name,
      'size', v_variant.size, 'color', v_variant.color, 'unit_price', v_unit, 'quantity', v_quantity
    );

    update public.product_variants
       set stock_quantity = stock_quantity - v_quantity
     where id = v_variant.id;
  end loop;

  select case when v_zone = 'inside_dhaka' then inside_dhaka_fee else outside_dhaka_fee end
    into v_fee
    from public.shop_settings;

  insert into public.customers (full_name, phone, email)
  values (payload ->> 'customer_name', payload ->> 'phone', nullif(payload ->> 'email', ''))
  on conflict (phone) do update
     set full_name = excluded.full_name,
         email     = coalesce(excluded.email, public.customers.email)
  returning id into v_customer_id;

  v_number := 'D19-' || to_char(now() at time zone 'Asia/Dhaka', 'YYMMDD') || '-'
              || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.orders (
    id, order_number, customer_id, customer_name, phone, email,
    division, district, area, address_line, note,
    delivery_zone, delivery_fee, subtotal, total,
    payment_method, payment_status, payment_sender_number, payment_trx_id
  ) values (
    v_order_id, v_number, v_customer_id, payload ->> 'customer_name', payload ->> 'phone', nullif(payload ->> 'email', ''),
    payload ->> 'division', payload ->> 'district', payload ->> 'area', payload ->> 'address_line', nullif(payload ->> 'note', ''),
    v_zone, v_fee, v_subtotal, v_subtotal + v_fee,
    v_method,
    -- A bKash or Nagad order is never "paid" until an admin has checked the transaction.
    case when v_method = 'cod' then 'unpaid'::public.payment_status else 'pending_verification'::public.payment_status end,
    case when v_method = 'cod' then null else v_sender end,
    case when v_method = 'cod' then null else v_trx end
  );

  insert into public.order_items (order_id, product_id, variant_id, product_name, size, color, unit_price, quantity, line_total)
  select v_order_id, (l ->> 'product_id')::uuid, (l ->> 'variant_id')::uuid, l ->> 'product_name',
         l ->> 'size', l ->> 'color', (l ->> 'unit_price')::integer, (l ->> 'quantity')::integer,
         (l ->> 'unit_price')::integer * (l ->> 'quantity')::integer
    from jsonb_array_elements(v_lines) as l;

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_number, 'total', v_subtotal + v_fee);
end;
$$;

-- Only the server (service role) may place orders; the browser cannot call this directly.
revoke all on function public.place_order(jsonb) from public, anon, authenticated;
grant execute on function public.place_order(jsonb) to service_role;

-- Cancelling an order puts its stock back. Admin only.
create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORISED';
  end if;
  update public.orders set status = 'cancelled' where id = p_order_id and status <> 'cancelled';
  if not found then
    return;
  end if;
  update public.product_variants v
     set stock_quantity = v.stock_quantity + i.quantity
    from public.order_items i
   where i.order_id = p_order_id and i.variant_id = v.id;
end;
$$;
revoke all on function public.cancel_order(uuid) from public, anon;
grant execute on function public.cancel_order(uuid) to authenticated;

-- Product ids ranked by units sold, for the Best sellers section.
create or replace function public.best_seller_ids(p_limit integer default 8)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select i.product_id
    from public.order_items i
    join public.orders o   on o.id = i.order_id and o.status <> 'cancelled'
    join public.products p on p.id = i.product_id and p.status = 'published'
   group by i.product_id
   order by sum(i.quantity) desc
   limit greatest(1, least(p_limit, 50));
$$;
grant execute on function public.best_seller_ids(integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: product and model photos
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 8388608, array['image/png', 'image/webp', 'image/jpeg', 'image/avif'])
on conflict (id) do nothing;

-- Anyone can view photos; only admins can upload, replace or delete them.
create policy product_images_storage_read   on storage.objects for select using (bucket_id = 'product-images');
create policy product_images_storage_insert on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy product_images_storage_update on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.is_admin()) with check (bucket_id = 'product-images' and public.is_admin());
create policy product_images_storage_delete on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());
