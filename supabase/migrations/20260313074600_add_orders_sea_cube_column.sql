alter table public.orders
    add column if not exists sea_cube numeric;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'orders_sea_cube_nonnegative_check'
          and conrelid = 'public.orders'::regclass
    ) then
        alter table public.orders
            add constraint orders_sea_cube_nonnegative_check
            check (sea_cube is null or sea_cube >= 0);
    end if;
end
$$;
