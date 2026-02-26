alter table public.orders
drop constraint if exists orders_margin_check;

alter table public.orders
add constraint orders_margin_check
check (margin in (1.00, 1.10, 1.15, 1.20));
