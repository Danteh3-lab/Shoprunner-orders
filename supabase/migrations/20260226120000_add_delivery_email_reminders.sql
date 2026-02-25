create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.delivery_reminder_email_runs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    week_key text not null,
    reminder_fingerprint text not null,
    recipient_email text not null,
    order_count integer not null check (order_count >= 0),
    status text not null check (status in ('sent', 'failed')),
    provider_message_id text,
    error_message text,
    sent_at timestamptz not null default now()
);

create index if not exists delivery_reminder_email_runs_user_week_idx
    on public.delivery_reminder_email_runs (user_id, week_key, sent_at desc);

create index if not exists delivery_reminder_email_runs_sent_at_idx
    on public.delivery_reminder_email_runs (sent_at desc);

create unique index if not exists delivery_reminder_email_runs_sent_unique_idx
    on public.delivery_reminder_email_runs (user_id, week_key, reminder_fingerprint)
    where status = 'sent';

alter table public.delivery_reminder_email_runs enable row level security;

create or replace function public.get_delivery_reminder_cron_secret()
returns text
language sql
security definer
set search_path = ''
as $$
    select decrypted_secret
    from vault.decrypted_secrets
    where name = 'delivery_reminder_cron_secret'
    order by created_at desc
    limit 1;
$$;

revoke all on function public.get_delivery_reminder_cron_secret() from public;
grant execute on function public.get_delivery_reminder_cron_secret() to service_role;

do $$
begin
    if not exists (
        select 1
        from vault.decrypted_secrets
        where name = 'delivery_reminder_cron_secret'
    ) then
        perform vault.create_secret(
            encode(gen_random_bytes(32), 'hex'),
            'delivery_reminder_cron_secret'
        );
    end if;
end;
$$;
