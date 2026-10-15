# Meridian Parcel — package tracking web application

An independent parcel-tracking website with a staff admin console, built with Next.js (App Router),
TypeScript, Tailwind CSS, Prisma and PostgreSQL (Supabase).

> **Brand notice.** "Meridian Parcel" is a neutral placeholder. This app is **not** affiliated with USPS or
> any postal service. The visible UI (header, footer, homepage copy, logo) no longer uses USPS's name, logo
> or trademarked service names — see `docs/asset-inventory.md` for exactly what changed and which legacy
> image files from the original scaffold are still unused on disk (not deleted, but not wired into any page;
> remove them before launch). Set your own authorized brand via the `NEXT_PUBLIC_*` variables (see
> `.env.example`) and replace `src/components/layout/logo.tsx` / `src/app/icon.svg` with your own mark.

## Features

- Tracking search with instant client validation, server validation, and a no-JavaScript fallback
- Result page: status, 4-step progress, ordered event timeline in each scan's local time zone, city-level
  origin/destination, and an estimate only when a source is recorded
- Clear states for not found, invalid, rate limited, unavailable, and loading
- Staff admin (`/admin`): shipments CRUD, lifecycle-enforced event recording, chat inbox, contact inquiries,
  and an audit log
- Floating **Chat with James** widget (stored in the database; staff reply from `/admin/messages`) and a
  **WhatsApp** launcher (`https://wa.me/18603983750`), both fixed bottom-right
- Help centre (statuses, FAQ, scam-awareness), contact form, privacy and terms templates
- Security: rate limiting, honeypot, CSRF checks, security headers/CSP, RLS on Supabase tables, no public sign-up

## Requirements

- Node.js 20+ (developed on Node 24.16 / npm 11)
- A PostgreSQL database (developed against Supabase Postgres 17)

## Setup

```bash
npm install                    # also runs `prisma generate`
cp .env.example .env           # skip if .env already exists; fill in real values
npm run db:check               # verifies connectivity (never prints credentials)
npm run db:migrate:deploy      # applies migrations (additive only)
npm run db:seed                # optional: 3 clearly-labelled DEMO shipments
npm run admin:create -- --email you@company.com --name "Your Name"   # prompts for a password (min 12 chars)
npm run dev                    # http://localhost:3000
```

Sample tracking numbers (development only): `DEMO00000000000001` (in transit), `…02` (delivered),
`…03` (exception).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Develop, build, serve production build |
| `npm run typecheck` / `lint` | TypeScript (strict) and ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Playwright end-to-end tests (builds must exist; uses `/usr/bin/chromium` — override with `PLAYWRIGHT_CHROMIUM_PATH`) |
| `npm run db:check` | Connectivity and migration status |
| `npm run db:migrate:deploy` / `db:status` | Apply / inspect migrations |
| `npm run db:seed` | Seed demo records (idempotent) |
| `npm run admin:create` | Create a staff account or reset its password |

To run the admin e2e flow, create a throwaway staff account and export `E2E_ADMIN_EMAIL` /
`E2E_ADMIN_PASSWORD`. Afterwards, `npx tsx scripts/e2e-cleanup.ts` removes only e2e-tagged data, plus the
account if it uses an `@example.test` address.

## Deployment

1. Provision environment variables from `.env.example` on your host (e.g. Vercel). For serverless, use the
   Supabase **Transaction Pooler** URL (port 6543, `&pgbouncer=true`) as `DATABASE_URL`.
2. Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL` to the public HTTPS origin.
3. Run `npm run db:migrate:deploy` from CI or a trusted machine.
4. `npm run build && npm start` (or the platform's build).
5. Do **not** set `ENABLE_DEMO_DATA=true` in production unless you intend to show sample records.

See `docs/` for architecture, database, integrations, the route inventory and the reference audit.

## Troubleshooting

- **`Can't reach database server` / `Network is unreachable`**: the Supabase direct host is IPv6-only.
  Use the pooler connection string.
- **`Transaction not found` / timeouts**: the database is far from the app. Transactions allow 15 s; deploy
  the app in the same region as the database.
- **`Max client connections reached`**: lower `connection_limit` in `DATABASE_URL`.
- **Can't sign in on a non-default port**: `BETTER_AUTH_URL` must match the origin in the browser.
