# Route inventory

Verification refers to the automated Playwright suite (`tests/e2e`, 40 tests, desktop 1366×860 and Pixel 7
mobile) run against a production build on 2026-10-15, plus manual screenshot review.

| Route | Purpose | Rendering | Data | Auth | Status | Verified |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | Home, tracking form, quick links | Static (revalidate 1 h) | — | Public | ✅ | e2e desktop+mobile, screenshots |
| `/track` | Tracking lookup; `?trackingNumber=` no-JS fallback redirects | Dynamic | — | Public | ✅ | e2e incl. JS disabled |
| `/track/[trackingNumber]` | Result: status, progress, timeline | Dynamic, `noindex` | `shipments`, `tracking_events` via provider | Public, rate-limited | ✅ | e2e: found, delivered, exception, not found, invalid, XSS-ish input |
| `/help` | Statuses, FAQ, scam awareness, contact | Static | — | Public | ✅ | e2e |
| `/contact` | Contact form (server action) | Dynamic | `contact_inquiries` | Public, rate-limited, honeypot | ✅ | e2e validation + success |
| `/privacy`, `/terms` | Policy templates | Static | — | Public | ✅ (template text) | e2e |
| `/admin/login` | Staff sign-in | Dynamic | Better Auth | Public | ✅ | e2e wrong creds + success |
| `/admin` | Overview counts, recent events | Dynamic | all | Staff | ✅ | e2e redirect + login |
| `/admin/shipments` | List, search, status filter, pagination (25/page) | Dynamic | `shipments` | Staff | ✅ | e2e redirect; list via workflow |
| `/admin/shipments/new` | Create shipment | Dynamic | `shipments`, `audit_logs` | Staff | ✅ | e2e create + validation |
| `/admin/shipments/[id]` | Edit details, record and remove events | Dynamic | `shipments`, `tracking_events`, `audit_logs` | Staff | ✅ | e2e lifecycle + future-date rejection |
| `/admin/messages`, `/admin/messages/[id]` | Chat inbox, reply as James, close/reopen | Dynamic | `chat_*` | Staff | ✅ | e2e reply |
| `/admin/inquiries` | Contact inquiries, status changes | Dynamic | `contact_inquiries` | Staff | ✅ | e2e redirect; ⚠ status buttons not automated |
| `/api/chat` | Visitor chat GET/POST | Route handler | `chat_*` | Cookie identity; same-origin, 8 KB, rate-limited | ✅ | e2e send/persist, 403 cross-origin, 413 oversized |
| `/api/auth/*` | Better Auth endpoints (sign-up disabled) | Route handler | `users`, `sessions`, `accounts` | — | ✅ | e2e sign-up refused |
| `/robots.txt`, `/sitemap.xml`, `/icon.svg` | SEO / icon | Static | — | Public | ✅ | build output |
| any unknown | 404 page | — | — | — | ✅ | e2e |

Every internal link on `/`, `/help`, `/contact` and `/track` was requested by e2e and returned < 400. No
public browser console errors were recorded on the six main routes.
