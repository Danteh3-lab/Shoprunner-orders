alter table public.orders
    add column if not exists shipping_type text not null default 'air',
    add column if not exists length_in numeric(10,2),
    add column if not exists width_in numeric(10,2),
    add column if not exists height_in numeric(10,2);

alter table public.orders
    drop constraint if exists orders_shipping_type_chk;

alter table public.orders
    add constraint orders_shipping_type_chk check (shipping_type in ('air', 'sea'));

alter table public.orders
    drop constraint if exists orders_length_in_non_negative_chk;

alter table public.orders
    add constraint orders_length_in_non_negative_chk check (length_in is null or length_in >= 0);

alter table public.orders
    drop constraint if exists orders_width_in_non_negative_chk;

alter table public.orders
    add constraint orders_width_in_non_negative_chk check (width_in is null or width_in >= 0);

alter table public.orders
    drop constraint if exists orders_height_in_non_negative_chk;

alter table public.orders
    add constraint orders_height_in_non_negative_chk check (height_in is null or height_in >= 0);

