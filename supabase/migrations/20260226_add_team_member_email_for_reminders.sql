alter table public.team_members
    add column if not exists email text;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'team_members_email_format_chk'
          and conrelid = 'public.team_members'::regclass
    ) then
        alter table public.team_members
            add constraint team_members_email_format_chk
            check (
                email is null
                or email ~* '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
            );
    end if;
end;
$$;

create index if not exists team_members_user_email_idx
    on public.team_members (user_id, email)
    where email is not null;
