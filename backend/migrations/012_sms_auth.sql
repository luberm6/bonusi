alter table public.users
  add column if not exists phone_number text null,
  add column if not exists phone_verified_at timestamptz null,
  add column if not exists last_sms_login_at timestamptz null;

create unique index if not exists uq_users_phone_number on public.users(phone_number) where phone_number is not null;

create table if not exists public.sms_otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  code_hash text not null,
  purpose text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  attempts_count int not null default 0,
  max_attempts int not null default 5,
  provider text null,
  provider_message_id text null,
  ip_address inet null,
  user_agent text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sms_otp_codes_phone on public.sms_otp_codes(phone_number);
create index if not exists idx_sms_otp_codes_expires on public.sms_otp_codes(expires_at);

drop trigger if exists trg_sms_otp_codes_updated_at on public.sms_otp_codes;
create trigger trg_sms_otp_codes_updated_at
before update on public.sms_otp_codes
for each row execute function public.set_updated_at();
