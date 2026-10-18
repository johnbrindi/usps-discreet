/*
 * Service worker: makes the site installable, starts it quickly, shows an offline screen, and shows
 * push notifications to staff (new chats, inquiries, requests — sent by src/server/push.ts).
 * Tracking results, admin pages and API calls are never cached — they must always be live.
 * Bump VERSION to drop old caches after changing this file.
 */
const VERSION = "v2";
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

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "New message", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/maskable-192.png",
      tag: data.tag,
      // A new message in the same conversation alerts again instead of updating silently.
      renotify: Boolean(data.tag),
      data: { url: data.url || "/admin" },
      vibrate: [120, 60, 120],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/admin", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      // Reuse an open admin window (the installed app, or a tab) if there is one.
      const open = windows.find((w) => new URL(w.url).pathname.startsWith("/admin")) || windows[0];
      if (open) return open.navigate(target).then((w) => (w || open).focus());
      return self.clients.openWindow(target);
    }),
  );
});
