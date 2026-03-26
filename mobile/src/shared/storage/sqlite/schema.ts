export const OFFLINE_SQLITE_SCHEMA = `
create table if not exists local_messages (
  local_id text primary key,
  client_message_id text not null unique,
  conversation_id text not null,
  sender_id text not null,
  receiver_id text not null,
  text text not null,
  status text not null check (status in ('sending','sent','failed')),
  server_message_id text null,
  edited_at text null,
  deleted_at text null,
  created_at text not null,
  updated_at text not null
);

alter table local_messages add column if not exists edited_at text null;
alter table local_messages add column if not exists deleted_at text null;

create index if not exists idx_local_messages_conversation_created
  on local_messages (conversation_id, created_at);

create table if not exists pending_actions (
  id text primary key,
  type text not null,
  payload_json text not null,
  status text not null check (status in ('pending','processing','failed')),
  attempts integer not null default 0,
  next_retry_at text null,
  last_error text null,
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_pending_actions_next_retry
  on pending_actions (status, next_retry_at);

create table if not exists branches_cache (
  branch_id text primary key,
  payload_json text not null,
  cached_at text not null
);

create table if not exists visits_cache (
  visit_id text primary key,
  client_id text not null,
  payload_json text not null,
  visit_date text not null,
  cached_at text not null
);

create index if not exists idx_visits_cache_client_date
  on visits_cache (client_id, visit_date desc);

create table if not exists bonus_balance_cache (
  client_id text primary key,
  balance real not null,
  cached_at text not null
);

create table if not exists bonus_history_cache (
  operation_id text primary key,
  client_id text not null,
  payload_json text not null,
  created_at text not null,
  cached_at text not null
);

create index if not exists idx_bonus_history_cache_client_created
  on bonus_history_cache (client_id, created_at desc);
`;
