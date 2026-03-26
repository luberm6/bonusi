do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('super_admin', 'admin', 'client');
  end if;

  if not exists (select 1 from pg_type where typname = 'device_platform') then
    create type device_platform as enum ('ios', 'android', 'web');
  end if;

  if not exists (select 1 from pg_type where typname = 'visit_status') then
    create type visit_status as enum ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'bonus_transaction_type') then
    create type bonus_transaction_type as enum ('accrual', 'writeoff');
  end if;

  if not exists (select 1 from pg_type where typname = 'message_status') then
    create type message_status as enum ('sent', 'delivered', 'read', 'failed');
  end if;
end
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  password_hash text not null,
  role user_role not null,
  created_by uuid null,
  is_active boolean not null default true,
  last_seen timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_created_by_fk
    foreign key (created_by) references public.users(id) on delete set null
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  platform device_platform not null,
  device_name text null,
  push_token text null,
  app_version text null,
  last_seen timestamptz null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devices_user_fk
    foreign key (user_id) references public.users(id) on delete cascade
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  lat numeric(9, 6) not null,
  lng numeric(9, 6) not null,
  phone text null,
  work_hours jsonb not null default '{}'::jsonb,
  description text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branches_lat_chk check (lat between -90 and 90),
  constraint branches_lng_chk check (lng between -180 and 180)
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text null,
  base_price numeric(12, 2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_base_price_chk check (base_price >= 0)
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  admin_id uuid null,
  branch_id uuid not null,
  status visit_status not null default 'scheduled',
  visit_date timestamptz not null,
  total_amount numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  final_amount numeric(12, 2) not null default 0,
  comment text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visits_client_fk
    foreign key (client_id) references public.users(id) on delete restrict,
  constraint visits_admin_fk
    foreign key (admin_id) references public.users(id) on delete set null,
  constraint visits_branch_fk
    foreign key (branch_id) references public.branches(id) on delete restrict,
  constraint visits_amounts_chk check (
    total_amount >= 0 and
    discount_amount >= 0 and
    final_amount >= 0 and
    final_amount = total_amount - discount_amount
  )
);

create table if not exists public.visit_services (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null,
  service_id uuid null,
  service_name_snapshot text not null,
  price numeric(12, 2) not null,
  quantity numeric(10, 2) not null default 1,
  total numeric(12, 2) generated always as (round(price * quantity, 2)) stored,
  created_at timestamptz not null default now(),
  constraint visit_services_visit_fk
    foreign key (visit_id) references public.visits(id) on delete cascade,
  constraint visit_services_service_fk
    foreign key (service_id) references public.services(id) on delete set null,
  constraint visit_services_price_chk check (price >= 0),
  constraint visit_services_quantity_chk check (quantity > 0)
);

create table if not exists public.bonus_transactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  admin_id uuid null,
  visit_id uuid null,
  type bonus_transaction_type not null,
  amount numeric(12, 2) not null,
  comment text null,
  created_at timestamptz not null default now(),
  constraint bonus_transactions_client_fk
    foreign key (client_id) references public.users(id) on delete restrict,
  constraint bonus_transactions_admin_fk
    foreign key (admin_id) references public.users(id) on delete set null,
  constraint bonus_transactions_visit_fk
    foreign key (visit_id) references public.visits(id) on delete set null,
  constraint bonus_transactions_amount_chk check (amount > 0)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  admin_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_client_fk
    foreign key (client_id) references public.users(id) on delete cascade,
  constraint conversations_admin_fk
    foreign key (admin_id) references public.users(id) on delete restrict,
  constraint conversations_unique_pair unique (client_id, admin_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  sender_id uuid not null,
  receiver_id uuid not null,
  client_message_id uuid not null,
  text text null,
  status message_status not null default 'sent',
  read_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint messages_conversation_fk
    foreign key (conversation_id) references public.conversations(id) on delete cascade,
  constraint messages_sender_fk
    foreign key (sender_id) references public.users(id) on delete restrict,
  constraint messages_receiver_fk
    foreign key (receiver_id) references public.users(id) on delete restrict,
  constraint messages_text_chk check (text is null or length(btrim(text)) > 0),
  constraint messages_client_msg_dedupe unique (sender_id, client_message_id)
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null,
  file_url text not null,
  file_type text not null,
  file_name text not null,
  size bigint not null,
  created_at timestamptz not null default now(),
  constraint attachments_message_fk
    foreign key (message_id) references public.messages(id) on delete cascade,
  constraint attachments_size_chk check (size >= 0)
);

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  title text not null,
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_templates_admin_fk
    foreign key (admin_id) references public.users(id) on delete cascade,
  constraint message_templates_title_nonempty_chk check (length(btrim(title)) > 0),
  constraint message_templates_text_nonempty_chk check (length(btrim(text)) > 0),
  constraint message_templates_unique_title_per_admin unique (admin_id, title)
);

create table if not exists public.audit_logs (
  id bigserial primary key,
  actor_user_id uuid null,
  action text not null,
  entity_type text not null,
  entity_id text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_actor_fk
    foreign key (actor_user_id) references public.users(id) on delete set null,
  constraint audit_logs_action_nonempty_chk check (length(btrim(action)) > 0),
  constraint audit_logs_entity_type_nonempty_chk check (length(btrim(entity_type)) > 0)
);

create table if not exists public.geocode_cache (
  id bigserial primary key,
  query text not null,
  normalized_address text not null,
  lat numeric(9, 6) not null,
  lng numeric(9, 6) not null,
  source text not null default 'nominatim',
  query_hash char(64) generated always as (encode(digest(lower(btrim(query)), 'sha256'), 'hex')) stored,
  raw_payload jsonb null,
  created_at timestamptz not null default now(),
  expires_at timestamptz null,
  constraint geocode_cache_lat_chk check (lat between -90 and 90),
  constraint geocode_cache_lng_chk check (lng between -180 and 180)
);

create table if not exists public.refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  device_id uuid null,
  token_hash text not null unique,
  family_id uuid not null,
  rotated_from_token_id uuid null,
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint refresh_tokens_user_fk
    foreign key (user_id) references public.users(id) on delete cascade,
  constraint refresh_tokens_device_fk
    foreign key (device_id) references public.devices(id) on delete set null,
  constraint refresh_tokens_rotated_from_fk
    foreign key (rotated_from_token_id) references public.refresh_tokens(id) on delete set null,
  constraint refresh_tokens_rotated_from_unique unique (rotated_from_token_id),
  constraint refresh_tokens_expiry_chk check (expires_at > created_at)
);

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists trg_devices_updated_at on public.devices;
create trigger trg_devices_updated_at
before update on public.devices
for each row execute function public.set_updated_at();

drop trigger if exists trg_branches_updated_at on public.branches;
create trigger trg_branches_updated_at
before update on public.branches
for each row execute function public.set_updated_at();

drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

drop trigger if exists trg_visits_updated_at on public.visits;
create trigger trg_visits_updated_at
before update on public.visits
for each row execute function public.set_updated_at();

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

drop trigger if exists trg_message_templates_updated_at on public.message_templates;
create trigger trg_message_templates_updated_at
before update on public.message_templates
for each row execute function public.set_updated_at();
