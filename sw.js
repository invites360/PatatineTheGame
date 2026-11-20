// =============================================================
//  Service worker: rende il gioco installabile e veloce.
//  - file del gioco: serviti dalla cache e aggiornati in background
//  - Supabase (voti, bonus, admin): MAI in cache, sempre dal vivo
//  Quando pubblichi modifiche importanti, alza VERSION.
// =============================================================
const VERSION = "gp-v1";
const SHELL = [
  "./",
  "index.html",
  "manifest.json",
  "css/style.css",
  "js/config.js",
  "js/players.js",
  "js/store.js",
  "js/toon.js",
  "js/app.js",
  "audio/fighter_select.mp3",
  "img/icons/icon-192.png",
  "img/icons/apple-touch-icon.png",
  "img/faces/Peppe_Troise.png",
  "img/faces/Checco_LaBarbera.png",
  "img/faces/Claudia_Ottaviano.png",
  "img/faces/Emanuele_Ferrante.png",
  "img/faces/Guido_Coppola.png",
  "img/faces/Marianna_meta.png",
  "img/faces/Martina_Murat.png",
  "img/faces/Yoel_Federico_Soimer.png",
];
// librerie e font da CDN: si possono mettere in cache
const CDN_HOSTS = ["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !CDN_HOSTS.includes(url.hostname)) return; // Supabase & co: rete diretta
  if (req.headers.has("range")) return; // audio in streaming: lascia fare al browser

  // stale-while-revalidate: risposta immediata dalla cache, aggiornamento in background
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: sameOrigin && req.mode === "navigate" });
      const fresh = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
