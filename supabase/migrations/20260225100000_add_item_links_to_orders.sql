alter table public.orders
    add column if not exists item_links jsonb not null default '[]'::jsonb;

update public.orders
set item_links = '[]'::jsonb
where item_links is null;

alter table public.orders
    drop constraint if exists orders_item_links_is_array_chk;

alter table public.orders
    add constraint orders_item_links_is_array_chk
    check (jsonb_typeof(item_links) = 'array');
