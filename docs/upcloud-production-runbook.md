# UpCloud production runbook

This document records what we did to provision infrastructure, deploy the app, and fix the production issues that came up along the way.

## Scope

This runbook is for the current production setup of `trenings-rapport.ctekk.io`.

Current shape:

- one UpCloud VM
- Ubuntu 24.04
- Terraform-managed infrastructure in `infra/upcloud/`
- Nginx in front of the app
- `systemd` service for the Next.js server
- SQLite database on persistent disk outside the repo checkout

## Infrastructure code location

Infrastructure is kept in the same repo under:

- `infra/upcloud/`

Supporting operational scripts are under:

- `scripts/bootstrap-server.sh`
- `scripts/bootstrap-remote.sh`
- `scripts/deploy.sh`
- `scripts/deploy-remote.sh`
- `scripts/backup-sqlite.sh`
- `scripts/install-backup-service.sh`

## Infrastructure choices

We chose this approach because the app currently uses Prisma with SQLite and only needs a single small production server.

Important production paths:

- app checkout: `/var/www/trenings-rapport/app`
- SQLite database: `/var/lib/trenings-rapport/dev.db`
- app env file: `/etc/trenings-rapport.env`
- app logs: `/var/log/trenings-rapport`
- SQLite backups: `/var/backups/trenings-rapport`

## Terraform setup

### Fill in `infra/upcloud/terraform.tfvars`

Example values:

```hcl
hostname            = "trenings-rapport"
zone                = "fi-hel1"
plan                = "1xCPU-2GB"
storage_size        = 25
ssh_public_key_path = "/Users/christineteig/.ssh/id_ed25519.pub"
ssh_allowed_cidr    = "<your-public-ip>/32"   # find with: curl -s https://checkip.amazonaws.com

enable_daily_backups = true
backup_time          = "0100"
backup_retention     = 8

labels = {
  app = "trenings-rapport"
  env = "prod"
}
```

### Commands used

```bash
export UPCLOUD_TOKEN="..."
cd infra/upcloud
terraform init
terraform plan
terraform apply
terraform output -raw public_ip_address
```

## DNS setup in Domeneshop

There was already a wildcard record for `*.ctekk.io`. We kept that in place and added a specific record for the new app.

Create an A record:

- host: `trenings-rapport`
- type: `A`
- value: the public IP from Terraform output

Important: a specific DNS record overrides the wildcard record for that host.

## Bootstrap and deploy

### Bootstrap the server

Run from your laptop after Terraform is done:

```bash
cd infra/upcloud
SERVER_IP=$(terraform output -raw public_ip_address)

REPO_URL="https://github.com/cteig/trenings-rapport.git" \
APP_DOMAIN="trenings-rapport.ctekk.io" \
SSH_KEY_PATH="$HOME/.ssh/id_ed25519" \
SERVER_IP="$SERVER_IP" \
../../scripts/bootstrap-remote.sh
```

What bootstrap does:

- installs Node.js 22
- installs Nginx, Certbot, and `sqlite3`
- configures `systemd-resolved` with explicit public DNS resolvers
- creates the app user and persistent directories
- creates `/etc/trenings-rapport.env`
- creates the `trenings-rapport.service` systemd unit
- installs an HTTP Nginx server block

### Deploy the app

Run from your laptop:

```bash
cd infra/upcloud
export SERVER_IP="$(terraform output -raw public_ip_address)"
export SSH_KEY_PATH="$HOME/.ssh/id_ed25519"
export REPO_URL="https://github.com/cteig/trenings-rapport.git"

../../scripts/deploy-remote.sh
```

What deploy does:

- updates the repo checkout on the server
- runs `npm ci`
- runs `npx prisma migrate deploy`
- runs `npx prisma generate`
- runs `npm run build`
- installs and enables the SQLite backup timer
- restarts the app service
- performs a local HTTP health check on `127.0.0.1:$APP_PORT`

## Manual commands we still had to run

### Fix DNS on the server

The server initially had broken name resolution. We fixed it manually before baking it into bootstrap.

Commands used:

```bash
mkdir -p /etc/systemd/resolved.conf.d

cat >/etc/systemd/resolved.conf.d/upcloud.conf <<'EOF'
[Resolve]
DNS=1.1.1.1 8.8.8.8
FallbackDNS=9.9.9.9 1.0.0.1
EOF

systemctl restart systemd-resolved
getent hosts github.com
```

### Fix Nginx `server_name` so Certbot could install the cert

Certbot initially issued the certificate but could not install it because the active Nginx config did not match `trenings-rapport.ctekk.io`.

Commands used:

```bash
cat >/etc/nginx/sites-available/trenings-rapport <<'EOF'
server {
    listen 80;
    server_name trenings-rapport.ctekk.io;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

nginx -t
systemctl reload nginx
```

### Issue and install HTTPS certificate

Commands used on the server:

```bash
certbot --nginx -d trenings-rapport.ctekk.io
```

The certificate was issued successfully, but the installer initially failed because of the Nginx mismatch above. After fixing the server block, the install command succeeded:

```bash
certbot install --cert-name trenings-rapport.ctekk.io
```

## Production bug we hit and fixed

### Symptom

Login failed with:

```text
SQLITE_ERROR: no such table: main.User
```

### Cause

Migrations were applied to:

- `/var/lib/trenings-rapport/dev.db`

but the runtime could fall back to a different relative SQLite path inside the repo checkout if `DATABASE_URL` was missing or not loaded.

### Fix

We changed `src/lib/prisma.ts` so production falls back to the persistent path:

- production: `file:/var/lib/trenings-rapport/dev.db`
- development: `file:prisma/dev.db`

## Backup setup

The deploy script now installs a nightly systemd timer:

- service: `trenings-rapport-backup.service`
- timer: `trenings-rapport-backup.timer`

The backup script:

- reads `DATABASE_URL` from `/etc/trenings-rapport.env`
- creates a SQLite backup using `sqlite3 .backup`
- compresses it with gzip
- stores it under `/var/backups/trenings-rapport`
- deletes old backups after the configured retention period
- writes backups with restrictive permissions

## Important bootstrap behavior

`scripts/bootstrap-server.sh` is meant for first-host setup.

It now refuses to overwrite an existing Nginx site file unless you explicitly run it with:

```bash
ALLOW_NGINX_SITE_OVERWRITE=true
```

That is intentional so a rerun does not wipe a live Certbot-managed HTTPS config by accident.

### Manual test commands

```bash
systemctl start trenings-rapport-backup.service
systemctl status trenings-rapport-backup.timer --no-pager
ls -l /var/backups/trenings-rapport
```

## Useful operational commands

### App logs

```bash
tail -n 100 /var/log/trenings-rapport/app.log
tail -n 100 /var/log/trenings-rapport/app.error.log
```

`journalctl -u trenings-rapport` is still useful for service lifecycle events, but the app stdout/stderr logs are redirected to the files above.

### Nginx logs

```bash
tail -n 100 /var/log/nginx/error.log
tail -n 100 /var/log/nginx/access.log
```

### Service status

```bash
systemctl status trenings-rapport --no-pager
systemctl status nginx --no-pager
```

### Re-deploy after a code change

`REPO_URL` is only needed on first deploy when the repo is not yet checked out on the server. For subsequent deploys it is not required:

```bash
SERVER_IP=185.20.137.230 bash scripts/deploy-remote.sh
```

Or if you want to derive the IP from Terraform:

```bash
cd infra/upcloud
SERVER_IP="$(terraform output -raw public_ip_address)" ../../scripts/deploy-remote.sh
```

## Recommended next maintenance tasks

- test the backup timer once on the live server
- consider adding a restore test procedure for SQLite backups
