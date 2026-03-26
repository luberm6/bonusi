create index if not exists idx_messages_conversation_text_tsv
  on public.messages using gin (to_tsvector('simple', coalesce(text, '')))
  where text is not null;
