# Trenings-rapport

Training log and reporting app for following endurance training over time.

The app is built with Next.js, React, TypeScript, Prisma, and SQLite. Production is currently designed around a single persistent VM, with infrastructure code for UpCloud and script-based bootstrap/deploy flows in this repo.

## Local development

Install dependencies:

```bash
npm ci
```

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Useful scripts

```bash
npm run dev
npm run build
npm run test:run
npm run lint
npm run format
```

## Database

The app uses Prisma with SQLite.

- development default: `file:prisma/dev.db`
- production default fallback: `file:/var/lib/trenings-rapport/dev.db`

Production should normally load `DATABASE_URL` from `/etc/trenings-rapport.env`, but the code also has an explicit production fallback so the runtime does not accidentally point at a repo-local SQLite file.

## Production setup

Production currently runs on one UpCloud VM with:

- Ubuntu 24.04
- Nginx
- systemd
- Node.js 22
- SQLite on persistent disk

Infrastructure code lives in:

- `infra/upcloud/`

Operational scripts live in:

- `scripts/bootstrap-server.sh`
- `scripts/bootstrap-remote.sh`
- `scripts/deploy.sh`
- `scripts/deploy-remote.sh`
- `scripts/backup-sqlite.sh`
- `scripts/install-backup-service.sh`

Detailed production notes and the exact setup history are documented in:

- `docs/upcloud-production-runbook.md`

Quick starting point for infra:

```bash
cd infra/upcloud
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

After Terraform, use the remote scripts from your laptop to bootstrap and deploy the server.

## Private training notes

Local training theory notes live under:

- `treningsteori/`

That directory is intentionally git-ignored and should stay out of the public repository.

## Project notes

- `AGENTS.md` contains repo-specific working instructions for coding agents.
- `infra/upcloud/README.md` explains the infrastructure layout and workflow.
- `docs/upcloud-production-runbook.md` records the production setup and operational commands.
