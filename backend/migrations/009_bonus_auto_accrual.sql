alter table public.bonus_transactions
  add column if not exists is_auto boolean not null default false;

create unique index if not exists uq_bonus_transactions_auto_accrual_per_visit
  on public.bonus_transactions (visit_id)
  where visit_id is not null and type = 'accrual' and is_auto = true;
