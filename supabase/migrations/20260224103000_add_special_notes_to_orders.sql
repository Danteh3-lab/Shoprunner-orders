alter table public.orders
    add column if not exists special_notes text;

alter table public.orders
    drop constraint if exists orders_special_notes_length_chk;

alter table public.orders
    add constraint orders_special_notes_length_chk
    check (special_notes is null or char_length(special_notes) <= 500);