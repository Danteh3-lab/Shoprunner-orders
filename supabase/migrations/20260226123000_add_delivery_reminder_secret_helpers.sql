create or replace function public.get_delivery_reminder_resend_api_key()
returns text
language sql
security definer
set search_path = ''
as $$
    select decrypted_secret
    from vault.decrypted_secrets
    where name = 'delivery_reminder_resend_api_key'
    order by created_at desc
    limit 1;
$$;

create or replace function public.get_delivery_reminder_from_email()
returns text
language sql
security definer
set search_path = ''
as $$
    select decrypted_secret
    from vault.decrypted_secrets
    where name = 'delivery_reminder_from_email'
    order by created_at desc
    limit 1;
$$;

create or replace function public.get_delivery_reminder_app_base_url()
returns text
language sql
security definer
set search_path = ''
as $$
    select decrypted_secret
    from vault.decrypted_secrets
    where name = 'delivery_reminder_app_base_url'
    order by created_at desc
    limit 1;
$$;

revoke all on function public.get_delivery_reminder_resend_api_key() from public;
revoke all on function public.get_delivery_reminder_from_email() from public;
revoke all on function public.get_delivery_reminder_app_base_url() from public;
grant execute on function public.get_delivery_reminder_resend_api_key() to service_role;
grant execute on function public.get_delivery_reminder_from_email() to service_role;
grant execute on function public.get_delivery_reminder_app_base_url() to service_role;

do $$
begin
    if not exists (
        select 1
        from vault.decrypted_secrets
        where name = 'delivery_reminder_app_base_url'
    ) then
        perform vault.create_secret('https://shoprunner.dev', 'delivery_reminder_app_base_url');
    end if;
end;
$$;
