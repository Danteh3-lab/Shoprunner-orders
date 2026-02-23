alter table public.orders
    add column if not exists invoice_id text;

alter table public.orders
    add column if not exists invoice_issued_at timestamptz;

create unique index if not exists orders_invoice_id_unique_idx
    on public.orders (invoice_id)
    where invoice_id is not null;
