alter table public.users
  add column if not exists car_brand text null,
  add column if not exists car_model text null,
  add column if not exists car_plate text null,
  add column if not exists car_year integer null,
  add column if not exists odometer_km integer null;
