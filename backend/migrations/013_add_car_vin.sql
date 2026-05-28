alter table public.users
  add column if not exists car_vin text null;
