# usps-discreet — package tracking web application

An independent parcel-tracking website with a staff admin console, built with Next.js (App Router),
TypeScript, Tailwind CSS, Prisma and PostgreSQL (Supabase).

> **Brand notice.** "usps-discreet" is a neutral placeholder. This app is **not** affiliated with USPS or
> any postal service. The visible UI (header, footer, homepage copy, logo) no longer uses USPS's name, logo
> or trademarked service names — see `docs/asset-inventory.md` for exactly what changed and which legacy
> image files from the original scaffold are still unused on disk (not deleted, but not wired into any page;
> remove them before launch). Set your own authorized brand via the `NEXT_PUBLIC_*` variables (see
> `.env.example`) and replace `src/components/layout/logo.tsx` / `src/app/icon.svg` with your own mark.

## Features

- Tracking search with instant client validation, server validation, and a no-JavaScript fallback
- Result page: status, 4-step progress, ordered event timeline in each scan's local time zone, city-level
  origin/destination, and an estimate only when a source is recorded
- **Live carrier tracking**: USPS, DHL and 1,500+ carriers via Ship24, with TrackingMore as an automatic backup. Real API data is synced into the
  database with leases, idempotent reconciliation, backoff and a per-call log (see `docs/integrations.md`)
- Clear states for not found, waiting for carrier, invalid, rate limited, unavailable, and loading
- Quick tools (`/tools`): price quote, pickup booking, shipment booking, delivery-address change and claims.
  Each is a validated form that creates a referenced service request; address changes and claims are checked
  against real shipments
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
npm run admin:create -- --email you@company.com --name "Your Name"   # prompts for a password (min 12 chars)
npm run dev                    # http://localhost:3000  ·  staff console: http://localhost:3000/admin/login
```

No sample data is shown. Create shipments in the admin console (`/admin/shipments/new`); each one gets a
tracking number customers can look up at `/track`. Demo records (`npm run db:seed`) are only for a
separate test database and stay hidden unless `ENABLE_DEMO_DATA=true` is set.

**Live updates:** admin pages re-sync every 10 s (paused while you type or have unsaved form input), the
public tracking result page every 60 s until delivered, and the chat widget every 5 s while open.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Develop, build, serve production build |
| `npm run typecheck` / `lint` | TypeScript (strict) and ESLint |
| `npm test` | Unit tests (Vitest) — includes carrier parsers, detection, schedule and HTTP retry logic |
| `npm run test:integration` | Sync engine against a real PostgreSQL. Set `INTEGRATION_DATABASE_URL` to a **disposable** database with migrations applied |
| `npm run carriers:check -- <number>` | Live call to the carrier APIs with your keys; prints what the site would show (no DB writes) |
| `npm run carriers:sync` | One round of background carrier polling (alternative to the cron endpoint) |
| `npm run test:e2e` | Playwright end-to-end tests (also starts `tests/e2e/mock-carrier.mjs`, a USPS API stand-in, to test carrier sync end to end) (builds must exist; uses `/usr/bin/chromium` — override with `PLAYWRIGHT_CHROMIUM_PATH`). **Writes test chats/inquiries and needs seeded demo shipments — point `DATABASE_URL` at a separate test database, not your live one**, then run `npm run db:seed` there and `tsx scripts/e2e-cleanup.ts` afterwards |
| `npm run db:check` | Connectivity and migration status |
| `npm run db:migrate:deploy` / `db:status` | Apply / inspect migrations |
| `npm run db:seed` | Seed demo records (idempotent) |
| `npm run admin:create` | Create a staff account or reset its password |

To run the admin e2e flow, create a throwaway staff account and export `E2E_ADMIN_EMAIL` /
`E2E_ADMIN_PASSWORD`. Afterwards, `npx tsx scripts/e2e-cleanup.ts` removes only e2e-tagged data, plus the
account if it uses an `@example.test` address.

## Deployment (Vercel)

1. Push the repository to GitHub and import it in Vercel (framework: Next.js, detected automatically).
2. **Environment variables:** Settings → Environment Variables → *Import .env* → paste `vercel.env`.
   That file is git-ignored and holds the production values. Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL`
   to your domain, or delete both: the app then uses Vercel's production URL automatically.
3. Deploy. `vercel.json` runs `npm run vercel-build` (`prisma generate` → `prisma migrate deploy` via
   `DIRECT_URL` → `next build`), so new migrations are applied before each release. Functions run in `dub1`
   (Dublin), next to the Supabase `eu-west-1` database.
4. A daily Vercel Cron calls `/api/cron/sync-shipments`. Vercel sends `CRON_SECRET` automatically. On the
   Pro plan you can raise it to every 10 minutes. Page views also refresh carrier data, so this is a safety net.
5. Do **not** set `ENABLE_DEMO_DATA=true` in production unless you intend to show sample records.

**Database URLs:** `DATABASE_URL` is the Supabase *Transaction pooler* (6543, `pgbouncer=true`,
`connection_limit=1` on Vercel), used by the app. `DIRECT_URL` is the *Session pooler* (5432), used only by
migrations. Both carry `connect_timeout=30`.

See `docs/` for architecture, database, integrations, the route inventory and the reference audit.

## Troubleshooting

- **`P1001 Can't reach database server` while the database is up:** the connection took longer than
  Prisma's 5 s default. Keep `connect_timeout=30` in both URLs. Free Supabase projects also pause after a
  week without use; resume the project in the dashboard.

- **`Can't reach database server` / `Network is unreachable`**: the Supabase direct host is IPv6-only.
  Use the pooler connection string.
- **`Transaction not found` / timeouts**: the database is far from the app. Transactions allow 15 s; deploy
  the app in the same region as the database.
- **`Max client connections reached`**: lower `connection_limit` in `DATABASE_URL`.
- **Can't sign in on a non-default port**: `BETTER_AUTH_URL` must match the origin in the browser.
