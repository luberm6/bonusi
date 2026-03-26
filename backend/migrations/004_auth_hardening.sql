create table if not exists public.auth_login_attempts (
  id bigserial primary key,
  email citext not null,
  ip inet not null,
  fail_count integer not null default 0,
  first_failed_at timestamptz not null default now(),
  last_failed_at timestamptz not null default now(),
  lock_until timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint auth_login_attempts_email_ip_unique unique (email, ip),
  constraint auth_login_attempts_fail_count_chk check (fail_count >= 0)
);

create index if not exists idx_auth_login_attempts_lock_until
  on public.auth_login_attempts(lock_until)
  where lock_until is not null;

create index if not exists idx_auth_login_attempts_last_failed_at
  on public.auth_login_attempts(last_failed_at desc);

drop trigger if exists trg_auth_login_attempts_updated_at on public.auth_login_attempts;
create trigger trg_auth_login_attempts_updated_at
before update on public.auth_login_attempts
for each row execute function public.set_updated_at();
