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
 *
 * Update model: skipWaiting + clients.claim. Safe here because HTML is
 * never cached — a newly activated worker can't strand a page on stale
 * markup; hashed assets referenced by the running page stay fetchable.
 */

// Bumped v2 → v3 when the icon/OG art changed to the Threshold Compass + HōMI
// lockup. The activate handler purges non-matching caches, so returning PWA
// users get the new (same-named) icons instead of the stale cached ones.
const CACHE_VERSION = "homi-v3";
const OFFLINE_URL = "/offline.html";
const MAX_ASSET_ENTRIES = 100;

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
  "/apple-touch-icon.png",
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
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (isCacheableAsset(url)) {
    event.respondWith(handleAsset(event));
  }
});
