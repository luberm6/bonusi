do $$
begin
  if not exists (select 1 from pg_type where typname = 'bonus_accrual_mode') then
    create type bonus_accrual_mode as enum ('percentage', 'fixed');
  end if;
end
$$;

create table if not exists public.bonus_settings (
  id uuid primary key default gen_random_uuid(),
  accrual_mode bonus_accrual_mode not null,
  percentage_value numeric(7, 2) null,
  fixed_value integer null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bonus_settings_percentage_chk check (
    (
      accrual_mode = 'percentage'
      and percentage_value is not null
      and percentage_value > 0
      and fixed_value is null
    )
    or (
      accrual_mode = 'fixed'
      and fixed_value is not null
      and fixed_value > 0
      and percentage_value is null
    )
  )
);

create unique index if not exists uq_bonus_settings_single_active
  on public.bonus_settings (is_active)
  where is_active = true;

create index if not exists idx_bonus_settings_active_created_at
  on public.bonus_settings (is_active, created_at desc);

drop trigger if exists trg_bonus_settings_updated_at on public.bonus_settings;
create trigger trg_bonus_settings_updated_at
before update on public.bonus_settings
for each row execute function public.set_updated_at();

insert into public.bonus_settings (accrual_mode, percentage_value, fixed_value, is_active)
select 'percentage', 5.00, null, true
where not exists (select 1 from public.bonus_settings where is_active = true);
