create table public.products (id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, unit text not null default 'ชิ้น', price numeric not null default 0, created_at timestamptz not null default now());
create table public.product_units (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, unit_name text not null, qty_per numeric not null default 1, retail_price numeric not null default 0, wholesale_price numeric not null default 0, created_at timestamptz not null default now());
create table public.branches (id uuid primary key default gen_random_uuid(), name text not null, note text, created_at timestamptz not null default now());
create table public.customers (id uuid primary key default gen_random_uuid(), name text not null, phone text, note text, created_at timestamptz not null default now());
create table public.customer_prices (id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers(id) on delete cascade, product_id uuid not null references public.products(id) on delete cascade, unit_name text not null, price numeric not null default 0, unique(customer_id, product_id, unit_name));
create table public.transactions (id uuid primary key default gen_random_uuid(), kind text not null check (kind in ('branch','customer')), branch_id uuid references public.branches(id) on delete set null, customer_id uuid references public.customers(id) on delete set null, note text, created_at timestamptz not null default now());
create table public.transaction_items (id uuid primary key default gen_random_uuid(), transaction_id uuid not null references public.transactions(id) on delete cascade, product_id uuid references public.products(id) on delete set null, product_name text not null, unit_name text not null, qty numeric not null default 1, price numeric not null default 0, price_type text not null default 'retail', note text);

do $$ declare t text; begin
foreach t in array array['products','product_units','branches','customers','customer_prices','transactions','transaction_items'] loop
  execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
  execute format('grant all on public.%I to service_role', t);
  execute format('alter table public.%I enable row level security', t);
  execute format('create policy "open access" on public.%I for all to anon, authenticated using (true) with check (true)', t);
end loop; end $$;