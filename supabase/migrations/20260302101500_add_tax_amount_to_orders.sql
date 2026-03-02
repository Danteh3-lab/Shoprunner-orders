alter table public.orders
    add column if not exists tax_amount numeric(12, 2);

alter table public.orders
    drop constraint if exists orders_tax_amount_non_negative_chk;

alter table public.orders
    add constraint orders_tax_amount_non_negative_chk
    check (tax_amount is null or tax_amount >= 0);
