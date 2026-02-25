alter table public.team_members
    drop constraint if exists team_members_email_format_chk;

update public.team_members
set email = nullif(lower(trim(email)), '');

alter table public.team_members
    add constraint team_members_email_format_chk
    check (
        email is null
        or email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    );
