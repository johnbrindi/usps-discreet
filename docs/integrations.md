# Integrations

## Carrier tracking — built in (needs your API keys)

Shipments can be **Recorded by staff** (manual scans, as before) or **Live from carrier API**. Carrier-tracked
shipments take every event, status and estimate from the carrier. Staff can't add or remove those events,
so the public page only ever shows what the carrier reported.

| Provider | Covers | Cost | Get credentials |
| --- | --- | --- | --- |
| **USPS** Tracking API v3 | USPS domestic + USPS-origin international | Free | developers.usps.com → create an app → Consumer Key / Secret (`USPS_CLIENT_ID` / `USPS_CLIENT_SECRET`) |
| **DHL** Shipment Tracking – Unified | DHL Express, Parcel, eCommerce, Freight | Free tier (250 calls/day) | developer.dhl.com → My Apps → add "Shipment Tracking – Unified" → API key (`DHL_API_KEY`) |
| **Ship24** | 1,500+ carriers: UPS, FedEx, Royal Mail, Canada Post, national posts | Free: 10 shipments/month (Tracking API, "per-shipment" plan); Pro $39/month for 1,000 | ship24.com → Tracking API → Free → Developers → API keys (`SHIP24_API_KEY`) |
| **TrackingMore** API v4 | 1,300+ carriers, same coverage as Ship24 | Free: 50 shipments/month; paid plans per shipment | trackingmore.com → sign up → Developer → API Key (`TRACKINGMORE_API_KEY`) |

A provider turns on as soon as its credentials are set. Check them with:

```bash
npm run carriers:check                                  # which providers are configured
npm run carriers:check -- <real tracking number>         # live call, prints the normalized events (no DB writes)
npm run carriers:check -- <number> --provider ship24     # force one provider (usps, dhl, ship24, trackingmore)
```

Each carrier's terms of use apply to displaying its data. Read them before launch. Showing a customer's own
parcel status, with the carrier named, is the standard permitted use.

### How it works

- **Detection** (`src/domain/carriers.ts`): the number's format picks the providers to try. USPS IMpb (with
  `420`+ZIP prefixes stripped), UPU S10 with check digit, UPS `1Z`, DHL, and FedEx formats are recognised.
  Anything else goes to the aggregators (Ship24, then TrackingMore).
- **Failover**: if a shipment's provider is out of quota, rejects the key, is down or returns garbage, the
  sync tries the next configured provider for that number's format (direct carrier → Ship24 →
  TrackingMore). The shipment then stays on the provider that answered, and each failed attempt is logged in
  `carrier_sync_logs`. A definite "not found" or "pending" doesn't trigger failover.
- **Clients** (`src/server/carriers/*`): each response is validated with zod and normalized to one shape.
  USPS uses OAuth client-credentials with a cached single-flight token, refreshed once on 401. Unexpected
  shapes become `bad_response`; nothing is invented.
- **HTTP** (`http.ts`): 8 s timeout per attempt, 2 retries with jittered backoff on network/5xx errors,
  `Retry-After` honoured, and a per-provider circuit breaker (5 straight outages → 60 s pause). The
  connect-attempt timeout is raised to 2 s, because Node's 250 ms default fails on high-latency links where
  IPv6 isn't routable.
- **Sync** (`src/server/tracking/sync.ts`): a database **lease** (`sync_lease_until`) means only one worker
  polls a shipment at a time. Events are **reconciled** in one transaction: new scans are inserted
  (unique on `shipment_id, external_id`), scans the carrier withdrew are deleted, and an empty response
  never erases history. Every call is written to `carrier_sync_logs` (kept 30 days).
- **Schedule** (`src/domain/sync-policy.ts`): every `CARRIER_SYNC_INTERVAL_MINUTES` (default 60), every 20 min
  while out for delivery, every 6 h after 3 idle days. Failures back off exponentially (5 min → 12 h).
  Polling stops when the parcel is delivered or returned, after 7 days of "not found", or after 45 days with
  no activity.
- **Read path**: a page view of a due shipment serves stored data immediately and refreshes in the
  background (`after()`). The first view of a never-synced shipment waits up to 9 s for the carrier.
- **Public lookups** (`PUBLIC_CARRIER_LOOKUP=true`, off by default): customers can track any carrier number,
  even one staff never added. Hits are stored (`created_via = PUBLIC_LOOKUP`), so repeat views cost no API
  calls. Misses are cached for 10 min, and a daily cap (`PUBLIC_CARRIER_LOOKUP_DAILY_LIMIT`) protects your
  quota.

### Scheduling background polls

Page views keep viewed shipments fresh. To keep *every* active shipment fresh, call the cron endpoint
every 10–15 minutes:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-site.example/api/cron/sync-shipments
```

- **Vercel Pro**: add `{"crons":[{"path":"/api/cron/sync-shipments","schedule":"*/10 * * * *"}]}` to
  `vercel.json`. Vercel sends `CRON_SECRET` automatically. (The Hobby plan only allows daily crons.)
- **Any host**: a system crontab with the `curl` above, GitHub Actions `schedule`, or an uptime monitor
  that sends the header.
- **No HTTP**: `npm run carriers:sync` runs one round from the server shell.

Staff can always press **Sync now** on a shipment. The admin page shows the last sync, the next scheduled
sync, consecutive failures and the 10 most recent API calls.

## Chat ("Chat with James") — working, built in

- Visitor messages go to `POST /api/chat` and are stored in `chat_messages`. Identity is a random cookie;
  only its hash is stored.
- Staff read and reply at `/admin/messages/[id]`. Replies show as "James". The widget polls every 5 s while
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
