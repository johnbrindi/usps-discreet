# Backend Agent Prompt — usps-discreet

Paste everything below the line into the backend agent.

---

You are the backend engineer for **usps-discreet**, a Next.js (App Router, TypeScript) site whose public frontend is finished and UI-only. Do **not** redesign the UI or rename routes. Wire the backend so everything works end-to-end, and keep `npx tsc --noEmit` and `npm run build` green. Brand name is `usps-discreet` everywhere (no other brand names in user-facing output: emails, PDFs, API messages, notifications).

## 0. Context (what the frontend already does)
- Env: `NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_BRAND_SHORT_NAME`, `NEXT_PUBLIC_LEGAL_NAME` = `usps-discreet` (`.env`, `.env.example`, `vercel.env`). Keep `src/config/site.ts` as the single config source.
- Public routes already existing: `/`, `/track`, `/track/[trackingNumber]`, `/tools`, `/tools/[tool]` (slugs `price`, `pickup`, `ship`, `change-address`, `claim`), `/help`, `/contact`, `/privacy`, `/terms`, `/summary/[trackingNumber]`, `/offline`.
- Admin: `/admin/login`, `/admin/(console)/{shipments,requests,messages,inquiries}`.
- API: `/api/auth/[...all]`, `/api/chat`, `/api/cron/sync-shipments`.
- **New:** dynamic route `/services/[slug]` (`src/app/(public)/services/[slug]/page.tsx`) driven by `src/config/services.ts` (`getService(slug)`, `allServices()`, type `ServiceDef`). Every top-nav item, quick-tool tile, featured card and update link points here via `serviceHref(slug)`.
- Search bars (header + homepage) submit `?trackingNumber=` to `/track`, and with JS push to `/track/<number>`.
- Public pages have **no** register / sign-up / sign-in. Only the admin console has auth.
- PWA icons were regenerated from the logo: `public/icons/*`, `src/app/icon.png`, `src/app/apple-icon.png`. `public/sw.js` and `manifest` reference them — don't rename.

## 1. Make `/services/[slug]` fully dynamic (DB/CMS backed)
1. Create a `services` table (or CMS collection) matching `ServiceDef`:
   `slug (unique)`, `title`, `summary`, `icon`, `kind` (`category|service`), `children[]` (ordered slugs), `sections[] {heading, body}`, `cta {label, href}`, `related[]`, `published`, `sort_order`, timestamps.
2. Seed it from the current contents of `src/config/services.ts` (24 entries: categories `quick-tools, send, receive, shop, business, international`; services `click-n-ship, buy-stamps, informed-delivery, po-boxes, calculate-price, hold-mail, zip-lookup, change-address, schedule-pickup, redelivery, ground-advantage, shipping-supplies, free-boxes, gifts, cards-envelopes, customs-forms, hs-code-search, eu-requirement, postmarks, jobs, anniversary`).
3. Replace the bodies of `getService()` / `allServices()` with async DB lookups (make them `async`, update the page + `generateStaticParams` + `generateMetadata`). Keep the exported type `ServiceDef` identical. Keep the static config as a fallback if the DB is unreachable.
4. `notFound()` for unknown or unpublished slugs. Revalidate on admin edit (`revalidateTag("services")`).
5. Add services to `src/app/sitemap.ts`.
6. Admin UI: `/admin/(console)/services` list + edit form (CRUD, reorder, publish toggle). Admin-only, behind the existing auth.

## 2. Real flows for services whose CTA currently falls back to `/contact`
Each should become a service-request type like the existing five in `src/config/service-requests.ts` (field defs drive the public form, server validation and admin detail view — follow that pattern exactly, including reference numbers and the `service_requests` table):
- `STAMPS` order (Buy Stamps, Gifts, Cards & Envelopes) — fields: item/collection, quantity, delivery address, contact.
- `PO_BOX` inquiry — size, location/ZIP, start date.
- `HOLD_MAIL` — address, start date, end date (validate end ≥ start, max 30 days).
- `ZIP_LOOKUP` — implement as a **real lookup** (street/city/state → ZIP+4, and ZIP → city/state). Use a geocoding/address API behind a server action; rate-limit it; no persistence needed.
- `SUPPLIES` order (Shipping Supplies, Free Boxes) — items/sizes, quantity, address.
- `REDELIVERY` — tracking number (reuse `tracking` field kind), preferred date.
- `CUSTOMS` / HS-code help — request form or static lookup.
Then update the matching `cta.href` rows in the `services` table to `/tools/<slug>` and register each new type in `TOOLS`, `ServiceRequestType`, validation (`validation/service-request.ts`) and the admin requests views.

## 3. Tracking
- `/track` and `/track/[trackingNumber]` must resolve against the carrier registry in `src/server/carriers/*` plus manually created admin shipments. Normalise input (strip spaces/dashes, uppercase). Return a clear "not found" state, never a 500.
- Verify `/api/cron/sync-shipments` is secured with `CRON_SECRET` and scheduled in `vercel.json`.
- Confirm the `/summary/[trackingNumber]` printable document uses the `usps-discreet` brand.

## 4. Search
The header/home search says "Search or enter tracking number(s)". Implement: if the input looks like a tracking number → go to `/track/<n>`; otherwise → site search. Add `GET /api/search?q=` returning matches from the `services` table (title, summary, slug) and render results at a new `/search?q=` page (create it; use the same `Container`/card styles). Support multiple comma/space-separated tracking numbers by showing a list.

## 5. Notifications, chat, contact
- `/api/chat` and the contact form: store messages, notify support by email (`NEXT_PUBLIC_SUPPORT_EMAIL`) and show them in `/admin/messages`. WhatsApp number comes from `NEXT_PUBLIC_WHATSAPP_NUMBER`.
- Push notifications (`src/components/pwa/*`): ensure VAPID keys, subscription storage and a send endpoint exist; payload icons use `/icons/icon-192.png`.

## 6. Footer social links
Add `NEXT_PUBLIC_SOCIAL_FACEBOOK|X|INSTAGRAM|YOUTUBE|PINTEREST|THREADS` to `.env.example` and `siteConfig.social`. The footer (`src/components/layout/site-footer.tsx`) currently renders the six icons as plain images — wrap each in a link when the env var is set, hide it when not.

## 7. Security, quality, ops
- Zod-validate every input server-side; rate-limit public POST endpoints; CSRF-safe server actions; no PII in logs.
- Admin routes protected by session; seed an admin user via script using env vars (no hard-coded credentials).
- Add DB migrations + seed script (`npm run db:migrate`, `npm run db:seed`).
- Update `tests/e2e/public.spec.ts` for the new brand and add tests: `/services/<each slug>` renders (200), unknown slug 404, tracking search redirects, each new tool form submits and appears in `/admin/requests`.
- Update `README.md` and `.env.example` with every new variable.

## Deliverables
1. Migrations + seed. 2. Async data layer for services. 3. New tool types end-to-end. 4. `/search` page + API. 5. Admin services CRUD. 6. Tests passing. 7. A short CHANGELOG of every new route/API/env var.
