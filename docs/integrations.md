# Integrations

## Carrier tracking — not connected

No carrier API credentials were provided, so no live carrier integration exists. Tracking data comes from the
app's own database: shipments and events recorded by authorized staff (`MANUAL`), plus labelled demo records
(`DEMO`). Nothing is scraped or fabricated.

To add a carrier (e.g. the official USPS Tracking API at developers.usps.com, or UPS, FedEx, DHL, or an
aggregator such as EasyPost or Shippo):

1. Obtain an account, API credentials, and written permission to display the data under **your** brand.
2. Add `src/server/tracking/providers/<carrier>.ts` implementing `TrackingProvider.lookup()`. Map the
   carrier's status codes onto `ShipmentStatus`, return a `PublicTrackingResult` with only public-safe fields,
   and set `source: "CARRIER_API"`.
3. Register it in `server/tracking/service.ts` and the `TRACKING_PROVIDER` enum in `lib/env.ts`. Keep
   credentials in server-only env vars (never `NEXT_PUBLIC_`).
4. Optionally persist carrier events to `tracking_events` with webhooks or a cron sync, so lookups don't hit
   the carrier on every request; add caching (`unstable_cache` / revalidate).

**Needed from you:** which carrier(s), the account and credentials, and the display terms of service.

## Chat ("Chat with James") — working, built in

- Visitor messages go to `POST /api/chat` and are stored in `chat_messages`. Identity is a random cookie;
  only its hash is stored.
- Staff read and reply at `/admin/messages/[id]`. Replies show as "James". The widget polls every 15 s while
  open and the tab is visible.
- The availability indicator comes **only** from configured support hours
  (`NEXT_PUBLIC_SUPPORT_*`, `lib/support-hours.ts`). It never claims James is "online". The widget says
  replies are not instant.
- No automated replies are sent.
- **Real-time upgrade (optional):** Supabase Realtime on `chat_messages` (needs the project URL, anon key
  and RLS policies), Pusher or Ably, or a hosted helpdesk (Intercom, Crisp, Zendesk). Each needs credentials
  from you. Email or push notifications for new chats are not implemented.

## WhatsApp — working

Click-to-chat link `https://wa.me/18603983750` (display `+1 860 398 3750`), opened in a new tab with
`rel="noopener noreferrer"`. Configure it with `NEXT_PUBLIC_WHATSAPP_NUMBER` / `NEXT_PUBLIC_WHATSAPP_DISPLAY`.
The icon is the Simple Icons WhatsApp glyph (CC0), used to label a link to WhatsApp, which Meta's brand
guidelines permit. Whether that number is answered is outside this app.

## Email — not connected

Contact-form replies are sent manually by staff. To send confirmations or notifications, add a provider
(Resend, Postmark or SES) and an API key.
