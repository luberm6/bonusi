create index if not exists idx_users_role_active on public.users(role, is_active);
create index if not exists idx_users_created_by on public.users(created_by);

create index if not exists idx_devices_user_id on public.devices(user_id);
create unique index if not exists uq_devices_push_token on public.devices(push_token) where push_token is not null;
create index if not exists idx_devices_last_seen on public.devices(last_seen desc);

create index if not exists idx_branches_is_active on public.branches(is_active);
create index if not exists idx_branches_coords on public.branches(lat, lng);

create index if not exists idx_services_is_active on public.services(is_active);
create unique index if not exists uq_services_name on public.services((lower(name)));

create index if not exists idx_visits_client_date on public.visits(client_id, visit_date desc);
create index if not exists idx_visits_admin_date on public.visits(admin_id, visit_date desc);
create index if not exists idx_visits_branch_date on public.visits(branch_id, visit_date desc);
create index if not exists idx_visits_status_date on public.visits(status, visit_date desc);

create index if not exists idx_visit_services_visit_id on public.visit_services(visit_id);
create index if not exists idx_visit_services_service_id on public.visit_services(service_id);
create unique index if not exists uq_visit_services_visit_service
  on public.visit_services(visit_id, service_id) where service_id is not null;

create index if not exists idx_bonus_transactions_client_date on public.bonus_transactions(client_id, created_at desc);
create index if not exists idx_bonus_transactions_admin_date on public.bonus_transactions(admin_id, created_at desc);
create index if not exists idx_bonus_transactions_visit_id on public.bonus_transactions(visit_id);

create index if not exists idx_conversations_client on public.conversations(client_id);
create index if not exists idx_conversations_admin on public.conversations(admin_id);
create index if not exists idx_conversations_updated_at on public.conversations(updated_at desc);

create index if not exists idx_messages_conversation_created_at on public.messages(conversation_id, created_at desc);
create index if not exists idx_messages_receiver_unread on public.messages(receiver_id, created_at desc) where read_at is null;
create index if not exists idx_messages_sender_created_at on public.messages(sender_id, created_at desc);

create index if not exists idx_attachments_message_id on public.attachments(message_id);
create index if not exists idx_message_templates_admin_id on public.message_templates(admin_id);

create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_actor_created_at on public.audit_logs(actor_user_id, created_at desc);
create index if not exists idx_audit_logs_entity_lookup on public.audit_logs(entity_type, entity_id, created_at desc);
create index if not exists idx_audit_logs_payload_gin on public.audit_logs using gin(payload);

create unique index if not exists uq_geocode_cache_source_query_hash on public.geocode_cache(source, query_hash);
create index if not exists idx_geocode_cache_created_at on public.geocode_cache(created_at desc);
create index if not exists idx_geocode_cache_expires_at on public.geocode_cache(expires_at) where expires_at is not null;

create index if not exists idx_refresh_tokens_user_id on public.refresh_tokens(user_id);
create index if not exists idx_refresh_tokens_family_id on public.refresh_tokens(family_id);
create index if not exists idx_refresh_tokens_active on public.refresh_tokens(user_id, device_id, created_at desc) where revoked_at is null;
