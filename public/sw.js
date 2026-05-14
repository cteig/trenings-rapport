const CACHE = "trenings-rapport-v2";

const PRECACHE = ["/", "/aktiviteter", "/wellness"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API-kall og ikke-GET-forespørsler alltid til nettverket
  if (request.method !== "GET" || url.pathname.startsWith("/api/")) {
    return;
  }

  // Navigasjon: nettverk først, fall tilbake til cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () => caches.match(request).then((r) => r ?? caches.match("/"))
      )
    );
    return;
  }

  // Statiske ressurser: cache først, oppdater i bakgrunnen
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      });
      return cached ?? network;
    })
  );
});