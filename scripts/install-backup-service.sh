#!/usr/bin/env bash

set -euo pipefail

APP_NAME="${APP_NAME:-trenings-rapport}"
APP_HOME="${APP_HOME:-/var/www/$APP_NAME}"
APP_DIR="${APP_DIR:-$APP_HOME/app}"
ENV_FILE="${ENV_FILE:-/etc/$APP_NAME.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/$APP_NAME}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}-backup.service"
TIMER_FILE="/etc/systemd/system/${APP_NAME}-backup.timer"

if [[ $EUID -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

cat >"$SERVICE_FILE" <<EOF
[Unit]
Description=Backup SQLite database for $APP_NAME
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/env APP_NAME=$APP_NAME ENV_FILE=$ENV_FILE BACKUP_DIR=$BACKUP_DIR BACKUP_RETENTION_DAYS=$BACKUP_RETENTION_DAYS /bin/bash $APP_DIR/scripts/backup-sqlite.sh
EOF

cat >"$TIMER_FILE" <<EOF
[Unit]
Description=Run SQLite backup for $APP_NAME every night

[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now "${APP_NAME}-backup.timer"
systemctl restart "${APP_NAME}-backup.timer"
systemctl --no-pager --full status "${APP_NAME}-backup.timer"
