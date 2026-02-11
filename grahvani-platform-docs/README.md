# Grahvani Platform Documentation

> Complete knowledge base for the Grahvani platform — architecture, deployment, operations, and development.

Last updated: 2026-02-11

## What is Grahvani?

Professional astrology SaaS platform for astrologers — CRM, chart calculations, client management, AI-powered insights. Built as a microservice architecture deployed on self-hosted infrastructure (KVM4 via Coolify).

## Security Note

All secrets, credentials, and connection strings are stored in the `.env` file (gitignored) and Coolify dashboard. These docs reference them as `$VARIABLE_NAME` or `<placeholder>` — never commit real values to this folder.

## Documentation Index

| # | Document | Description |
|---|----------|-------------|
| 1 | [Architecture](./01-architecture.md) | System design, microservices, tech stack, data flow |
| 2 | [Infrastructure](./02-infrastructure.md) | KVM4 server, Coolify, Traefik, DNS, memory allocation |
| 3 | [Deployment](./03-deployment.md) | How services are deployed, Dockerfiles, Coolify config |
| 4 | [CI/CD Pipeline](./04-ci-cd.md) | GitHub Actions, automated testing, deploy triggers |
| 5 | [Database](./05-database.md) | PostgreSQL setup, schemas, Prisma, migrations, backups |
| 6 | [Services Reference](./06-services.md) | Each microservice detailed -- endpoints, config, health |
| 7 | [Environment Variables](./07-environment.md) | Complete env var reference per service |
| 8 | [Monitoring & Health](./08-monitoring.md) | Health checks, monitoring, logging, alerting |
| 9 | [Developer Guide](./09-developer-guide.md) | Local setup, running services, debugging, workflows |
| 10 | [Troubleshooting](./10-troubleshooting.md) | Common issues, fixes, operational runbook |

## Quick Links
- Backend repo: `Project-Corp-Astro/grahvani-backend` (branch: main)
- Frontend repo: `Project-Corp-Astro/frontend-grahvani-software` (branch: main)
- Production: https://grahvani.in
- Coolify Dashboard: http://147.93.30.201:8000
- API Auth: https://api-auth.grahvani.in
- API User: https://api-user.grahvani.in
- API Client: https://api-client.grahvani.in
- API Astro: https://api-astro.grahvani.in

## Team & Access
- GitHub Org: Project-Corp-Astro
- Cloud: DigitalOcean (KVM4 Droplet)
- DNS: Cloudflare (grahvani.in zone)
- Backups: Daily 2AM + Weekly Sunday 3AM (PostgreSQL)
