-- WhatsApp Vendor OS — Phase 1 schema (single vendor)
-- Run this in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists "uuid-ossp";

-- Products in the vendor's catalogue
create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  price_naira numeric(12, 2) not null,
  media_url text,              -- Supabase Storage URL for the primary image/video
  status text not null default 'in_stock'
    check (status in ('in_stock', 'low_stock', 'sold_out')),
  quantity integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Customers, identified by their WhatsApp JID
create table customers (
  id uuid primary key default uuid_generate_v4(),
  whatsapp_jid text not null unique,   -- e.g. '2348012345678@s.whatsapp.net'
  display_name text,
  label text default 'new'
    check (label in ('new', 'vip', 'wholesale', 'inactive')),
  created_at timestamptz not null default now()
);

-- Orders
create table orders (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id),
  status text not null default 'new'
    check (status in ('new', 'processing', 'packed', 'shipped', 'delivered', 'cancelled')),
  total_naira numeric(12, 2) not null default 0,
  delivery_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Line items per order
create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity integer not null default 1,
  unit_price_naira numeric(12, 2) not null
);

-- Scheduled posts (Status updates and group messages)
create table scheduled_posts (
  id uuid primary key default uuid_generate_v4(),
  post_type text not null check (post_type in ('status', 'group_message')),
  target_group_jid text,          -- null for Status posts
  content_text text,
  media_url text,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now()
);

-- Index for the scheduler's "what's due" query
create index idx_scheduled_posts_due
  on scheduled_posts (scheduled_for)
  where status = 'pending';

create index idx_orders_status on orders (status);
create index idx_customers_jid on customers (whatsapp_jid);
