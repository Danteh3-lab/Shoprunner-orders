create extension if not exists pgcrypto;

create table if not exists public.team_members (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    created_at timestamptz not null default now()
);

create unique index if not exists team_members_user_name_unique_idx
    on public.team_members (user_id, lower(name));

create index if not exists team_members_user_created_at_idx
    on public.team_members (user_id, created_at asc);

create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    customer_name text not null,
    owner_id uuid references public.team_members(id) on delete set null,
    order_date date not null,
    item_name text not null,
    purchase_price numeric(12, 2) not null check (purchase_price >= 0),
    weight_lbs numeric(12, 2) not null check (weight_lbs >= 0),
    margin numeric(4, 2) not null check (margin in (1.10, 1.15, 1.20)),
    shipping_cost numeric(12, 2) not null,
    sale_price numeric(12, 2) not null,
    advance_paid numeric(12, 2) not null check (advance_paid >= 0),
    remaining_due numeric(12, 2) not null,
    arrived boolean not null default false,
    paid boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists orders_user_created_at_idx
    on public.orders (user_id, created_at desc);

create index if not exists orders_user_order_date_idx
    on public.orders (user_id, order_date desc);

alter table public.team_members enable row level security;
alter table public.orders enable row level security;

drop policy if exists team_members_select_own on public.team_members;
create policy team_members_select_own
    on public.team_members
    for select
    using (auth.uid() = user_id);

drop policy if exists team_members_insert_own on public.team_members;
create policy team_members_insert_own
    on public.team_members
    for insert
    with check (auth.uid() = user_id);

drop policy if exists team_members_update_own on public.team_members;
create policy team_members_update_own
    on public.team_members
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists team_members_delete_own on public.team_members;
create policy team_members_delete_own
    on public.team_members
    for delete
    using (auth.uid() = user_id);

drop policy if exists orders_select_own on public.orders;
create policy orders_select_own
    on public.orders
    for select
    using (auth.uid() = user_id);

drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own
    on public.orders
    for insert
    with check (auth.uid() = user_id);

drop policy if exists orders_update_own on public.orders;
create policy orders_update_own
    on public.orders
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists orders_delete_own on public.orders;
create policy orders_delete_own
    on public.orders
    for delete
    using (auth.uid() = user_id);
