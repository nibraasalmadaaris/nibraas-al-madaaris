/* NIBRAAS service worker.
   Rules:
   - Only same-origin GET requests are ever handled. Supabase, fonts, QR images and every other
     cross-origin request go straight to the network, so private school data is never cached here.
   - Requests that carry an Authorization header are never cached.
   - Pages: network first (always the newest app), cached copy only when offline.
   - /assets/* (hashed build files): cache first, they never change under the same name.
   - A new worker waits until the person taps "Cusboonaysii" (see src/registerServiceWorker.js),
     so an update never reloads the page in the middle of a form.
   Change VERSION whenever you change this file; old caches are deleted on activate. */
const VERSION = "v1";
const SHELL_CACHE = `nibraas-shell-${VERSION}`;
const ASSET_CACHE = `nibraas-assets-${VERSION}`;
const SHELL_URLS = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];
const MAX_ASSET_ENTRIES = 120;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // allSettled: one missing file must never make the whole worker fail to install.
      Promise.allSettled(SHELL_URLS.map((url) => cache.add(new Request(url, { cache: "reload" }))))
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("nibraas-") && !keep.has(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i += 1) await cache.delete(keys[i]);
}

function isCacheable(response) {
  if (!response || !response.ok || response.type === "opaque") return false;
  const type = response.headers.get("content-type") || "";
  return !type.includes("text/html"); // a missing file answered with index.html must not be cached as an asset
}

async function networkFirstPage(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh.ok && (fresh.headers.get("content-type") || "").includes("text/html")) {
      cache.put("/", fresh.clone()); // single-page app: every page is the same shell
    }
    return fresh;
  } catch {
    const cached = await cache.match("/");
    if (cached) return cached;
    return new Response(
      "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>" +
        "<body style='font-family:system-ui;padding:2rem;text-align:center'><h2>NIBRAAS</h2>" +
        "<p>Internet ma jiro. Fadlan xiriirka hubi oo dib u day.</p></body>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const fresh = await fetch(request);
  if (isCacheable(fresh)) {
    await cache.put(request, fresh.clone());
    trimCache(ASSET_CACHE, MAX_ASSET_ENTRIES);
  }
  return fresh;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(request);
  const update = fetch(request)
    .then((fresh) => { if (isCacheable(fresh)) cache.put(request, fresh.clone()); return fresh; })
    .catch(() => null);
  return hit || (await update) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.headers.has("Authorization")) return;
  if (url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
  } else if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirstAsset(request));
  } else if (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(staleWhileRevalidate(request));
  }
});
