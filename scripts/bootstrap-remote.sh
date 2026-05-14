#!/usr/bin/env bash

set -euo pipefail

SERVER_IP="${SERVER_IP:?Set SERVER_IP to the public IPv4 address from Terraform output.}"
SSH_USER="${SSH_USER:-root}"
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/id_ed25519}"
APP_NAME="${APP_NAME:-trenings-rapport}"
APP_USER="${APP_USER:-trenings}"
APP_BRANCH="${APP_BRANCH:-main}"
APP_DOMAIN="${APP_DOMAIN:-}"
APP_PORT="${APP_PORT:-3000}"
REPO_URL="${REPO_URL:-}"

quote() {
  printf "%q" "$1"
}

ssh -i "$SSH_KEY_PATH" "$SSH_USER@$SERVER_IP" \
  "APP_NAME=$(quote "$APP_NAME") APP_USER=$(quote "$APP_USER") APP_BRANCH=$(quote "$APP_BRANCH") APP_DOMAIN=$(quote "$APP_DOMAIN") APP_PORT=$(quote "$APP_PORT") REPO_URL=$(quote "$REPO_URL") bash -s" \
  <"$(dirname "$0")/bootstrap-server.sh"
