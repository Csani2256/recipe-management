const CACHE_NAME = "morzsa-shell-v2";
const ASSETS = [
  "/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png",
  "/images/hero-custom.jpg", "/images/pasta.jpg", "/images/pancakes.jpg",
  "/images/soup.jpg", "/images/salad.jpg", "/images/lasagna.jpg", "/images/cookies.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
    const page = await cache.match("/");
    if (page) {
      const html = await page.text();
      const paths = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^\"]+)"/g)].map((match) => match[1].replaceAll("&amp;", "&"));
      await Promise.all([...new Set(paths)].map((path) => cache.add(path).catch(() => {})));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put("/", copy)));
        }
        return response;
      } catch {
        return (await caches.match("/")) || Response.error();
      }
    })());
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/images/") || url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
      }
      return response;
    })));
  }
});
