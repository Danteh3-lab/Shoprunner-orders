do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'delivery_reminder_email_runs'
      and policyname = 'delivery_reminder_email_runs_select_own'
  ) then
    create policy delivery_reminder_email_runs_select_own
      on public.delivery_reminder_email_runs
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'delivery_reminder_email_runs'
      and policyname = 'delivery_reminder_email_runs_insert_own'
  ) then
    create policy delivery_reminder_email_runs_insert_own
      on public.delivery_reminder_email_runs
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end
$$;