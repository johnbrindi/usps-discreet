# Route Inventory

Actual routes implemented in this Next.js app (`src/app/`), generated from the App Router file tree,
not from a competitor's site map. The app started from a USPS.com layout reference; that framing has
been removed (see `docs/reference-audit.md` and `docs/asset-inventory.md` for what changed and why).

---

## Route Map

| Local Route | Purpose | Status |
|---|---|---|
| `/` | Homepage — hero, quick-tools, featured products, drop-off info, service updates | ✅ Exists |
| `/track` | Track a package — search form | ✅ Exists |
| `/track/[trackingNumber]` | Tracking result detail page (live-refreshes every 60 s until delivered) | ✅ Exists |
| `/tools` | Quick tools index | ✅ Exists |
| `/tools/price`, `/tools/pickup`, `/tools/ship`, `/tools/change-address`, `/tools/claim` | Service-request forms (`/tools/[tool]`; unknown slugs → 404). Each submission is stored in `service_requests` with a reference like `PU-7K3M9Q2X` | ✅ Exists |
| `/help` | Help center | ✅ Exists (basic) |
| `/contact` | Contact support / inquiry form | ✅ Exists |
| `/privacy` | Privacy policy | ✅ Exists |
| `/terms` | Terms of service | ✅ Exists |
| `/admin/login` | Staff sign-in | ✅ Exists |
| `/admin` | Staff console home | ✅ Exists |
| `/admin/shipments`, `/admin/shipments/new`, `/admin/shipments/[id]` | Shipment CRUD + event recording | ✅ Exists |
| `/admin/messages`, `/admin/messages/[id]` | Chat inbox + reply | ✅ Exists |
| `/admin/inquiries` | Contact-form inquiries | ✅ Exists |
| `/admin/requests`, `/admin/requests/[id]` | Service-request inbox (filter by type/status), detail, status changes, reply by email | ✅ Exists |
| `/api/auth/[...all]` | Better Auth handler | ✅ Exists |
| `/api/chat` | Visitor chat GET/POST | ✅ Exists |
| `/robots.txt`, `/sitemap.xml`, `/icon.svg` | SEO/metadata routes | ✅ Exists |

Routes that would require a carrier integration, e-commerce, or a government-issued service this
operator cannot legitimately offer (postage sales, PO Box rental, passport appointments, a rate
calculator backed by a real carrier API) are intentionally **not implemented** — see
`docs/integrations.md` for what a real carrier integration needs.

---

## Implemented Routes — Detail

### `/` — Homepage
- **Layout**: Full-width hero, quick-tools grid, featured products, drop-off info strip, service-updates strip
- **Images**: see `docs/asset-inventory.md` for the current, de-branded asset list
- **Interactive**: Search / tracking form embedded, tile navigation
- **Status**: ✅ De-branded — no USPS trademarked service names or copied promotional creative

### `/track` — Track a Package
- **Layout**: Page header + tracking form card + help info
- **Images**: None required
- **Interactive**: Tracking number form with validation, redirect to result
- **Status**: ✅ Working

### `/track/[trackingNumber]` — Tracking Result
- **Layout**: Breadcrumb, result card (status, progress steps, timeline), sidebar
- **Images**: None required
- **Interactive**: Copy tracking number, track another form
- **Status**: ✅ Working

### `/help` — Help Center
- **Layout**: Page header + FAQ sections with anchor links
- **Images**: None required
- **Interactive**: In-page anchor navigation
- **Status**: ✅ Basic (not USPS-style mega-help layout)

### `/contact` — Contact Us
- **Layout**: Page header + contact form (name, email, tracking number, message)
- **Images**: None required
- **Interactive**: Contact form with validation, server action
- **Status**: ✅ Working

---

## Not-Implemented Routes

Out of scope for this app because they require a real carrier account/API, a government-issued
service this operator can't offer, or an e-commerce payment flow:

- **Postage / stamp sales** — requires a licensed postal retailer or carrier reseller agreement
- **PO Box rental, passport appointments** — USPS/government-exclusive services; not something an
  independent tracking company can legitimately sell
- **Label printing with live postage** — requires a carrier account + payment API (e.g. EasyPost, Shippo)
- **Business Customer Gateway** — enterprise account system
- **International shipping rate calculator** — requires a carrier Rate API
- **Find a drop-off location** — requires a location database

**These are recorded but will not be implemented** without the relevant carrier's API access and the
operator's own authorization to resell that service.

---

## Shared Components Used Across Routes

| Component | Routes |
|-----------|--------|
| `SiteHeader` | All public routes |
| `SiteFooter` | All public routes |
| `FloatingWidgets` | All public routes |
| `TrackingForm` | `/`, `/track`, `/track/[tn]` |
| `Container` | All public routes |
| `PageHeader` | `/track`, `/help`, `/contact`, `/privacy`, `/terms` |
