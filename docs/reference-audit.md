# Reference audit — usps.com (public pages)

Performed 2026-10-15 from a Linux workstation with headless Chromium and curl. Only publicly accessible
pages were viewed. No access controls were bypassed and no customer data was requested.

## What was actually inspected

| URL | Method | Result |
| --- | --- | --- |
| `https://www.usps.com/` | curl (HTML, 200) + headless Chromium screenshots at 1440×1000 and 390×1400 | ✅ Inspected |
| `https://www.usps.com/` | WebFetch tool | ❌ Failed (no output) |
| `https://tools.usps.com/go/TrackConfirmAction_input` | WebFetch → HTTP 403; Chromium → Akamai "Access Denied" | ❌ Blocked |
| `https://tools.usps.com/go/TrackConfirmAction?tLabels=<invalid dummy>` | Chromium → Akamai "Access Denied" | ❌ Blocked |

**Not verified:** the tracking input page, tracking result pages, error and empty states for tracking,
multi-number behaviour, and any API. The tracking UX here is designed from general best practice, not copied
from those pages.

## Observations (homepage)

- **Header:** a utility bar (language, Locations, Support, Informed Delivery, Register / Sign In) above the
  main nav (Quick Tools, Send, Receive, Shop, Business, International, Help, search icon). The active
  "Quick Tools" tab has a red diagonal accent. Each menu has a "Search or Enter a Tracking Number" field.
- **Hero:** full-width photo with an overlapping navy text panel and two CTAs ("Get the App", "Learn More").
- **Tracking entry:** "Search or Track Packages", one combined search/tracking input (placeholder
  "Search USPS.com or Enter Tracking Number(s)", `maxlength=256`, `aria-label` "USPS.com Search Bar"),
  icon submit button.
- **Quick tools:** an icon grid (Click-N-Ship, Stamps, Informed Delivery, PO Boxes, Calculate a Price, Hold
  Mail, ZIP Code Lookup, Change My Address, Schedule a Pickup). Three columns on mobile, separated by hairlines.
- **Alerts:** a light-blue callout with a left accent bar. The "USPS Updates" list includes
  **"Alert: Text & Email Scams"**, a reminder that delivery-scam awareness belongs on a tracking site.
- **Footer links:** Privacy Policy, Terms of Use, FOIA, No FEAR Act, Accessibility Statement.
- **Visual language:** navy primary (`#004B87` appears in markup), white surfaces, light-grey bands, bold
  sans-serif headings, generous spacing. Mobile uses a hamburger, centred logo, search icon, and a stacked
  search field.
- **Support entry points:** `/help/contact-us.htm`, `faq.usps.com`, claims, refunds, missing mail.

## What we took (patterns only)

- Tracking as the primary homepage action, prominent and above the fold
- A quick-link grid below the hero, with hairline-separated cells
- A callout style for notices; scam-awareness content
- Utility-style footer with legal links; strong navy-on-white contrast

## What we did **not** take

No USPS logos, eagle mark, wordmarks, product names (Informed Delivery, Click-N-Ship, …), photos,
illustrations, copy, colour-exact palette, or layout replicas. All imagery (logo mark, route illustration,
icons) is original or from open-licence icon sets (Lucide ISC; Simple Icons CC0 for the WhatsApp glyph). The
palette (`#0c2340` navy, `#f2b134` amber) is deliberately distinct.

## Assets legally reusable

None of the reference site's assets are reused. USPS trademarks and creative are proprietary, and no licence
was provided.

## Route inventory derived from the audit

The reference has hundreds of unrelated routes (shop, business, international, passports, …). Only what a
tracking business needs was implemented: home, track, track result, help, contact, privacy, terms, admin. See
`route-inventory.md`.
