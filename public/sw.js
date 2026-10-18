/*
 * Service worker: makes the site installable, starts it quickly, and shows an offline screen.
 * Tracking results, admin pages and API calls are never cached — they must always be live.
 * Bump VERSION to drop old caches after changing this file.
 */
const VERSION = "v1";
const STATIC_CACHE = `meridian-static-${VERSION}`;
const PAGE_CACHE = `meridian-pages-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png", "/apple-icon.png"];
/** Public pages that change rarely; served from cache when the network is down. */
const CACHEABLE_PAGES = ["/", "/track", "/help", "/contact", "/tools", "/privacy", "/terms"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC_CACHE, PAGE_CACHE].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // map tiles etc. use the browser's own cache
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api")) return;

  // Build assets have content-hashed names: cache forever.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    const cacheable = CACHEABLE_PAGES.includes(url.pathname);
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (cacheable && res.ok) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => (cacheable && (await caches.match(url.pathname))) || caches.match(OFFLINE_URL)),
    );
  }
});
