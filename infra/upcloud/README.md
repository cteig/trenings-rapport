# UpCloud infrastructure

This directory contains a small Terraform starter for provisioning the production server for this repo on UpCloud.

## Why infra stays in this repo

For this project, keeping infrastructure next to the application code is the simplest choice:

- one app
- one small production environment
- one server
- app and deployment settings evolve together

Move infrastructure to a separate repository later only if you add more apps, multiple environments, or separate infra ownership.

## What this creates

- one UpCloud server
- public and utility network interfaces
- SSH login with a public key
- a basic firewall that allows SSH, HTTP, and HTTPS
- optional daily UpCloud backups on the root disk

It does **not** yet install Node, Nginx, PM2, Certbot, or deploy the application itself. This Terraform layer is only the infrastructure foundation.

## Why this shape fits the current app

The app currently uses:

- Next.js running as a Node server
- Prisma
- SQLite on local disk (`file:prisma/dev.db`)
- local cookie-based session handling

That means the cheapest practical production shape is still a **single persistent VM**, not a stateless platform.

## Recommended default size

Start with:

- `plan = "1xCPU-2GB"`
- `storage_size = 25`

That is a better fit than the very smallest server for this app's build/runtime headroom.

## Prerequisites

1. Install Terraform locally.
2. Create an UpCloud API token.
3. Export the token before running Terraform:

```bash
export UPCLOUD_TOKEN="your-api-token"
```

## If SSH stops working after deploy

The most common cause is that your public IP has changed since the last `terraform apply`. The firewall only allows the IP stored in `terraform.tfvars`.

Check your current IP and update the file:

```bash
curl -s https://checkip.amazonaws.com
# Then edit terraform.tfvars: ssh_allowed_cidr = "<your-ip>/32"
export UPCLOUD_TOKEN="your-api-token"
terraform apply
```

## npm dependency rules for this project

The deploy script runs `npm ci` under the app user's login shell, which has `NODE_ENV=production` set. This means **devDependencies are not installed on the server**.

Any package needed at build time or by Prisma must be in `dependencies`, not `devDependencies`. This includes:

- `prisma` — needed for `migrate deploy` and `generate`
- `@prisma/client` — needed at runtime and during `generate`
- `tailwindcss` and `@tailwindcss/postcss` — needed by the Next.js build
- `typescript` — needed by the Next.js TypeScript check

Keep test-only packages (`vitest`, `@vitejs/plugin-react`) in `devDependencies`.

Also make sure `vitest.config.ts` and test files are excluded in `tsconfig.json`, so the TypeScript build step does not try to resolve vitest types:

```json
"exclude": ["node_modules", "vitest.config.ts", "**/*.test.ts", "**/*.test.tsx"]
```

## Notes on prisma.config.ts

`prisma.config.ts` must not import `dotenv/config`. The deploy script sources `/etc/trenings-rapport.env` before running Prisma, so `DATABASE_URL` is already in the environment. A plain config without the dotenv import is sufficient:

```ts
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});
```

## Usage

```bash
cd infra/upcloud
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and at minimum set:

- `ssh_public_key_path`
- `ssh_allowed_cidr`

Use your own public IP in CIDR format for SSH, for example:

```hcl
ssh_allowed_cidr = "203.0.113.42/32"
```

Then run:

```bash
terraform init
terraform plan
terraform apply
```

Get the server IP after apply:

```bash
terraform output public_ip_address
```

## Next step after Terraform

After the server exists, you do not need to step through the full setup manually anymore.

Run the bootstrap from your laptop:

```bash
SERVER_IP=$(terraform output -raw public_ip_address)
REPO_URL="git@github.com:YOUR-ORG/YOUR-REPO.git" \
APP_DOMAIN="app.example.com" \
SSH_KEY_PATH="$HOME/.ssh/id_ed25519" \
SERVER_IP="$SERVER_IP" \
../../scripts/bootstrap-remote.sh
```

That script will:

- install Node.js 22
- install Nginx and Certbot
- create an app user
- create persistent app/data/log directories
- create `/etc/trenings-rapport.env`
- install a `systemd` service for the app
- install an Nginx site for the domain

Then run the first deploy:

```bash
SERVER_IP=$(terraform output -raw public_ip_address)
REPO_URL="git@github.com:YOUR-ORG/YOUR-REPO.git" \
SSH_KEY_PATH="$HOME/.ssh/id_ed25519" \
SERVER_IP="$SERVER_IP" \
../../scripts/deploy-remote.sh
```

That deploy script will:

- update the repo checkout on the server
- run `npm ci`
- run `npx prisma migrate deploy`
- run `npx prisma generate`
- run `npm run build`
- restart the `systemd` service

The only step still left manual on purpose is HTTPS issuance with Let's Encrypt after DNS is pointed correctly.

Example once DNS is ready:

```bash
ssh -i "$HOME/.ssh/id_ed25519" root@$(terraform output -raw public_ip_address)
certbot --nginx -d app.example.com
```

## Backup note

This app stores SQLite data on the VM. UpCloud daily backups help, and the deploy script now also installs an app-level SQLite backup timer for the database path in `/etc/trenings-rapport.env`.

Bootstrap is intended as first-host setup. By default it now refuses to overwrite an existing Nginx site file, so rerunning it on a live host will not wipe a Certbot-managed config unless you explicitly set `ALLOW_NGINX_SITE_OVERWRITE=true`.

The deploy script now installs a nightly `systemd` timer that runs `scripts/backup-sqlite.sh` and writes compressed backups under `/var/backups/trenings-rapport`.

You can test it manually on the server with:

```bash
systemctl start trenings-rapport-backup.service
systemctl status trenings-rapport-backup.timer --no-pager
ls -l /var/backups/trenings-rapport
```

Application logs are written to:

- `/var/log/trenings-rapport/app.log`
- `/var/log/trenings-rapport/app.error.log`

## Runtime layout created by bootstrap

- app checkout: `/var/www/trenings-rapport/app`
- SQLite data: `/var/lib/trenings-rapport/dev.db`
- logs: `/var/log/trenings-rapport`
- env file: `/etc/trenings-rapport.env`
- service: `trenings-rapport.service`

## Files

- `versions.tf` - Terraform and provider versions
- `variables.tf` - configurable values
- `main.tf` - server and firewall resources
- `outputs.tf` - useful outputs after apply
- `terraform.tfvars.example` - example configuration
- `.gitignore` - ignores local Terraform state and secrets
