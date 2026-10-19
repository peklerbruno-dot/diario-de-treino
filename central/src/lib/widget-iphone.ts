/**
 * O script do widget, para o app Scriptable (grátis na App Store). A Central
 * o monta já com o endereço e a chave; em Ajustes você copia e cola no
 * Scriptable. Ele funciona nos tamanhos pequeno, médio e grande e na tela
 * bloqueada, e se atualiza sozinho a cada 15 minutos (quando o iOS deixa).
 *
 * Tocar no widget abre a Central dentro do próprio Scriptable, em tela cheia.
 * O iOS não deixa um widget abrir um app posto na tela de início pelo
 * navegador: um endereço comum cairia no navegador padrão (o Chrome, no caso).
 */
export function scriptDoWidget(endereco: string, chave: string): string {
  return `// Central — o seu dia num widget.
// Gerado pela Central. Contém a sua chave: não compartilhe.
const APP = ${JSON.stringify(endereco)};
const CHAVE = ${JSON.stringify(chave)};

// Tocar no widget roda este script no app: aí ele abre a Central em tela
// cheia, sem passar pelo navegador. (Na primeira vez, peça o código de acesso.)
if (config.runsInApp && !config.runsInWidget) {
  const tela = new WebView();
  await tela.loadURL(APP);
  await tela.present(true);
  Script.complete();
  return;
}

const familia = config.widgetFamily || "large";
let d;
try {
  const r = new Request(APP + "/api/iphone/hoje?chave=" + encodeURIComponent(CHAVE));
  r.timeoutInterval = 20;
  d = await r.loadJSON();
} catch (e) {
  d = { erro: "Sem conexão agora." };
}

const cor = (claro, escuro) => Color.dynamic(new Color(claro), new Color(escuro));
const FUNDO = cor("#fbfaf8", "#171716");
const TINTA = cor("#1f1e1c", "#edebe6");
const FOSCO = cor("#8a8780", "#85827b");
const VERMELHO = cor("#c4432b", "#ec7a63");

const w = new ListWidget();
w.url = URLScheme.forRunningScript();
w.backgroundColor = FUNDO;
w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);

function texto(onde, t, tamanho, cor, peso) {
  const x = onde.addText(t);
  x.font = peso === "forte" ? Font.semiboldSystemFont(tamanho) : Font.systemFont(tamanho);
  x.textColor = cor;
  x.lineLimit = 1;
  return x;
}

function ponto(onde, hex) {
  const p = onde.addStack();
  p.size = new Size(6, 6);
  p.cornerRadius = 3;
  p.backgroundColor = new Color(hex);
}

if (familia.startsWith("accessory")) {
  // Tela bloqueada: o número e a primeira pendência.
  if (d.erro) texto(w, "Central", 13, Color.white(), "forte");
  else {
    texto(w, d.total + (d.total === 1 ? " pendência" : " pendências") + (d.atrasadas ? " · " + d.atrasadas + " atras." : ""), 13, Color.white(), "forte");
    if (d.pendencias[0]) texto(w, d.pendencias[0].titulo, 12, Color.white()).lineLimit = 2;
  }
} else if (d.erro) {
  texto(w, "Central", 15, TINTA, "forte");
  w.addSpacer(4);
  texto(w, d.erro, 13, FOSCO).lineLimit = 3;
} else {
  const pequeno = familia === "small";
  const grande = familia === "large" || familia === "extraLarge";
  w.setPadding(14, 15, 14, 15);

  const topo = w.addStack();
  topo.centerAlignContent();
  texto(topo, "Hoje", pequeno ? 15 : 16, TINTA, "forte");
  topo.addSpacer();
  texto(topo, String(d.total), 15, d.atrasadas ? VERMELHO : FOSCO, "forte");
  if (!pequeno) {
    texto(w, d.dia, 12, FOSCO);
  }
  w.addSpacer(8);

  const nAgenda = pequeno ? 1 : grande ? 4 : 2;
  for (const e of d.agenda.slice(0, nAgenda)) {
    const l = w.addStack();
    l.centerAlignContent();
    l.spacing = 6;
    texto(l, e.hora, 12, FOSCO).font = Font.monospacedDigitSystemFont(12, 0);
    ponto(l, e.cor);
    texto(l, e.titulo, 13, TINTA);
    w.addSpacer(3);
  }
  if (d.agenda.length) w.addSpacer(6);

  const nPend = pequeno ? 3 : grande ? 9 : 3 - Math.min(1, d.agenda.length > 1 ? 1 : 0);
  for (const p of d.pendencias.slice(0, nPend)) {
    const l = w.addStack();
    l.centerAlignContent();
    l.spacing = 6;
    ponto(l, p.cor);
    texto(l, p.titulo, 13, TINTA);
    if (!pequeno && p.quando) {
      l.addSpacer();
      texto(l, p.quando, 12, p.atrasada || p.quando === "hoje" ? VERMELHO : FOSCO);
    }
    w.addSpacer(4);
  }
  if (!d.total) texto(w, "Nada pendente.", 13, FOSCO);
  const resto = d.total - Math.min(nPend, d.pendencias.length);
  if (resto > 0) texto(w, "+ " + resto + " no app", 12, FOSCO);
  w.addSpacer();
}

Script.setWidget(w);
Script.complete();
`;
}
