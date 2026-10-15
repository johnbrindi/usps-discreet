# USPS Reference Audit (historical — superseded)

> **Status: superseded.** This file records the USPS.com layout audit used to originally scaffold
> this project. The app has since been de-branded: the USPS wordmark/eagle logo, USPS-exclusive
> service names (Click-N-Ship®, PO Boxes™, ZIP Code™ Lookup, Buy Stamps, passport appointments),
> the real USPS social-media links, and the "Copyright © USPS" footer line have all been removed or
> replaced (see `docs/asset-inventory.md` and `docs/route-inventory.md` for the current state). This
> document is kept only as a provenance record of what was copied and from where — it is not a
> current description of the app and must not be used as a guide for restoring USPS branding.

**Source**: https://www.usps.com/  
**Audited**: 2026-10-15 (mobile viewport 390 px, then scrolled full page)

---

## 1. Header

### Mobile header (observed)
- White background with a red bottom-border strip (~3 px solid red)
- Left: hamburger menu icon (three horizontal lines, dark navy)
- Centre: USPS eagle logo (the "postmark" eagle + `USPS.COM` wordmark) — navy blue eagle on white
- Right: magnifying-glass search icon
- No utility bar visible on mobile

### Desktop header (inferred from USPS public HTML — not directly rendered at desktop width during audit)
- Top utility bar: links for "Sign In / Register", "Español", customer-service phone icon, language icon
- Main nav strip: dark navy/blue (`#003875` approx.) with white text, containing:
  - **Quick Tools** (mega-menu)
  - **Mail & Ship** (mega-menu)
  - **Track & Manage** (mega-menu)
  - **Postal Store** (mega-menu)
  - **Business** (mega-menu)
  - **Informed Delivery** (direct link)
- Below the nav: a full-width search bar with placeholder "Search USPS.com or Enter Tracking Number(s)" + a camera/barcode icon button (blue outline)

### Colors observed
| Element | Value |
|---------|-------|
| Header bg | `#ffffff` |
| Red accent border | `#cc0000` (USPS red) |
| Nav bg (desktop) | `#003875` (USPS navy) |
| Nav text | `#ffffff` |
| Link blue | `#336699` or `#2670a9` |
| Icon fill | `#003875` |

---

## 2. Homepage sections (mobile, top to bottom)

### Section A — Search bar
- Full-width search input (white bg, light border)
- Placeholder: "Search USPS.com or Enter Tracking Number(s)"
- Right-side button with magnifying glass / barcode camera icon
- Background: white, just below the header

### Section B — Hero banner (Informed Delivery)
- Solid dark-navy background (`#003875` approx)
- Full-width
- Headline: "Informed Delivery® at Your Fingertips"
- Two CTAs: "Get the App" (white outline button) | "Learn More" (text link, white, underline)
- No background image; pure colour block

### Section C — Quick-tool tiles (3-column grid)
- Light grey/blue background (`#f5f5f5` / `#e0e0e0` — very subtle)
- 3×3 grid of icon + label tiles (9 tiles in two rows visible)
- Each tile: white cell, centred SVG icon (navy blue, ~48 px), label text below in navy bold
- Tiles observed (exact labels):
  1. Click-N-Ship®
  2. Buy Stamps
  3. Informed Delivery®
  4. PO Boxes™
  5. Calculate a Price
  6. Hold Mail
  7. ZIP Code™ Lookup
  8. Change My Address
  9. Schedule a Pickup
- Tile borders: 1 px solid light grey dividers between cells

### Section D — Postmarks info strip
- Light blue-grey background
- Circular postmark image (left)
- Text: "**Postmarks:** If you want to ensure that your mail receives a postmark on the day you mail it, ask a retail associate at a Post Office retail counter to hand-cancel it for free."
- Link: "Learn more" (navy underline)

### Section E — Featured USPS Products & Services
- White background
- Centred heading: "Featured USPS® Products & Services"
- Carousel / stacked feature cards, each with:
  - Full-width image
  - Title below image
  - CTA button (navy filled, white text, rounded corners)
- Features observed:
  - "Breast Cancer Research First-Class™ Semipostal Stamps" + "Buy Now"
  - "Ship from Home in 3 Easy Steps" + "Use Click-N-Ship"
  - "Need a New Passport?" + "Schedule an Appointment" (passport-luggage.jpg image)
  - Business shipping (ga-business image) + CTA

### Section F — Scam alerts / USPS Updates (observed in footer area)
- White background
- "USPS Updates" heading
- "Alert: Text & Email Scams" warning with link
- "Jobs with USPS" section with "Find Out More" link

---

## 3. Footer

### Footer logo area
- USPS.COM logo (white eagle + blue USPS.COM text) on white background

### Footer columns (4 columns observed)
| Column | Heading | Links |
|--------|---------|-------|
| 1 | HELPFUL LINKS | Contact Us, Site Index, FAQs |
| 1 (sub) | USPS JOBS | Careers |
| 2 | ON ABOUT.USPS.COM | About USPS Home, Newsroom, USPS Service Updates, Forms & Publications, Government Services, Rights & Permissions |
| 3 | OTHER USPS SITES | Business Customer Gateway, Postal Inspectors, Inspector General, Postal Explorer, National Postal Museum, Resources for Developers, PostalPro |
| 4 | LEGAL INFORMATION | Privacy Policy, Terms of Use, FOIA, No FEAR Act/EEO Contacts, Fair Chance Act, Accessibility Statement |

### Copyright
"Copyright © 2026 USPS. All Rights Reserved."

### Social media icons (bottom row)
Facebook, Instagram, Pinterest, Threads, X (Twitter), YouTube

---

## 4. Typography

- Font family: `HelveticaNeue-Light`, `Helvetica Neue`, `Helvetica`, `Arial`, `sans-serif` (USPS custom font stack)
- Body: ~14–16 px
- Headings: bold, 20–28 px range
- Nav items: 14 px, medium/semibold, uppercase-style

---

## 5. Interactive elements

- Tracking input: full-width, white background, blue search button
- CTA buttons: navy blue fill (`#003875`), white text, slight border-radius
- Outline buttons: white fill, navy border, navy text
- Hover on nav: underline or darker bg
- Tile hover: slight bg change

---

## 6. Pages inspected

| URL | Status |
|-----|--------|
| https://www.usps.com/ | ✅ Inspected |
| https://www.usps.com/ship/ | Not inspected (mobile audit only) |
| https://www.usps.com/track-packages/ | Not inspected |
| https://www.usps.com/help/ | Not inspected |
| https://www.usps.com/store/ | Not inspected |

---

## 7. Remaining unknowns

- Desktop mega-menu structure (not rendered at mobile width)
- Exact hex values for all design tokens (estimated from screenshots)
- Promotional banner rotation logic
- Any A/B test variations on homepage
- Tracking result page layout
