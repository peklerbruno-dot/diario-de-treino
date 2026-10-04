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

// O nome carrega versão de propósito: `activate` apaga todo cache com nome
// diferente deste, então trocar o número aqui é como se joga fora tudo o que
// ficou guardado de antes. Foi preciso quando uma etiqueta do `<head>` mudou e
// a página velha continuou sendo servida do cache — a correção existia no
// servidor e não chegava no aparelho.
const CACHE = "termometro-v5";

// Só resposta BOA entra no cache. Sem este filtro, um 500 do servidor ou o
// redirecionamento para /entrar (sessão vencida) eram guardados POR CIMA da
// última cópia boa — e o modo offline passava a abrir uma tela de erro.
const guardavel = (resposta) => resposta.ok && !resposta.redirected && resposta.type === "basic";

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        // `addAll` guardaria a página de login se o SW novo fosse instalado
        // com a sessão vencida — a mesma envenenação, por outra porta.
        const resposta = await fetch("/");
        if (guardavel(resposta)) await cache.put("/", resposta);
      })
      .catch(() => undefined),
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
            if (guardavel(resposta)) {
              const copia = resposta.clone();
              caches.open(CACHE).then((cache) => cache.put(pedido, copia));
            }
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
          if (guardavel(resposta)) {
            const copia = resposta.clone();
            caches.open(CACHE).then((cache) => cache.put(pedido, copia));
          }
          return resposta;
        })
        .catch(async () => {
          const guardado = await caches.match(pedido);
          if (guardado) return guardado;
          // Rota nunca visitada, sem internet. Servir a tela Hoje AQUI deixava
          // a URL dizendo /totais com o conteúdo de Hoje — mentira dupla. O
          // redirecionamento leva para "/" de verdade, que o cache tem.
          if (url.pathname !== "/") return Response.redirect("/", 302);
          return Response.error();
        }),
    );
  }
});
