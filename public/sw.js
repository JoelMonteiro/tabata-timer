// =============================================================
// sw.js — service worker: guarda a app em cache para funcionar
// sem internet. Tenta sempre a rede primeiro; se falhar, usa a
// cópia guardada. Só é registado na versão final (ver main.ts).
// =============================================================

const CACHE = "tabata-v1";

// Ativa logo a versão nova do service worker.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") return;
  evento.respondWith(
    fetch(evento.request)
      .then((resposta) => {
        // Guarda uma cópia na cache e devolve a original à página.
        const copia = resposta.clone();
        caches.open(CACHE).then((cache) => cache.put(evento.request, copia));
        return resposta;
      })
      // Sem rede: usa a cache (ou a página inicial).
      .catch(() => caches.match(evento.request).then((r) => r ?? caches.match("/")))
  );
});
