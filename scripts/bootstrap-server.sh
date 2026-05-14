#!/usr/bin/env bash

set -euo pipefail

APP_NAME="${APP_NAME:-trenings-rapport}"
APP_USER="${APP_USER:-trenings}"
APP_GROUP="${APP_GROUP:-$APP_USER}"
APP_BRANCH="${APP_BRANCH:-main}"
APP_HOME="${APP_HOME:-/var/www/$APP_NAME}"
APP_DIR="${APP_DIR:-$APP_HOME/app}"
DATA_DIR="${DATA_DIR:-/var/lib/$APP_NAME}"
LOG_DIR="${LOG_DIR:-/var/log/$APP_NAME}"
ENV_FILE="${ENV_FILE:-/etc/$APP_NAME.env}"
SERVICE_FILE="/etc/systemd/system/$APP_NAME.service"
NGINX_FILE="/etc/nginx/sites-available/$APP_NAME"
APP_DOMAIN="${APP_DOMAIN:-}"
APP_PORT="${APP_PORT:-3000}"
NODE_MAJOR="${NODE_MAJOR:-22}"
REPO_URL="${REPO_URL:-}"
ALLOW_NGINX_SITE_OVERWRITE="${ALLOW_NGINX_SITE_OVERWRITE:-false}"

if [[ $EUID -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

install_base_packages() {
  apt-get update
  apt-get install -y ca-certificates curl git gnupg nginx certbot python3-certbot-nginx sqlite3
}

ensure_dns_resolver() {
  mkdir -p /etc/systemd/resolved.conf.d

  cat >/etc/systemd/resolved.conf.d/upcloud.conf <<'EOF'
[Resolve]
DNS=1.1.1.1 8.8.8.8
FallbackDNS=9.9.9.9 1.0.0.1
EOF

  systemctl restart systemd-resolved
}

install_nodejs() {
  if command -v node >/dev/null 2>&1; then
    local installed_major
    installed_major="$(node -v | sed 's/^v//' | cut -d. -f1)"
    if [[ "$installed_major" == "$NODE_MAJOR" ]]; then
      return
    fi
  fi

  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
}

ensure_app_user() {
  if ! id -u "$APP_USER" >/dev/null 2>&1; then
    useradd --system --create-home --home-dir "$APP_HOME" --shell /bin/bash "$APP_USER"
  fi
}

ensure_directories() {
  mkdir -p "$APP_HOME" "$DATA_DIR" "$LOG_DIR"
  chown -R "$APP_USER:$APP_GROUP" "$APP_HOME" "$DATA_DIR" "$LOG_DIR"
}

ensure_repo_checkout() {
  if [[ -z "$REPO_URL" ]]; then
    return
  fi

  if [[ -d "$APP_DIR/.git" ]]; then
    return
  fi

  rm -rf "$APP_DIR"
  runuser -u "$APP_USER" -- git clone --branch "$APP_BRANCH" "$REPO_URL" "$APP_DIR"
}

ensure_env_file() {
  if [[ -f "$ENV_FILE" ]]; then
    return
  fi

  cat >"$ENV_FILE" <<EOF
NODE_ENV=production
APP_HOST=127.0.0.1
APP_PORT=$APP_PORT
DATABASE_URL=file:$DATA_DIR/dev.db
EOF

  chown root:"$APP_GROUP" "$ENV_FILE"
  chmod 640 "$ENV_FILE"
}

install_systemd_service() {
  cat >"$SERVICE_FILE" <<EOF
[Unit]
Description=$APP_NAME application
After=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_GROUP
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_FILE
Environment=PATH=/usr/local/bin:/usr/bin:/bin
ExecStart=/bin/bash -lc 'exec npm run start -- --hostname "${APP_HOST:-127.0.0.1}" --port "${APP_PORT:-3000}"'
Restart=always
RestartSec=5
StandardOutput=append:$LOG_DIR/app.log
StandardError=append:$LOG_DIR/app.error.log

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable "$APP_NAME"
}

install_nginx_site() {
  local server_name="_"
  if [[ -n "$APP_DOMAIN" ]]; then
    server_name="$APP_DOMAIN"
  else
    echo "APP_DOMAIN is empty. Nginx will use server_name _; rerun bootstrap with APP_DOMAIN before requesting HTTPS." >&2
  fi

  if [[ -f "$NGINX_FILE" && "$ALLOW_NGINX_SITE_OVERWRITE" != "true" ]]; then
    echo "Nginx site '$NGINX_FILE' already exists. Refusing to overwrite it by default." >&2
    echo "Set ALLOW_NGINX_SITE_OVERWRITE=true only if you intentionally want bootstrap to replace the site file." >&2
    return
  fi

  cat >"$NGINX_FILE" <<EOF
server {
    listen 80;
    server_name $server_name;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

  ln -sf "$NGINX_FILE" "/etc/nginx/sites-enabled/$APP_NAME"
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl enable nginx
  systemctl restart nginx
}

install_base_packages
ensure_dns_resolver
install_nodejs
ensure_app_user
ensure_directories
ensure_repo_checkout
ensure_env_file
install_systemd_service
install_nginx_site

echo
echo "Bootstrap complete."
echo "Next step: run scripts/deploy.sh on the server, or use scripts/deploy-remote.sh from your laptop."
