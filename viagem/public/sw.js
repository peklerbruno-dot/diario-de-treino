/*
 * O service worker do app: o que o faz abrir sem internet e receber avisos.
 *
 * Cache:
 *  - arquivos do build (/_next/static, ícones): guardados para sempre — o nome
 *    muda a cada versão, então não há risco de ficar com coisa velha;
 *  - páginas e dados de navegação: rede primeiro; sem rede, a última versão
 *    vista. É o que deixa abrir o roteiro e os saldos no metrô sem sinal.
 *  - nada que não seja GET passa por aqui: lançar despesa sem rede é com a
 *    fila do próprio app (ver src/componentes/fila.tsx).
 */
const VERSAO = "v1";
const ESTATICO = `estatico-${VERSAO}`;
const PAGINAS = `paginas-${VERSAO}`;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(ESTATICO).then((c) => c.addAll(["/offline.html", "/icone-192.png"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => ![ESTATICO, PAGINAS].includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // A API não entra no cache — menos os documentos: a passagem tem que abrir
  // no aeroporto mesmo sem sinal.
  if (url.pathname.startsWith("/api/") && !/^\/api\/v\/[^/]+\/documentos\//.test(url.pathname)) return;

  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|webp|ico|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(
        (achado) =>
          achado ||
          fetch(req).then((r) => {
            if (r.ok) caches.open(ESTATICO).then((c) => c.put(req, r.clone()));
            return r;
          }),
      ),
    );
    return;
  }

  // Páginas (e os dados que o Next busca ao trocar de tela): rede primeiro.
  e.respondWith(
    fetch(req)
      .then((r) => {
        if (r.ok && !r.redirected) {
          const copia = r.clone();
          caches.open(PAGINAS).then((c) => c.put(req, copia));
        }
        return r;
      })
      .catch(async () => {
        const achado = await caches.match(req);
        if (achado) return achado;
        if (req.mode === "navigate") return caches.match("/offline.html");
        return new Response("", { status: 503 });
      }),
  );
});

self.addEventListener("push", (e) => {
  let aviso = { titulo: "Viagem", corpo: "", url: "/" };
  try {
    aviso = { ...aviso, ...e.data.json() };
  } catch {}
  e.waitUntil(
    self.registration.showNotification(aviso.titulo, {
      body: aviso.corpo,
      icon: "/icone-192.png",
      badge: "/icone-192.png",
      tag: aviso.marca,
      data: { url: aviso.url },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const alvo = new URL(e.notification.data?.url || "/", location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) {
        if ("focus" in j) {
          j.navigate(alvo);
          return j.focus();
        }
      }
      return self.clients.openWindow(alvo);
    }),
  );
});
