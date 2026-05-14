#!/usr/bin/env bash

set -euo pipefail

APP_NAME="${APP_NAME:-trenings-rapport}"
ENV_FILE="${ENV_FILE:-/etc/$APP_NAME.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/$APP_NAME}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

if [[ $EUID -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

umask 077

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing environment file '$ENV_FILE'." >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is missing in '$ENV_FILE'." >&2
  exit 1
fi

if [[ "$DATABASE_URL" != file:* ]]; then
  echo "Unsupported DATABASE_URL '$DATABASE_URL'. Expected a SQLite file: URL." >&2
  exit 1
fi

DB_PATH="${DATABASE_URL#file:}"

if [[ ! -f "$DB_PATH" ]]; then
  echo "Database file '$DB_PATH' does not exist." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="$BACKUP_DIR/${APP_NAME}-${timestamp}.db"

sqlite3 "$DB_PATH" ".backup '$backup_file'"
gzip -f "$backup_file"
chmod 600 "${backup_file}.gz"

find "$BACKUP_DIR" -type f -name "${APP_NAME}-*.db.gz" -mtime "+$BACKUP_RETENTION_DAYS" -delete

echo "Created SQLite backup: ${backup_file}.gz"
