#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required"
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
create table if not exists public.schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);
SQL

while IFS= read -r file; do
  version="$(basename "$file")"
  applied="$(psql "$DATABASE_URL" -Atqc "select 1 from public.schema_migrations where version = '$version' limit 1;")"
  if [[ "$applied" == "1" ]]; then
    echo "[migrate] skip $version"
    continue
  fi

  echo "[migrate] apply $version"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "insert into public.schema_migrations (version) values ('$version');"
done < <(find "migrations" -maxdepth 1 -type f -name "*.sql" | sort)

echo "[migrate] done"
