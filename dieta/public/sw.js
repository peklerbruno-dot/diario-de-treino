/**
 * O service worker: as notificações e o app abrindo sem internet.
 *
 * As notificações estão no fim do arquivo. O cache segue três regras, as
 * mesmas do Termômetro:
 *
 *  - O que o Next gera com nome carimbado (/_next/static/...) nunca muda de
 *    conteúdo, então vale guardar para sempre e servir do cache direto.
 *  - As páginas são buscadas na rede primeiro, com o cache como rede de
 *    segurança: assim uma versão nova aparece assim que existe, e o metrô sem
 *    sinal ainda abre a última que você viu.
 *  - As chamadas ao servidor (/api/...) nunca são guardadas.
 *
 * O service worker novo assume na abertura seguinte, e não recarrega a página
 * por conta própria: uma refeição em edição não pode se perder porque saiu uma
 * versão nova no meio.
 */

// O nome carrega versão de propósito: `activate` apaga todo cache com nome
// diferente deste, então trocar o número aqui é como se joga fora tudo o que
// ficou guardado de antes.
const CACHE = "dieta-v1";

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
          // Rota nunca visitada, sem internet: leva para "/", que o cache tem.
          if (url.pathname !== "/") return Response.redirect("/", 302);
          return Response.error();
        }),
    );
  }
});

// ---------------------------------------------------------------------------
// Notificações
// ---------------------------------------------------------------------------

/**
 * Chegou um aviso do servidor. O iPhone exige que TODO push mostre uma
 * notificação — um push que chega e não mostra nada faz o iOS cortar a
 * inscrição depois de algumas vezes. Por isso não há caminho aqui que saia sem
 * `showNotification`.
 */
self.addEventListener("push", (evento) => {
  let dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch {
    dados = { corpo: evento.data ? evento.data.text() : "" };
  }
  const titulo = dados.titulo || "Dieta";
  evento.waitUntil(
    self.registration.showNotification(titulo, {
      body: dados.corpo || "",
      icon: "/icone-192.png",
      badge: "/icone-192.png",
      // A mesma tag substitui a anterior em vez de empilhar: o lembrete de água
      // das 15h tira o das 13h30 da tela.
      tag: dados.tag || dados.url || "dieta",
      data: { url: dados.url || "/" },
    }),
  );
});

/** Tocou na notificação: abre o app na refeição (ou traz para a frente, se já aberto). */
self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const destino = new URL(evento.notification.data?.url || "/", self.location.origin).href;
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if (new URL(janela.url).origin === self.location.origin && "focus" in janela) {
          janela.navigate(destino).catch(() => undefined);
          return janela.focus();
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
