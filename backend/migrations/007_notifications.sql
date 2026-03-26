create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  sent_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint notifications_user_fk
    foreign key (user_id) references public.users(id) on delete cascade
);

create index if not exists idx_notifications_user_sent
  on public.notifications(user_id, sent_at desc);

create index if not exists idx_notifications_status
  on public.notifications(status);
