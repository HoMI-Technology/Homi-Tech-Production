/**
 * HōMI service worker
 * ===================
 *
 * Scope: installability + offline resilience. Deliberately conservative —
 * the product is auth-gated and score data must never be stale or leak on
 * shared devices, so:
 *
 *   - Navigations are network-first and NEVER cached; offline falls back
 *     to the precached /offline.html shell. Navigation preload is enabled
 *     so intercepting navigations adds no service-worker boot latency.
 *   - Only immutable build assets (/_next/static/*), fonts, and icons are
 *     cached (cache-first), capped at MAX_ASSET_ENTRIES so content-hashed
 *     assets from old deploys can't grow storage without bound.
 *   - /api/* and /auth/* are never intercepted.
 *   - Web Push: `push` renders the outcome-survey nudge; `notificationclick`
 *     focuses an existing tab or opens the deep link. Inert unless the server
 *     is VAPID-configured and the user has granted permission.
 *
 * Update model: skipWaiting + clients.claim. Safe here because HTML is
 * never cached — a newly activated worker can't strand a page on stale
 * markup; hashed assets referenced by the running page stay fetchable.
 */

// Bumped on icon/OG art changes so the activate handler purges stale caches.
// v4: icon files were renamed to -v2 URLs (cache-bust) so browsers holding a
// stale favicon/touch-icon under the old paths refetch the new compass art.
// v5: icon/OG/splash art redesigned in place (Direction A — depth, variable
// ring weights, canon Inter 900 wordmark). The URLs are unchanged this time,
// so this bump is the ONLY thing that evicts the old art: the fetch handler
// serves precached icons cache-first, and install/addAll only re-runs for a
// new CACHE_VERSION.
const CACHE_VERSION = "homi-v5";
const OFFLINE_URL = "/offline.html";
const MAX_ASSET_ENTRIES = 100;

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icon-v2.svg",
  "/icon-192-v2.png",
  "/icon-512-v2.png",
  "/icon-512-maskable-v2.png",
  "/apple-touch-icon-v2.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)),
          ),
        ),
      self.registration.navigationPreload
        ? self.registration.navigationPreload.enable()
        : Promise.resolve(),
    ]).then(() => self.clients.claim()),
  );
});

function isCacheableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/") ||
    PRECACHE_URLS.includes(url.pathname)
  );
}

/** Evict oldest entries beyond the cap. Precached shell URLs are exempt. */
async function trimCache() {
  const cache = await caches.open(CACHE_VERSION);
  const keys = await cache.keys();
  const evictable = keys.filter((request) => {
    const pathname = new URL(request.url).pathname;
    return !PRECACHE_URLS.includes(pathname);
  });
  const excess = evictable.length - MAX_ASSET_ENTRIES;
  if (excess <= 0) return;
  await Promise.all(evictable.slice(0, excess).map((request) => cache.delete(request)));
}

async function handleNavigation(event) {
  try {
    const preloaded = await event.preloadResponse;
    if (preloaded) return preloaded;
    return await fetch(event.request);
  } catch {
    const cached = await caches.match(OFFLINE_URL);
    return cached ?? Response.error();
  }
}

async function handleAsset(event) {
  const cached = await caches.match(event.request);
  if (cached) return cached;
  try {
    const response = await fetch(event.request);
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(
        caches
          .open(CACHE_VERSION)
          .then((cache) => cache.put(event.request, copy))
          .then(trimCache),
      );
    }
    return response;
  } catch {
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never intercept API/auth. Auth lives at app/auth/* post-i18n removal;
  // the legacy locale-prefixed /es/auth/* guard stays for stale clients.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    /^\/[a-z]{2}\/auth\//.test(url.pathname)
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (isCacheableAsset(url)) {
    event.respondWith(handleAsset(event));
  }
});

// ── Web Push ────────────────────────────────────────────────────────────────
// Payload shape is set by lib/push/send.ts: { title, body, url, tag }.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "HōMI";
  const options = {
    body: data.body || "",
    tag: data.tag || "homi-notification",
    icon: "/icon-192-v2.png",
    badge: "/icon-192-v2.png",
    data: { url: data.url || "/dashboard" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        // Focus an already-open HōMI tab and route it, rather than opening a
        // duplicate window.
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
