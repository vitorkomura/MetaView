/* MetaView — service worker: depois da primeira visita o app abre mesmo sem internet.
   Ao publicar uma nova versão dos arquivos, troque o número em CACHE (v1 -> v2). */
const CACHE = "metaview-v1";
const ARQUIVOS = [
  "./mobile.html",
  "./styles.css",
  "./mobile.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ARQUIVOS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) =>
        Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// Responde na hora com o que está salvo e atualiza o arquivo em segundo plano.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const fonte = /(^|\.)(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== self.location.origin && !fonte) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const rede = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === "opaque")) {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(
          () =>
            hit ||
            (req.mode === "navigate"
              ? caches.match("./mobile.html")
              : undefined),
        );
      if (hit) e.waitUntil(rede.catch(() => {}));
      return hit || rede;
    }),
  );
});
