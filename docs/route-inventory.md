# Route Inventory

Comparison of accessible USPS.com public routes against the current Next.js implementation.

---

## Route Map

| Reference URL | Local Route | Purpose | Status |
|---------------|-------------|---------|--------|
| https://www.usps.com/ | `/` | Homepage — hero, quick-tools, featured products | ✅ Exists (improved) |
| https://www.usps.com/track-packages/ | `/track` | Track a package — search form | ✅ Exists |
| https://www.usps.com/track-packages/ (result) | `/track/[trackingNumber]` | Tracking result detail page | ✅ Exists |
| https://www.usps.com/help/ | `/help` | Help center | ✅ Exists (basic) |
| https://www.usps.com/help/contact-us.htm | `/contact` | Contact support / inquiry form | ✅ Exists |
| n/a | `/privacy` | Privacy policy | ✅ Exists |
| n/a | `/terms` | Terms of service | ✅ Exists |
| https://www.usps.com/ship/ | — | Mail & Ship hub | ❌ Not implemented |
| https://www.usps.com/store/ | — | Postal Store (stamps, supplies) | ❌ Not implemented |
| https://www.usps.com/manage/ | — | Track & Manage hub | ❌ Not implemented |
| https://www.usps.com/international/ | — | International shipping | ❌ Not implemented |
| https://www.usps.com/business/ | — | Business shipping | ❌ Not implemented |
| https://www.usps.com/informeddelivery/ | — | Informed Delivery signup | ❌ Not implemented |

---

## Implemented Routes — Detail

### `/` — Homepage
- **Layout**: Full-width hero, quick-tools grid, featured products, postmarks strip
- **Images**: `id26-17.jpg.jpeg` (hero desktop), quick-tool SVGs, featured product JPEGs
- **Interactive**: Search / tracking form embedded, tile navigation
- **Status**: Improved to match USPS structure

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

These routes are part of the USPS public site but are out of scope for the current implementation because they require either official USPS APIs/integrations or are e-commerce flows:

- **Postal Store** (`/store/`) — e-commerce, stamp purchasing
- **Click-N-Ship** — label printing, requires USPS account + postage payment API
- **Business Customer Gateway** — enterprise account system
- **Informed Delivery** — requires USPS account and identity verification
- **International shipping calculator** — requires USPS Rate API
- **Find a Post Office** — requires location database

**These are recorded but will not be implemented** without official USPS API access and operator authorization.

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
