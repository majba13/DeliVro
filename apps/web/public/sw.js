const CACHE_NAME = "delivro-cache-v2";
const STATIC_ASSETS = ["/", "/manifest.json", "/icon-192.svg", "/icon-512.svg"];

function isCacheable(request, response) {
  return (
    request.method === "GET" &&
    response &&
    response.status === 200 &&
    !request.url.includes("/api/")
  );
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNavigation = event.request.mode === "navigate";
  const isApi = url.pathname.startsWith("/api/");

  // API calls and navigations are network-first for fresher data/pages.
  if (isApi || isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Static assets use stale-while-revalidate.
  if (isSameOrigin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (isCacheable(event.request, response)) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return response;
          })
          .catch(() => cached);

        return cached || networkFetch;
      })
    );
    return;
  }

  // Cross-origin requests: best-effort passthrough.
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
