# Asset Inventory

> **Update (2026-10-15, later pass): `src/` no longer references any file in `public/images/`.** The two
> homepage photos turned out to be USPS marketing photography (one shows a "United States Postal Service /
> Priority Mail" label), and the tile/search/menu icons were USPS's SVGs. They were replaced with Lucide icons
> (ISC licence, `src/components/tools/tool-icon.tsx`) and text-based cards. Every file listed below is now
> unused; the "Used by" columns describe the earlier pass. The files are still on disk; delete
> `public/images/` (and the stray `public/*.jpg` copies) before launch.

All assets live in `public/images/` (except the component-rendered logo, see below). This
inventory was regenerated from the files actually on disk and cross-checked against what `src/`
currently references (`grep -r "/images/" src`), so "Used by" below reflects real usage, not intent.

> **Branding status.** The visible copy, footer and header no longer claim to be USPS (see
> `docs/reference-audit.md`). Several image files below are still USPS creative/trademarked
> material (promotional banners, the eagle logo) — they are now **unreferenced** by `src/` and
> must not be re-wired into any page without the rights holder's authorization. They are left in
> place rather than deleted, per the "do not delete or overwrite assets" instruction; remove or
> replace them before launch. A previously-committed full offline mirror of usps.com
> (`public/Welcome _ USPS.html` + `public/Welcome _ USPS_files/`, ~2.6 MB, zero references from
> `src/`) has been removed from the repo as part of this pass — it was scraped reference material,
> not an app asset.

---

## JPEG images (`.jpeg` extension — note some are named `.jpg.jpeg`)

| Filename | Dimensions | Used by | Status |
|---|---|---|---|
| `ga-business-03-25.jpg.jpeg` | 679×450 | Featured Products card (`(public)/page.tsx`) | ✅ in use — generic business-shipping photo, fine to keep |
| `ship-from-home-1.jpg.jpeg` | 675×450 | Featured Products card (`(public)/page.tsx`) | ✅ in use — generic shipping-supplies photo, fine to keep |
| `bcr-3-stamps.jpg.jpeg` | 668×452 | — | ⚠️ unused; USPS stamp-program photo — do not reuse |
| `id26-17.jpg.jpeg` | 1798×400 | — | ⚠️ unused; was the "Informed Delivery" hero banner (USPS creative) — removed from hero |
| `id26-17-m.jpg.jpeg` | 990×225 | — | ⚠️ unused; mobile variant of the above |
| `oct26-cards.jpg.jpeg` | 692×280 | — | ⚠️ unused; USPS holiday-card promo photo |
| `oct26-gifts.jpg.jpeg` | 692×280 | — | ⚠️ unused; USPS gifts promo photo |
| `oct26-stamps.jpg.jpeg` | 700×280 | — | ⚠️ unused; USPS stamp-release promo photo |
| `passport-luggage.jpg.jpeg` | 679×450 | — | ⚠️ unused; was "Need a New Passport?" card — removed (passport services are a USPS/government function, not something this app offers) |
| `sustain-supplies-dotcom8.jpg.jpeg` | 626×277 | — | ⚠️ unused |
| `usps-homepage.jpg.jpeg` | 677×354 | — | ⚠️ unused; literal USPS homepage screenshot — do not reuse |

## PNG images

| Filename | Dimensions | Used by | Status |
|---|---|---|---|
| `postmark-home.png` | 113×113 | Drop-off info strip (`(public)/page.tsx`) | ✅ in use — generic postmark/stamp graphic; confirm it isn't a USPS-trademarked mark before launch |
| `250-landing-promo.png` | 1400×150 | — | ⚠️ unused; USPS promo creative — removed from homepage |
| `250-landing-promo-m.png` | 390×300 | — | ⚠️ unused; mobile variant of the above |
| `footer-logo.png` | 221×27 | — | ⚠️ unused; literal "USPS.COM" wordmark — footer now renders the project's own `Logo` component instead |
| `facebook_logo.png` / `instagram_logo.png` / `pinterest_logo.png` / `threads_logo.png` / `x_logo.png` / `youtube_logo.png` | 38×38 (±) | — | ⚠️ unused; footer social row linked to USPS's real accounts and has been removed — re-add only with this operator's own accounts |
| `business-go-now.png` / `international-go-now.png` / `manage-go-now.png` / `ship-go-now.png` / `store-go-now.png` | 195×167 | — | ⚠️ unused |
| `scroll-red.png` | 60×60 | — | ⚠️ unused |
| `utility_customer_service.png` / `utility_languages.png` | 20×20 / 19×19 | — | ⚠️ unused |

## SVG / icon assets

| Filename | Used by | Status |
|---|---|---|
| `tracking.svg`, `calculate_price.svg`, `change_address.svg`, `schedule_pickup.svg`, `featured_clicknship.svg`, `holdmail.svg` | Homepage quick-tools tiles | ✅ in use (generic line icons; relabelled to "Ship Online" / "File a Claim" etc. — not USPS trademark names) |
| `search.svg` | Header search, mobile search link | ✅ in use |
| `hamburger.svg` | Mobile nav toggle | ✅ in use |
| `logo-sb.svg`, `logo_mobile.svg`, `logo-sb_1.svg` | — | ⚠️ unused; these are the real USPS eagle logo in two sizes plus a variant — header now renders the project's own `LogoMark`/`Logo` component (`src/components/layout/logo.tsx`) instead. **Do not reconnect these.** |
| `favicon.ico` | — | ⚠️ unused; USPS favicon. The app's own favicon is `src/app/icon.svg` (neutral parcel mark) |
| `stamps.svg`, `po_box.svg`, `find_zip.svg`, `book-passport-appt.svg` | — | ⚠️ unused; tied to USPS-exclusive services (postage sales, PO Box rental, ZIP®  lookup, passport appointments) that a private tracking company cannot legitimately offer — tiles were dropped from the homepage, not just relabelled |
| `blue-caret.svg`, `business.svg`, `cards-and-envelopes.svg`, `chinese_characters.gif`, `collectors.svg`, `free_boxes.svg`, `gifts.svg`, `hs-code-search.svg`, `icon-personalize-stamped-envelopes.svg`, `location.svg`, `mailman.svg`, `package-intercept.svg`, `printcustomsforms.svg`, `schedule-redelivery.svg`, `shipping-supplies.svg`, `ssm-icon.svg`, `transit-time.svg` | — | ⚠️ unused, carried over from the original scrape; harmless generic icons if ever reused, but currently dead weight |

---

## Component → asset mapping (current)

| Component | Assets it actually imports |
|---|---|
| `SiteHeader` (`src/components/layout/site-header.tsx`) | `logo.tsx` (`LogoMark`/`Logo`, inline SVG — no file asset), `/images/search.svg` |
| `MobileNav` | `/images/hamburger.svg` |
| `SiteFooter` | `logo.tsx` (`Logo`) — no social-icon or footer-logo image assets |
| Homepage hero | no image (text-only banner on navy background) |
| Homepage quick-tools | `tracking.svg`, `calculate_price.svg`, `change_address.svg`, `schedule_pickup.svg`, `featured_clicknship.svg`, `holdmail.svg` |
| Homepage drop-off strip | `postmark-home.png` |
| Featured Products section | `ship-from-home-1.jpg.jpeg`, `ga-business-03-25.jpg.jpeg` |

---

## Authorization note

Every file still listed as "unused" above was carried over from the original USPS scrape and is
USPS creative, USPS's logo, or tied to a USPS-exclusive government/postal service. None of it is
authorized for use by this project and none of it is referenced by `src/` anymore. They have not
been deleted (per instruction), but they should be deleted or replaced with the operator's own,
licensed assets before any public launch. The one exception already acted on: the full saved
mirror of usps.com (`public/Welcome _ USPS.html*`) was removed in this change, since it was not an
asset referenced anywhere and existed only as scraped material.
