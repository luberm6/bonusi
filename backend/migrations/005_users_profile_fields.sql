alter table public.users
  add column if not exists full_name text null,
  add column if not exists phone text null,
  add column if not exists notes text null;

create unique index if not exists uq_users_phone on public.users(phone) where phone is not null;
