#!/bin/bash
# Creates one database per service from the comma-separated
# POSTGRES_MULTIPLE_DATABASES env var. Runs only on first volume init.
# Idempotent per database via the \gexec guard.
set -euo pipefail

create_database() {
  local db="$1"
  echo "  -> ensuring database '$db'"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_USER" <<-EOSQL
    SELECT 'CREATE DATABASE "$db"'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db')\gexec
EOSQL
}

if [ -n "${POSTGRES_MULTIPLE_DATABASES:-}" ]; then
  echo "Creating per-service databases: $POSTGRES_MULTIPLE_DATABASES"
  for db in $(echo "$POSTGRES_MULTIPLE_DATABASES" | tr ',' ' '); do
    create_database "$db"
  done
  echo "Done."
fi
