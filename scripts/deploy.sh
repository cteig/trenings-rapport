#!/usr/bin/env bash

set -euo pipefail

APP_NAME="${APP_NAME:-trenings-rapport}"
APP_USER="${APP_USER:-trenings}"
APP_BRANCH="${APP_BRANCH:-main}"
APP_HOME="${APP_HOME:-/var/www/$APP_NAME}"
APP_DIR="${APP_DIR:-$APP_HOME/app}"
ENV_FILE="${ENV_FILE:-/etc/$APP_NAME.env}"
REPO_URL="${REPO_URL:-}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

if [[ $EUID -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

if ! id -u "$APP_USER" >/dev/null 2>&1; then
  echo "Missing app user '$APP_USER'. Run bootstrap first." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing environment file '$ENV_FILE'. Run bootstrap first." >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

APP_PORT="${APP_PORT:-3000}"

if [[ ! -d "$APP_DIR/.git" ]]; then
  if [[ -z "$REPO_URL" ]]; then
    echo "Repo checkout missing and REPO_URL not provided." >&2
    exit 1
  fi

  runuser -u "$APP_USER" -- git clone --branch "$APP_BRANCH" "$REPO_URL" "$APP_DIR"
fi

run_as_app_user() {
  runuser -u "$APP_USER" -- /bin/bash -lc "$1"
}

run_as_app_user "set -euo pipefail; cd '$APP_DIR'; git fetch --all --tags; git checkout '$APP_BRANCH'; git pull --ff-only origin '$APP_BRANCH'; npm ci"
run_as_app_user "set -euo pipefail; set -a; source '$ENV_FILE'; set +a; cd '$APP_DIR'; npx prisma migrate deploy; npx prisma generate; npm run build"

BACKUP_RETENTION_DAYS="$BACKUP_RETENTION_DAYS" APP_NAME="$APP_NAME" APP_HOME="$APP_HOME" APP_DIR="$APP_DIR" ENV_FILE="$ENV_FILE" \
  /bin/bash "$APP_DIR/scripts/install-backup-service.sh"

systemctl restart "$APP_NAME"
sleep 2
curl --fail --silent --show-error "http://127.0.0.1:$APP_PORT" >/dev/null
systemctl --no-pager --full status "$APP_NAME"
