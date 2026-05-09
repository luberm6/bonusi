-- Промт 93: флаг "сохранить в историю ремонта" для сообщений из чата
alter table public.messages
  add column if not exists is_repair_history boolean not null default false;

create index if not exists messages_repair_history_idx
  on public.messages (receiver_id, is_repair_history)
  where is_repair_history = true;
