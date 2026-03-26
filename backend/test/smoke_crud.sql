\set ON_ERROR_STOP on

begin;

select gen_random_uuid() as super_admin_id \gset
select gen_random_uuid() as admin_id \gset
select gen_random_uuid() as client_id \gset
select gen_random_uuid() as branch_id \gset
select gen_random_uuid() as service_id \gset
select gen_random_uuid() as visit_id \gset
select gen_random_uuid() as visit_service_id \gset
select gen_random_uuid() as conversation_id \gset
select gen_random_uuid() as message_id \gset
select gen_random_uuid() as message_dup_id \gset
select gen_random_uuid() as template_id \gset
select gen_random_uuid() as device_id \gset
select gen_random_uuid() as refresh_family_id \gset
select gen_random_uuid() as refresh_token_id \gset
select gen_random_uuid() as bonus_id \gset
select gen_random_uuid() as attachment_id \gset
select gen_random_uuid() as cmid \gset
select gen_random_uuid() as cmid_two \gset

insert into public.users (id, email, password_hash, role, is_active)
values (:'super_admin_id', 'superadmin-smoke@example.com', 'hash-super-admin', 'super_admin', true);

insert into public.users (id, email, password_hash, role, created_by, is_active)
values (:'admin_id', 'admin-smoke@example.com', 'hash-admin', 'admin', :'super_admin_id', true);

insert into public.users (id, email, password_hash, role, created_by, is_active)
values (:'client_id', 'client-smoke@example.com', 'hash-client', 'client', :'admin_id', true);

insert into public.devices (id, user_id, platform, device_name, push_token, app_version, is_active)
values (:'device_id', :'client_id', 'ios', 'iPhone smoke', 'push-token-smoke-001', '1.0.0', true);

insert into public.branches (id, name, address, lat, lng, phone, work_hours, description, is_active)
values (
  :'branch_id',
  'Main Branch',
  '123 Service Street',
  40.712776,
  -74.005974,
  '+1-555-0101',
  '{"mon_fri":"09:00-20:00","sat":"10:00-16:00"}'::jsonb,
  'Primary branch for smoke tests',
  true
);

insert into public.services (id, name, description, base_price, is_active)
values (:'service_id', 'Oil Change Smoke', 'Synthetic oil replacement', 120.00, true);

insert into public.visits (
  id, client_id, admin_id, branch_id, status, visit_date,
  total_amount, discount_amount, final_amount, comment
)
values (
  :'visit_id', :'client_id', :'admin_id', :'branch_id', 'scheduled', now() + interval '1 day',
  120.00, 20.00, 100.00, 'Smoke visit'
);

insert into public.visit_services (id, visit_id, service_id, service_name_snapshot, price, quantity)
values (:'visit_service_id', :'visit_id', :'service_id', 'Oil Change Smoke', 120.00, 1.00);

insert into public.bonus_transactions (id, client_id, admin_id, visit_id, type, amount, comment)
values (:'bonus_id', :'client_id', :'admin_id', :'visit_id', 'accrual', 10.00, 'Bonus accrual smoke');

insert into public.conversations (id, client_id, admin_id)
values (:'conversation_id', :'client_id', :'admin_id');

insert into public.messages (
  id, conversation_id, sender_id, receiver_id, client_message_id, text, status
)
values (
  :'message_id', :'conversation_id', :'client_id', :'admin_id', :'cmid', 'Hello from smoke test', 'sent'
);

do $$
declare
  v_message_id uuid := gen_random_uuid();
  v_conversation_id uuid;
  v_sender_id uuid;
  v_receiver_id uuid;
  v_client_message_id uuid;
begin
  select
    m.conversation_id,
    m.sender_id,
    m.receiver_id,
    m.client_message_id
  into
    v_conversation_id,
    v_sender_id,
    v_receiver_id,
    v_client_message_id
  from public.messages m
  where m.text = 'Hello from smoke test'
  limit 1;

  begin
    insert into public.messages (
      id, conversation_id, sender_id, receiver_id, client_message_id, text, status
    )
    values (
      v_message_id, v_conversation_id, v_sender_id, v_receiver_id, v_client_message_id, 'Duplicate should fail', 'sent'
    );
    raise exception 'Duplicate protection for (sender_id, client_message_id) is broken';
  exception when unique_violation then
    null;
  end;
end;
$$;

insert into public.attachments (id, message_id, file_url, file_type, file_name, size)
values (:'attachment_id', :'message_id', 'https://files.example.com/smoke/test.jpg', 'image/jpeg', 'test.jpg', 2048);

insert into public.message_templates (id, admin_id, title, text)
values (:'template_id', :'admin_id', 'Welcome', 'Welcome to our service');

insert into public.geocode_cache (query, normalized_address, lat, lng, source, raw_payload, expires_at)
values (
  '123 Service Street',
  '123 Service Street, NY',
  40.712776,
  -74.005974,
  'nominatim',
  '{"provider":"nominatim"}'::jsonb,
  now() + interval '7 days'
);

insert into public.refresh_tokens (
  id, user_id, device_id, token_hash, family_id, expires_at
)
values (
  :'refresh_token_id', :'client_id', :'device_id', 'hash-refresh-smoke-001', :'refresh_family_id', now() + interval '30 days'
);

insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, payload)
values (
  :'admin_id',
  'visit.create',
  'visits',
  :'visit_id',
  jsonb_build_object('visit_id', :'visit_id', 'source', 'smoke')
);

update public.messages
set status = 'read', read_at = now()
where id = :'message_id';

select gen_random_uuid() as cmid_three \gset
insert into public.messages (
  conversation_id, sender_id, receiver_id, client_message_id, text, status
)
values (
  :'conversation_id', :'admin_id', :'client_id', :'cmid_three', 'Reply from admin', 'delivered'
);

do $$
declare
  c_users int;
  c_visits int;
  c_messages int;
  c_audit int;
begin
  select count(*) into c_users
  from public.users
  where email in ('superadmin-smoke@example.com', 'admin-smoke@example.com', 'client-smoke@example.com');

  select count(*) into c_visits
  from public.visits
  where comment = 'Smoke visit';

  select count(*) into c_messages
  from public.messages
  where text in ('Hello from smoke test', 'Reply from admin');

  select count(*) into c_audit
  from public.audit_logs
  where action = 'visit.create';

  if c_users <> 3 then
    raise exception 'Expected 3 users, got %', c_users;
  end if;
  if c_visits <> 1 then
    raise exception 'Expected 1 visit, got %', c_visits;
  end if;
  if c_messages <> 2 then
    raise exception 'Expected 2 messages, got %', c_messages;
  end if;
  if c_audit < 1 then
    raise exception 'Expected audit log entry';
  end if;
end;
$$;

delete from public.conversations where id = :'conversation_id';

do $$
declare
  left_messages int;
  left_attachments int;
begin
  select count(*) into left_messages
  from public.messages
  where text in ('Hello from smoke test', 'Reply from admin');

  select count(*) into left_attachments
  from public.attachments
  where file_name = 'test.jpg';

  if left_messages <> 0 then
    raise exception 'Conversation cascade delete failed for messages';
  end if;
  if left_attachments <> 0 then
    raise exception 'Message cascade delete failed for attachments';
  end if;
end;
$$;

rollback;
