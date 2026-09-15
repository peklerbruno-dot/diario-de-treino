/**
 * O que faz o app abrir sem internet.
 *
 * Três regras:
 *
 *  - O que o Next gera com nome carimbado (/_next/static/...) nunca muda de
 *    conteúdo, então vale guardar para sempre e servir do cache direto.
 *  - As páginas são buscadas na rede primeiro, com o cache como rede de
 *    segurança: assim uma versão nova aparece assim que existe, e o metrô sem
 *    sinal ainda abre a última que você viu.
 *  - A sincronização (/api/...) nunca é guardada. Saldo velho servido do cache
 *    seria pior do que dizer que não deu.
 *
 * O service worker novo assume na abertura seguinte, e não recarrega a página
 * por conta própria: um lançamento em digitação não pode se perder porque saiu
 * uma versão nova no meio.
 */

const CACHE = "termometro-v1";

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(["/"]).catch(() => undefined)),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;

  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    evento.respondWith(
      caches.match(pedido).then(
        (guardado) =>
          guardado ??
          fetch(pedido).then((resposta) => {
            const copia = resposta.clone();
            caches.open(CACHE).then((cache) => cache.put(pedido, copia));
            return resposta;
          }),
      ),
    );
    return;
  }

  if (pedido.mode === "navigate") {
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put(pedido, copia));
          return resposta;
        })
        .catch(async () => (await caches.match(pedido)) ?? (await caches.match("/")) ?? Response.error()),
    );
  }
});
