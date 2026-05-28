create table if not exists public.attachment_data (
  file_id uuid primary key,
  file_data bytea not null,
  file_type text not null,
  file_name text not null
);
