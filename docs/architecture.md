# Architecture

## Stack

Next.js 16.4 (App Router, Turbopack) · React 19.3 · TypeScript 5.9 (strict, `noUncheckedIndexedAccess`) ·
Tailwind CSS 4.3 · Prisma 6.19 + PostgreSQL 17 (Supabase) · Better Auth 1.7 · Zod 4 · React Hook Form ·
Lucide icons · Vitest 4 · Playwright 1.64. Package manager: npm.

TypeScript 7 and Prisma 7/8 were available but not chosen. TS 7 (the native port) is too new for the
Next/ESLint toolchain. Prisma 7 requires driver adapters and `prisma.config.ts` and stops reading `.env`;
6.19 is the mature line.

## Layout

```
src/
  app/
    (public)/           public pages share header, footer and floating widgets
      track/[trackingNumber]/   result page + loading skeleton
    admin/login/        staff sign-in
    admin/(console)/    authenticated console (layout calls requireStaffPage)
    api/auth/[...all]/  Better Auth handler
    api/chat/           visitor chat API
  components/{ui,layout,tracking,widgets,forms,admin}
  config/site.ts        brand, contact, support hours (env-overridable)
  domain/               pure logic: status model, tracking numbers, time zones (shared with client + tests)
  validation/           Zod schemas (client + server)
  server/
    tracking/           service (validate → rate limit → provider) + providers/
    actions/            server actions (contact, admin shipments, admin support)
    audit.ts, chat.ts
  lib/                  db, auth, authz, env, logger, rate-limit, support-hours
prisma/                 schema, migrations, seed
scripts/                db-check, create-admin, e2e-cleanup
tests/{unit,e2e}
```

## Key decisions

- **Server components by default.** Client components are limited to: the tracking form, chat widget, mobile
  nav, nav links, copy button, contact/admin forms and login.
- **Tracking provider adapter** (`server/tracking/providers/types.ts`). Pages see only `PublicTrackingResult`,
  which by construction has no recipient name, postcode or notes. `TRACKING_PROVIDER` selects the
  implementation. Only `database` exists; see `integrations.md` for adding a carrier.
- **Status lifecycle** (`domain/shipment-status.ts`) is enforced server-side inside the event transaction.
  Terminal states have no exits. `DELIVERED` is reachable only from `OUT_FOR_DELIVERY`, nothing returns to
  "label created", events must be chronological and not in the future, and `deliveredAt` comes only from a
  recorded Delivered event. Unit tested.
- **Estimates** are shown only when `estimatedDeliveryDate` and `estimateSource` are both set. The schema
  refuses a date without a source.
- **Demo data** is flagged `isDemo`, uses `DEMO` numbers and `DEMO` event source, shows a warning banner, and
  is hidden when `NODE_ENV=production` unless `ENABLE_DEMO_DATA=true`.
- **Time zones:** events store a UTC instant plus an optional IANA zone. The admin enters wall-clock time at
  the location; `zonedLocalToUtc` converts it (DST-safe, tested).
- **Floating widgets** share one fixed container (`--fab-*` CSS variables, safe-area insets, z-index scale
  header 40 < fab 60 < chat 70 < skip-link 100). On ≥640px the chat panel docks above both launchers with a
  height that fits the viewport; below that it is a full-screen sheet. No motion except colour transitions;
  `prefers-reduced-motion` disables transitions.

## Security

| Control | Where |
| --- | --- |
| Server-side validation (Zod) for every input | `validation/*`, actions, `api/chat` |
| SQL injection | Prisma parameterised queries only (`$queryRaw` tagged templates in scripts) |
| XSS | React escaping; no `dangerouslySetInnerHTML`; CSP |
| CSRF | Server actions: Next.js origin check. Better Auth: origin check. `/api/chat`: Origin = Host, JSON only |
| Rate limiting | Tracking 30/min/IP, contact 5/10 min, chat 20/min (`lib/rate-limit.ts`); Better Auth 30/min |
| Spam | Honeypot field + rate limit on contact |
| Enumeration | Generated numbers carry ~66 bits of randomness; lookups rate-limited; results `noindex` |
| Admin auth | Better Auth email/password (scrypt), DB sessions (8 h), sign-up disabled, role check on **every** page and action (`lib/authz.ts`); bound action args re-validated |
| Cookies | httpOnly, SameSite=Lax, Secure in production; chat cookie scoped to `/api/chat`, only its SHA-256 stored |
| Payload limits | Server actions 64 KB; chat 8 KB |
| Headers | CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy; `/admin` no-store |
| Supabase Data API | RLS enabled (no policies) on all app tables, so anon/authenticated API keys can't read them |
| Logging | Structured JSON; no secrets, names, addresses or message bodies |
| Audit | `audit_logs` for shipment/event/chat/inquiry changes and CLI account changes |

**Needs production infrastructure:**
- The rate limiter is in-memory and per instance; use Redis/Upstash for multi-instance deployments.
- Trust `x-forwarded-for` only behind your own proxy.
- `lib/rate-limit.ts` exports a `loginLimiter` that is never imported anywhere — the admin login route
  has no app-level rate limit beyond Better Auth's own built-in one (`rateLimit: { window: 60, max: 30 }`
  in `lib/auth.ts`, i.e. 30 requests/min/IP across all auth endpoints). That's a reasonable baseline but
  is more permissive than the unused `loginLimiter` (10/15 min) was clearly meant to provide — wire it into
  the login route/action, or drop it, rather than leaving it as dead code implying protection that isn't applied.
- CSP uses `'unsafe-inline'` for scripts (Next bootstrap); move to a nonce-based CSP via `proxy.ts` if
  required (this makes all pages dynamic).
- Add a CAPTCHA (e.g. Turnstile) if contact spam appears.
- `npm audit` (2026-10-15): the Prisma CLI's `deepmerge-ts` advisory is fixed through an `overrides` entry
  (8.0.2). The remaining "high" advisory is `braces` ≤3.0.3 (stack exhaustion on hostile glob patterns),
  reached only through `eslint-config-next`, a dev-only lint tool that isn't shipped. No patched `braces`
  exists yet, and npm's suggested fix downgrades to Next 14 tooling, so it is accepted. Re-check periodically.
