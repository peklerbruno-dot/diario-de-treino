// =====================================================================
// SIMULADOR 3D DO APARTAMENTO — aplicação
// =====================================================================
// Seções (procure pelo número):
//   1. Configuração                 7. Colisões
//   2. Documento e histórico        8. Seleção e arraste
//   3. Geometria da planta          9. Painéis e barra
//   4. Cena 3D                     10. Arquivos (salvar, JSON, PNG, .glb)
//   5. Paredes, aberturas e pisos  11. Extensões futuras
//   6. Móveis                      12. Início
// Dados: PLANTA_ORIGINAL, CENARIOS_ORIGINAIS (planta.js) e CATALOGO (catalogo.js).
// =====================================================================
(() => {
'use strict';
const T = window.THREE;
const $ = (s) => document.querySelector(s);

// =====================================================================
// 1. CONFIGURAÇÃO
// =====================================================================
const CFG = {
  grade: 5,                 // encaixe de móveis e paredes (cm)
  chave: 'simulador-apto:v1',
  alturaCorte: 110,         // altura das paredes no modo "cortar paredes"
  tolColisao: 0.5,          // sobreposição mínima (cm) para contar como colisão
  corSel: 0x2f80ed,
  corColisao: 0xe5484d,
};

const PISOS = {
  madeira:     { nome: 'Madeira' },
  ceramica:    { nome: 'Cerâmica 30×30' },
  porcelanato: { nome: 'Porcelanato 60×60' },
  cimento:     { nome: 'Cimento queimado' },
};

const TIPOS_ABERTURA = { janela: 'Janela', porta: 'Porta', correr: 'Porta de correr' };

// =====================================================================
// 2. DOCUMENTO E HISTÓRICO
// =====================================================================
// O "documento" é tudo o que é salvo: a planta (compartilhada pelos
// cenários), os cenários com seus móveis e os móveis importados.
const clonar = (o) => JSON.parse(JSON.stringify(o));
let seq = 0;
const novoId = (p) => `${p}-${Date.now().toString(36)}${(seq++).toString(36)}`;

let doc = null;
let sel = null; // { tipo: 'movel' | 'parede' | 'ambiente', id }

function defCatalogo(tipo) {
  return CATALOGO.find((c) => c.tipo === tipo) || (doc?.catalogoExtra || []).find((c) => c.tipo === tipo);
}
const cen = () => doc.cenarios[doc.ativo];
const movel = (id) => cen().moveis.find((m) => m.id === id);
const parede = (id) => doc.planta.paredes.find((w) => w.id === id);
const ambiente = (id) => doc.planta.ambientes.find((a) => a.id === id);

function prepararMovel(m) {
  const def = defCatalogo(m.tipo) || { dim: { l: 50, p: 50, a: 50 }, cores: {}, nome: m.tipo };
  m.id = m.id || novoId('m');
  m.rot = (((m.rot || 0) % 360) + 360) % 360;
  m.l ??= def.dim.l; m.p ??= def.dim.p; m.a ??= def.dim.a;
  m.cores = Object.assign({}, def.cores, m.cores);
  m.nome ??= def.nome;
  m.espelhado = !!m.espelhado;
  if (def.variantes) m.variante ??= def.variantes[0].id;
  if (def.acabamentos) m.acab ??= def.acabamentos[0];
  m.y ??= varianteDe(def, m)?.elev ?? def.elev ?? 0;
  m.aberto ??= def.aberto ?? 0;
  return m;
}

function prepararDoc(d) {
  d.versao = 1;
  d.ativo = Math.min(Math.max(0, d.ativo | 0), d.cenarios.length - 1);
  d.catalogoExtra ||= [];
  d.planta.pontosEletricos ||= [];
  d.planta.local ||= clonar(PLANTA_ORIGINAL.local);
  d.planta.orientacao ??= PLANTA_ORIGINAL.orientacao;
  for (const a of d.planta.aberturas) a.id ||= novoId('ab');
  for (const c of d.cenarios) {
    c.id ||= novoId('c');
    c.zonas ||= [];
    for (const z of c.zonas) z.id ||= novoId('z');
    for (const m of c.moveis) prepararMovel(m);
  }
  return d;
}

function docOriginal(extra = []) {
  const antes = doc;
  doc = { planta: clonar(PLANTA_ORIGINAL), cenarios: clonar(CENARIOS_ORIGINAIS), ativo: 0, catalogoExtra: clonar(extra) };
  const d = prepararDoc(doc);
  doc = antes;
  return d;
}

function docValido(d) {
  return d && d.planta && Array.isArray(d.planta.paredes) && Array.isArray(d.planta.aberturas) &&
    Array.isArray(d.planta.ambientes) && Array.isArray(d.planta.contorno) &&
    Array.isArray(d.cenarios) && d.cenarios.length > 0 && d.cenarios.every((c) => Array.isArray(c.moveis));
}

// Histórico: cada alteração guarda uma cópia do documento anterior.
const hist = { voltar: [], avancar: [] };
function registrar(estado = JSON.stringify(doc)) {
  hist.voltar.push(estado);
  if (hist.voltar.length > 200) hist.voltar.shift();
  hist.avancar.length = 0;
}
function alterar(fn) { registrar(); fn(); atualizarTudo(); }
function desfazer() {
  if (!hist.voltar.length) return;
  hist.avancar.push(JSON.stringify(doc));
  doc = JSON.parse(hist.voltar.pop());
  validarSelecao(); atualizarTudo();
}
function refazer() {
  if (!hist.avancar.length) return;
  hist.voltar.push(JSON.stringify(doc));
  doc = JSON.parse(hist.avancar.pop());
  validarSelecao(); atualizarTudo();
}
function validarSelecao() {
  if (!sel) return;
  const existe = sel.tipo === 'movel' ? movel(sel.id) : sel.tipo === 'parede' ? parede(sel.id) : ambiente(sel.id);
  if (!existe) sel = null;
}

// =====================================================================
// 3. GEOMETRIA DA PLANTA
// =====================================================================
const snap = (v) => Math.round(v / CFG.grade) * CFG.grade;
const horizontal = (w) => Math.abs(w.z1 - w.z2) < 0.5;
const comprimento = (w) => Math.hypot(w.x2 - w.x1, w.z2 - w.z1);

function areaSinal(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % pts.length];
    s += x1 * z2 - x2 * z1;
  }
  return s / 2;
}

function dentro([x, z], pts) {
  let d = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) d = !d;
  }
  return d;
}

// Parede (de pé) que passa por baixo de uma aresta de ambiente/contorno.
function paredeNaAresta(a, b, planta) {
  const hz = Math.abs(a[1] - b[1]) < 0.5;
  const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
  for (const w of planta.paredes) {
    if (w.demolida || horizontal(w) !== hz) continue;
    if (hz && Math.abs(w.z1 - mz) < 0.5 && mx > Math.min(w.x1, w.x2) - 0.5 && mx < Math.max(w.x1, w.x2) + 0.5) return w;
    if (!hz && Math.abs(w.x1 - mx) < 0.5 && mz > Math.min(w.z1, w.z2) - 0.5 && mz < Math.max(w.z1, w.z2) + 0.5) return w;
  }
  return null;
}

// Desloca um polígono ortogonal para dentro (ou para fora) em meia espessura
// da parede que existe sob cada aresta. É o que transforma "linha de centro"
// em "face interna" (área útil) ou "face externa" (área construída).
function deslocar(pts, planta, paraFora = false) {
  const n = pts.length;
  const normais = [], dists = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const dx = Math.sign(b[0] - a[0]), dz = Math.sign(b[1] - a[1]);
    let nx = -dz, nz = dx;
    const meio = [(a[0] + b[0]) / 2 + nx * 0.5, (a[1] + b[1]) / 2 + nz * 0.5];
    if (!dentro(meio, pts)) { nx = -nx; nz = -nz; }
    if (paraFora) { nx = -nx; nz = -nz; }
    normais.push([nx, nz]);
    const w = paredeNaAresta(a, b, planta);
    dists.push(w ? w.esp / 2 : 0);
  }
  return pts.map((p, i) => {
    let [x, z] = p;
    for (const e of [(i - 1 + n) % n, i]) {
      const a = pts[e], b = pts[(e + 1) % n];
      if (Math.abs(a[0] - b[0]) < 0.5) x = p[0] + normais[e][0] * dists[e]; // aresta vertical
      else z = p[1] + normais[e][1] * dists[e];                             // aresta horizontal
    }
    return [x, z];
  });
}

const poligonoUtil = (amb) => deslocar(amb.pontos, doc.planta);
const areaUtil = (amb) => Math.abs(areaSinal(poligonoUtil(amb))) / 1e4;
const areaConstruida = () => Math.abs(areaSinal(deslocar(doc.planta.contorno, doc.planta, true))) / 1e4;

function limites(pts) {
  const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
}

function centroRotulo(pts) {
  let a = 0, cx = 0, cz = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % pts.length];
    const f = x1 * z2 - x2 * z1;
    a += f; cx += (x1 + x2) * f; cz += (z1 + z2) * f;
  }
  const c = [cx / (3 * a), cz / (3 * a)];
  if (dentro(c, pts)) return c;
  const b = limites(pts); // polígono em L: procura um ponto interno numa grade
  let melhor = null, dist = Infinity;
  for (let i = 1; i < 10; i++) for (let j = 1; j < 10; j++) {
    const p = [b.x0 + ((b.x1 - b.x0) * i) / 10, b.z0 + ((b.z1 - b.z0) * j) / 10];
    const d = Math.hypot(p[0] - c[0], p[1] - c[1]);
    if (dentro(p, pts) && d < dist) { melhor = p; dist = d; }
  }
  return melhor || c;
}

// Folga até a face da parede perpendicular no início da parede (para mostrar
// o "afastamento do canto" das aberturas em vez da distância até o eixo).
function folgaInicio(w) {
  const hz = horizontal(w);
  for (const o of doc.planta.paredes) {
    if (o === w || o.demolida || horizontal(o) === hz) continue;
    const toca = hz
      ? Math.abs(o.x1 - w.x1) < 0.5 && w.z1 >= Math.min(o.z1, o.z2) - 0.5 && w.z1 <= Math.max(o.z1, o.z2) + 0.5
      : Math.abs(o.z1 - w.z1) < 0.5 && w.x1 >= Math.min(o.x1, o.x2) - 0.5 && w.x1 <= Math.max(o.x1, o.x2) + 0.5;
    if (toca) return o.esp / 2;
  }
  return 0;
}

// ESTICAR — a operação central de edição da planta (como o "stretch" do CAD).
// Move a linha eixo=c (x=c se eixo='x', z=c se eixo='z'), no trecho [a,b] da
// outra coordenada, em 'delta'. Paredes sobre a linha andam inteiras; paredes
// ligadas a elas esticam; vértices de ambientes e do contorno acompanham.
// Aberturas ficam no mesmo lugar do mundo.
function esticar(planta, eixo, c, a, b, delta) {
  const X = eixo === 'x' ? 0 : 1, Y = 1 - X;
  const pts = (w) => [[w.x1, w.z1], [w.x2, w.z2]];
  let lo = a, hi = b;
  for (const w of planta.paredes) {
    const [p, q] = pts(w);
    if (Math.abs(p[X] - c) < 0.5 && Math.abs(q[X] - c) < 0.5 &&
        Math.min(p[Y], q[Y]) <= b + 0.5 && Math.max(p[Y], q[Y]) >= a - 0.5) {
      lo = Math.min(lo, p[Y], q[Y]); hi = Math.max(hi, p[Y], q[Y]);
    }
  }
  const naLinha = (p) => Math.abs(p[X] - c) < 0.5 && p[Y] >= lo - 0.5 && p[Y] <= hi + 0.5;
  const k = X === 0 ? 'x' : 'z';
  for (const w of planta.paredes) {
    const [p, q] = pts(w);
    const m0 = naLinha(p), m1 = naLinha(q);
    if (m0) w[k + '1'] += delta;
    if (m1) w[k + '2'] += delta;
    const eixoParede = horizontal(w) ? 0 : 1;
    if (m0 && !m1 && eixoParede === X) {
      for (const ab of planta.aberturas) if (ab.parede === w.id) ab.pos -= delta;
    }
  }
  for (const amb of planta.ambientes) for (const p of amb.pontos) if (naLinha(p)) p[X] += delta;
  for (const p of planta.contorno) if (naLinha(p)) p[X] += delta;
  for (const pe of planta.pontosEletricos || []) if (pe.x != null && naLinha([pe.x, pe.z])) (X === 0 ? (pe.x += delta) : (pe.z += delta));
}

// Confere se a planta continua coerente depois de uma edição.
function problemaPlanta(planta, antes) {
  for (const w of planta.paredes) {
    if (Math.abs(w.x1 - w.x2) > 0.5 && Math.abs(w.z1 - w.z2) > 0.5) return `a parede "${w.nome}" ficaria torta`;
    if (w.x1 > w.x2 + 0.5 || w.z1 > w.z2 + 0.5 || comprimento(w) < 10) return `a parede "${w.nome}" ficaria curta demais`;
  }
  for (const ab of planta.aberturas) {
    const w = planta.paredes.find((p) => p.id === ab.parede);
    if (!w) continue;
    if (ab.pos < -0.5 || ab.pos + ab.largura > comprimento(w) + 0.5) return `a abertura "${TIPOS_ABERTURA[ab.tipo]} ${ab.largura}" sairia da parede`;
  }
  for (let i = 0; i < planta.ambientes.length; i++) {
    const s = areaSinal(planta.ambientes[i].pontos);
    const s0 = antes ? areaSinal(antes.ambientes[i].pontos) : s;
    if (Math.sign(s) !== Math.sign(s0) || Math.abs(s) < 3000) return `o ambiente "${planta.ambientes[i].nome}" ficaria pequeno demais`;
  }
  return null;
}

// Tenta aplicar uma edição de planta; se ficar incoerente, desfaz e avisa.
function editarPlanta(fn) {
  const nova = clonar(doc.planta);
  fn(nova);
  const erro = problemaPlanta(nova, doc.planta);
  if (erro) { toast(`Não dá: ${erro}.`); renderPainel(); return false; }
  registrar();
  doc.planta = nova;
  atualizarTudo();
  return true;
}

// =====================================================================
// 4. CENA 3D
// =====================================================================
const palco = $('#palco');
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.NeutralToneMapping; // cores fiéis às referências
renderer.toneMappingExposure = 1;
palco.prepend(renderer.domElement);

const cena = new T.Scene();
cena.background = new T.Color('#e9ebee');
const pmrem = new T.PMREMGenerator(renderer);
cena.environment = pmrem.fromScene(new T.RoomEnvironment(), 0.04).texture;
cena.environmentIntensity = 0.45;

// Luzes: céu + sol. A posição do sol vem da data e da hora (seção 4b).
const hemi = new T.HemisphereLight(0xffffff, 0xd8cbb8, 1.1);
cena.add(hemi);
const sol = new T.DirectionalLight(0xfff1dc, 2.4);
sol.castShadow = true;
sol.shadow.mapSize.set(4096, 4096);
Object.assign(sol.shadow.camera, { left: -650, right: 650, top: 650, bottom: -650, near: 10, far: 3000 });
sol.shadow.bias = -0.0004;
sol.shadow.normalBias = 0.6;
cena.add(sol, sol.target);

// Câmeras: perspectiva (órbita) e vista de cima (ortográfica).
const camPersp = new T.PerspectiveCamera(42, 1, 5, 20000);
const camTopo = new T.OrthographicCamera(-1, 1, 1, -1, 1, 20000);
camTopo.up.set(0, 0, -1);
const ctlPersp = new T.OrbitControls(camPersp, renderer.domElement);
ctlPersp.enableDamping = true;
ctlPersp.maxPolarAngle = Math.PI / 2 - 0.04;
ctlPersp.minDistance = 80;
ctlPersp.maxDistance = 4000;
const ctlTopo = new T.OrbitControls(camTopo, renderer.domElement);
ctlTopo.enableRotate = false;
ctlTopo.screenSpacePanning = true;
ctlTopo.mouseButtons = { LEFT: T.MOUSE.PAN, MIDDLE: T.MOUSE.DOLLY, RIGHT: T.MOUSE.PAN };
ctlTopo.touches = { ONE: T.TOUCH.PAN, TWO: T.TOUCH.DOLLY_PAN };
ctlTopo.minZoom = 0.3; ctlTopo.maxZoom = 12;
ctlTopo.enabled = false;

const vista = { topo: false, corte: false, caminhar: false };
const camAtiva = () => (vista.topo ? camTopo : camPersp);
const ctlAtivo = () => (vista.topo ? ctlTopo : ctlPersp);

function centroPlanta() {
  const b = limites(doc.planta.contorno);
  return { cx: (b.x0 + b.x1) / 2, cz: (b.z0 + b.z1) / 2, w: b.x1 - b.x0, d: b.z1 - b.z0 };
}

function enquadrar() {
  const { cx, cz, w, d } = centroPlanta();
  const asp = palco.clientWidth / Math.max(1, palco.clientHeight);
  const k = asp < 1.3 ? (1.3 / asp) ** 0.6 : 1; // tela em pé: afasta a câmera para caber
  camPersp.position.set(cx + w * 0.55 * k, Math.max(w, d) * 1.25 * k, cz + d * 1.05 * k);
  ctlPersp.target.set(cx, 0, cz);
  const meia = Math.max(d / 2, w / 2 / asp) * 1.12;
  Object.assign(camTopo, { left: -meia * asp, right: meia * asp, top: meia, bottom: -meia, zoom: 1 });
  camTopo.position.set(cx, 3000, cz);
  ctlTopo.target.set(cx, 0, cz);
  camTopo.updateProjectionMatrix();
  aplicarSol();
  ctlPersp.update(); ctlTopo.update();
}

function redimensionar() {
  const w = palco.clientWidth, h = Math.max(1, palco.clientHeight);
  renderer.setSize(w, h, false);
  camPersp.aspect = w / h; camPersp.updateProjectionMatrix();
  const meia = (camTopo.top - camTopo.bottom) / 2;
  camTopo.left = -meia * (w / h); camTopo.right = meia * (w / h);
  camTopo.updateProjectionMatrix();
}
new ResizeObserver(redimensionar).observe(palco);

// Pós-processamento: oclusão ambiente (GTAO) — as sombras de contato nos
// cantos, atrás dos móveis e sob o sofá, que dão peso de foto à cena.
// Só na vista 3D; no celular começa desligada (pesa no processador).
const qualidade = Object.assign({ ao: !matchMedia('(pointer: coarse)').matches },
  (() => { try { return JSON.parse(localStorage.getItem('simulador-apto:qualidade')) || {}; } catch { return {}; } })());
const composer = new T.EffectComposer(renderer);
const passoCena = new T.RenderPass(cena, camPersp);
const passoAO = new T.GTAOPass(cena, camPersp, 1, 1);
passoAO.updateGtaoMaterial({ radius: 32, distanceExponent: 1.4, thickness: 18, scale: 1.15, samples: 16, distanceFallOff: 1 });
passoAO.blendIntensity = 0.9;
composer.addPass(passoCena);
composer.addPass(passoAO);
composer.addPass(new T.OutputPass());
function ajustarComposer() {
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(palco.clientWidth, Math.max(1, palco.clientHeight));
}
new ResizeObserver(ajustarComposer).observe(palco);
function desenharQuadro() {
  if (qualidade.ao && !vista.topo) composer.render();
  else renderer.render(cena, camAtiva());
}

// Texturas feitas no próprio navegador (sem arquivos externos).
// FUTURO (texturas): trocar estas funções por imagens carregadas.
function texturaCanvas(tamCm, px, desenhar) {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  desenhar(c.getContext('2d'), px);
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(1 / tamCm, 1 / tamCm);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
function aleatorio(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

function texturaMadeira() {
  // 240 cm × 240 cm: réguas de 20 cm × 120 cm, em amarração
  return texturaCanvas(240, 1024, (g, px) => {
    const r = aleatorio(7), esc = px / 240, tons = ['#c29868', '#bd9263', '#c69d6d', '#ba8f60', '#c09566'];
    for (let col = 0; col < 12; col++) {
      const desloc = (col % 3) * 40;
      for (let k = -1; k < 3; k++) {
        const z0 = (k * 120 + desloc) * esc, x0 = col * 20 * esc;
        g.fillStyle = tons[Math.floor(r() * tons.length)];
        g.fillRect(x0, z0, 20 * esc, 120 * esc);
        g.globalAlpha = 0.13;
        for (let v = 0; v < 9; v++) {
          g.strokeStyle = r() > 0.5 ? '#7a5634' : '#e2c29a';
          g.lineWidth = 0.6 + r() * 1.2;
          const xx = x0 + r() * 20 * esc;
          g.beginPath(); g.moveTo(xx, z0);
          g.bezierCurveTo(xx + (r() - 0.5) * 6, z0 + 40 * esc, xx + (r() - 0.5) * 6, z0 + 80 * esc, xx + (r() - 0.5) * 4, z0 + 120 * esc);
          g.stroke();
        }
        g.globalAlpha = 0.45; g.fillStyle = '#6d4c2f';
        g.fillRect(x0, z0, 20 * esc, 1.2); g.fillRect(x0, z0, 1.2, 120 * esc);
        g.globalAlpha = 1;
      }
    }
  });
}
function texturaPiso(tamCm, placaCm, base, junta, variacao) {
  return texturaCanvas(tamCm, 1024, (g, px) => {
    const r = aleatorio(11), n = tamCm / placaCm, s = px / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const c = new T.Color(base).offsetHSL(0, 0, (r() - 0.5) * variacao);
      g.fillStyle = `#${c.getHexString()}`; g.fillRect(i * s, j * s, s, s);
    }
    g.strokeStyle = junta; g.lineWidth = Math.max(2, px / 400);
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, px); g.stroke();
      g.beginPath(); g.moveTo(0, i * s); g.lineTo(px, i * s); g.stroke();
    }
  });
}
function texturaCimento() {
  return texturaCanvas(300, 1024, (g, px) => {
    const r = aleatorio(5);
    g.fillStyle = '#b9b6b1'; g.fillRect(0, 0, px, px);
    for (let i = 0; i < 2600; i++) {
      g.globalAlpha = 0.05; g.fillStyle = r() > 0.5 ? '#8f8b85' : '#d6d3ce';
      const s = 6 + r() * 60; g.beginPath(); g.arc(r() * px, r() * px, s, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  });
}

const MAT = {
  parede: new T.MeshStandardMaterial({ color: '#efe9df', roughness: 0.93 }),
  paredeSel: new T.MeshStandardMaterial({ color: '#cfe0fb', roughness: 0.9, emissive: '#2f80ed', emissiveIntensity: 0.12 }),
  topo: new T.MeshStandardMaterial({ color: '#3f4349', roughness: 0.85 }),
  topoSel: new T.MeshStandardMaterial({ color: '#2f80ed', roughness: 0.6 }),
  laje: new T.MeshStandardMaterial({ color: '#cfcac2', roughness: 1 }),
  teto: new T.MeshStandardMaterial({ color: '#f7f6f3', roughness: 0.95, side: T.DoubleSide }),
  rodape: new T.MeshStandardMaterial({ color: '#f8f7f4', roughness: 0.45 }),
  chao: new T.MeshStandardMaterial({ color: '#e1ded8', roughness: 1 }),
  esquadria: new T.MeshStandardMaterial({ color: '#f1f1ef', roughness: 0.4, metalness: 0.2 }),
  aluminio: new T.MeshStandardMaterial({ color: '#4c5157', roughness: 0.35, metalness: 0.6 }),
  vidro: new T.MeshPhysicalMaterial({ color: '#d6ecf2', roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false }),
  peitoril: new T.MeshStandardMaterial({ color: '#e4e0d8', roughness: 0.45 }),
  batente: new T.MeshStandardMaterial({ color: '#f5f3ef', roughness: 0.5 }),
  folha: new T.MeshStandardMaterial({ color: '#efebe4', roughness: 0.45 }),
  macaneta: new T.MeshStandardMaterial({ color: '#b8bcc2', roughness: 0.25, metalness: 0.85 }),
  arco: new T.LineBasicMaterial({ color: '#8f959c' }),
  demolida: new T.LineDashedMaterial({ color: '#d0453b', dashSize: 8, gapSize: 6 }),
  demolidaFundo: new T.MeshBasicMaterial({ color: '#d0453b', transparent: true, opacity: 0.1, depthWrite: false }),
  piso: {
    madeira: new T.MeshStandardMaterial({ map: texturaMadeira(), roughness: 0.55 }),
    ceramica: new T.MeshStandardMaterial({ map: texturaPiso(120, 30, '#e7e5e0', '#c9c5be', 0.04), roughness: 0.35 }),
    porcelanato: new T.MeshStandardMaterial({ map: texturaPiso(240, 60, '#dcd6cc', '#bdb5a8', 0.03), roughness: 0.3 }),
    cimento: new T.MeshStandardMaterial({ map: texturaCimento(), roughness: 0.7 }),
  },
};

// Pintura: cada parede pode ter sua cor (painel da parede).
const cacheParede = new Map();
function matParede(cor) {
  if (!cor) return MAT.parede;
  if (!cacheParede.has(cor)) cacheParede.set(cor, new T.MeshStandardMaterial({ color: cor, roughness: 0.93 }));
  return cacheParede.get(cor);
}

// =====================================================================
// 4b. SOL POR DATA E HORA
// =====================================================================
// Posição do sol pelo algoritmo simplificado da NOAA (erro < 1°), para a
// latitude/longitude de doc.planta.local. Data e hora não entram no
// histórico: ficam guardadas à parte, só neste navegador.
const CHAVE_LUZ = 'simulador-apto:luz';
const rad = (g) => (g * Math.PI) / 180, grau = (r) => (r * 180) / Math.PI;
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const luz = Object.assign({ data: hojeISO(), hora: 8 }, (() => { try { return JSON.parse(localStorage.getItem(CHAVE_LUZ)) || {}; } catch { return {}; } })());

function posicaoSol(dataISO, hora, { lat, lon, fuso }) {
  const [a, m, d] = dataISO.split('-').map(Number);
  const n = (Date.UTC(a, m - 1, d) + (hora - fuso) * 3600e3) / 864e5 + 2440587.5 - 2451545.0;
  const L = 280.46 + 0.9856474 * n, g = rad(357.528 + 0.9856003 * n);
  const lamb = rad(L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g));
  const eps = rad(23.439 - 4e-7 * n);
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lamb), Math.cos(lamb));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lamb));
  const H = rad((18.697374558 + 24.06570982441908 * n) * 15 + lon) - ra, f = rad(lat);
  const elev = Math.asin(Math.sin(f) * Math.sin(dec) + Math.cos(f) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(f) - Math.sin(f) * Math.cos(H));
  return { elev: grau(elev), az: (grau(az) + 360) % 360 }; // az: a partir do norte, sentido horário
}

// Direção na planta (x, z) de um azimute. A parede esquerda olha para -x;
// 'orientacao' diz a que azimute isso corresponde.
function direcaoPlanta(az) {
  const t = rad(az - doc.planta.orientacao);
  return [-Math.cos(t), -Math.sin(t)];
}

function nascerPor(dataISO) {
  let nascer = null, por = null, antes = posicaoSol(dataISO, 0, doc.planta.local).elev;
  for (let min = 5; min <= 1440; min += 5) {
    const e = posicaoSol(dataISO, min / 60, doc.planta.local).elev;
    if (antes < 0 && e >= 0 && nascer == null) nascer = min / 60;
    if (antes >= 0 && e < 0) por = min / 60;
    antes = e;
  }
  return { nascer, por };
}

const PONTOS = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
const pontoCardeal = (az) => PONTOS[Math.round(az / 45) % 8];
const horaTxt = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`.replace(/:60$/, ':59');
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const CEU_DIA = new T.Color('#e9ebee'), CEU_NOITE = new T.Color('#2a303b');
const SOL_BAIXO = new T.Color('#ffb070'), SOL_ALTO = new T.Color('#fff4e4');
function aplicarSol() {
  if (!doc) return;
  const { cx, cz } = centroPlanta();
  const { elev, az } = posicaoSol(luz.data, luz.hora, doc.planta.local);
  const [dx, dz] = direcaoPlanta(az);
  const e = rad(Math.max(elev, 2)), dist = 1500;
  sol.target.position.set(cx, 0, cz);
  sol.position.set(cx + dx * Math.cos(e) * dist, Math.sin(e) * dist, cz + dz * Math.cos(e) * dist);
  const dia = suave(-2, 6, elev);                  // 0 à noite, 1 de dia
  sol.intensity = 2.8 * suave(-0.5, 8, elev);
  sol.visible = sol.intensity > 0.01;
  sol.color.copy(SOL_BAIXO).lerp(SOL_ALTO, suave(3, 35, elev));
  hemi.intensity = 0.25 + 0.9 * dia;
  cena.environmentIntensity = 0.1 + 0.35 * dia;
  if (cena.background?.isColor) cena.background.copy(CEU_NOITE).lerp(CEU_DIA, dia);
  // luminárias: acendem quando escurece
  const noite = 1 - suave(-4, 10, elev);
  for (const l of luzesMoveis) l.intensity = l.userData.base * noite;
  for (const mt of matsLuz) mt.emissiveIntensity = 0.05 + 1.4 * noite;
  return { elev, az };
}

// Bússola: seta do norte girando conforme a câmera.
const bussola = document.querySelector('#bussola');
function posicionarBussola() {
  const { cx, cz } = centroPlanta();
  const [nx, nz] = direcaoPlanta(0);
  const a = new T.Vector3(cx, 0, cz).project(camAtiva()), b = new T.Vector3(cx + nx * 100, 0, cz + nz * 100).project(camAtiva());
  const ang = Math.atan2(b.x - a.x, (b.y - a.y) * (palco.clientHeight / palco.clientWidth));
  bussola.querySelector('svg').style.transform = `rotate(${grau(ang)}deg)`;
  const letra = bussola.querySelector('b');
  letra.style.left = `${20 + Math.sin(ang) * 27}px`;
  letra.style.top = `${20 - Math.cos(ang) * 27}px`;
}

// =====================================================================
// 4c. FOTO REALISTA (traçado de raios)
// =====================================================================
// Em vez de desenhar em tempo real, simula o caminho da luz: rebate nas
// paredes, passa pelas janelas e cortinas, reflete no piso e nos metais.
// A imagem começa granulada e limpa a cada passada (amostra). Mexer na
// câmera recomeça. Usa a câmera atual: na órbita é uma maquete sem teto;
// caminhando, é a foto de dentro do apartamento, com teto.
const foto = { ativa: false, pt: null, meta: 300, ceu: null, cam: new T.Matrix4(), ultimaUI: 0 };
const ehToque = matchMedia('(pointer: coarse)').matches;

function texturaCeu() {
  // céu simples em equiretangular: horizonte claro, zênite azul, chão escuro
  const w = 256, h = 128, d = new Float32Array(w * h * 4);
  for (let j = 0; j < h; j++) {
    const alt = (j / (h - 1)) * 2 - 1; // -1 = para baixo, 1 = para cima
    let c;
    if (alt >= 0) { const t = Math.pow(alt, 0.45); c = [1.05 - 0.5 * t, 1.07 - 0.32 * t, 1.1 - 0.08 * t]; }
    else c = [0.46, 0.44, 0.4];
    for (let i = 0; i < w; i++) d.set([...c, 1], (j * w + i) * 4);
  }
  const t = new T.DataTexture(d, w, h, T.RGBAFormat, T.FloatType);
  t.mapping = T.EquirectangularReflectionMapping;
  t.magFilter = t.minFilter = T.LinearFilter;
  t.needsUpdate = true;
  return t;
}

function luzDaFoto() {
  const { elev } = aplicarSol();
  const dia = suave(-2, 6, elev);
  cena.environmentIntensity = 0.04 + 1.15 * dia;
  cena.backgroundIntensity = cena.environmentIntensity;
}

// Cópia da cena só com o que aparece na foto: um material por objeto
// (o traçado de raios embaralha objetos com vários materiais), sem
// marcações, linhas e camadas de seleção.
function montarCenaFoto() {
  const c = new T.Scene();
  c.environment = foto.ceu;
  c.background = foto.ceu;
  c.environmentIntensity = cena.environmentIntensity;
  c.backgroundIntensity = cena.backgroundIntensity;
  const visivel = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  cena.updateMatrixWorld(true);
  cena.traverse((o) => {
    if (!visivel(o)) return;
    if (o.isMesh) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      if (mats.some((m) => m.isMeshBasicMaterial)) return;
      let geo = o.geometry;
      if (Array.isArray(o.material)) { geo = geo.clone(); geo.clearGroups(); foto.descartar.push(geo); }
      const m = new T.Mesh(geo, mats[0]);
      m.matrixAutoUpdate = false;
      m.matrix.copy(o.matrixWorld);
      m.matrixWorld.copy(o.matrixWorld);
      c.add(m);
    } else if (o.isPointLight && o.intensity > 0.01) {
      const l = new T.PointLight(o.color, o.intensity, o.distance, o.decay);
      l.position.setFromMatrixPosition(o.matrixWorld);
      c.add(l);
    }
  });
  if (sol.visible && sol.intensity > 0.01) {
    const s2 = new T.DirectionalLight(sol.color, sol.intensity);
    s2.position.copy(sol.position);
    s2.target.position.copy(sol.target.position);
    c.add(s2, s2.target);
  }
  c.updateMatrixWorld(true);
  return c;
}

function abrirFoto() {
  if (vista.topo) alternarVista();
  if (sel) selecionar(null);
  foto.antes = { env: cena.environment, bg: cena.background, envI: cena.environmentIntensity };
  foto.ceu ??= texturaCeu();
  cena.environment = foto.ceu;
  cena.background = foto.ceu;
  hemi.visible = false;              // o céu faz esse papel no traçado de raios
  grpSel.visible = grpZonas.visible = false;
  luzDaFoto();
  if (!foto.pt) {
    foto.pt = new T.WebGLPathTracer(renderer);
    Object.assign(foto.pt, { minSamples: 0, renderDelay: 0, fadeDuration: 0, bounces: 6, filterGlossyFactor: 0.5 });
    foto.pt.tiles.set(ehToque ? 3 : 2, ehToque ? 3 : 2);
  }
  foto.pt.renderScale = ehToque ? 0.5 : 1;
  // interior pede mais exposição que a maquete vista de fora
  const exp = vista.caminhar ? 2.6 : 1.1;
  renderer.toneMappingExposure = exp;
  $('#fotoExposicao').value = String(exp);
  foto.ativa = true;
  document.body.classList.add('modo-foto');
  $('#painelFoto').hidden = false;
  $('#fotoHora').value = String(luz.hora);
  $('#fotoHoraTxt').textContent = horaTxt(luz.hora);
  $('#fotoStatus').textContent = 'Preparando a cena…';
  // deixa o aviso aparecer antes do trabalho pesado (montar a cena para os raios)
  setTimeout(() => {
    if (!foto.ativa) return;
    camAtiva().updateMatrixWorld();
    foto.descartar = [];
    foto.cena = montarCenaFoto();
    foto.pt.setScene(foto.cena, camPersp);
    foto.cam.copy(camPersp.matrixWorld);
    foto.t0 = performance.now();
  }, 60);
}

function quadroFoto() {
  if (!vista.caminhar) ctlPersp.update();
  if (!foto.t0) return;
  camPersp.updateMatrixWorld();
  if (!camPersp.matrixWorld.equals(foto.cam)) { // câmera mexeu: recomeça
    foto.cam.copy(camPersp.matrixWorld);
    foto.pt.updateCamera();
    foto.t0 = performance.now();
  }
  const n = foto.pt.samples;
  if (n < foto.meta) foto.pt.renderSample();
  const agora = performance.now();
  if (agora - foto.ultimaUI > 250) {
    foto.ultimaUI = agora;
    const pronto = Math.min(1, n / foto.meta);
    $('#fotoBarra').style.width = `${pronto * 100}%`;
    $('#fotoStatus').textContent = n >= foto.meta
      ? `Pronta · ${foto.meta} passadas`
      : `${Math.floor(n)} de ${foto.meta} passadas · ${Math.round((agora - foto.t0) / 1000)} s`;
  }
}

function recomecarFoto() {
  if (!foto.ativa || !foto.t0) return;
  luzDaFoto();
  // o sol e as luminárias mudam com a hora: refaz a cópia da cena
  for (const g of foto.descartar) g.dispose();
  foto.descartar = [];
  foto.cena = montarCenaFoto();
  foto.pt.setScene(foto.cena, camPersp);
  foto.t0 = performance.now();
}

function fecharFoto() {
  foto.ativa = false;
  foto.t0 = 0;
  for (const g of foto.descartar || []) g.dispose();
  foto.descartar = [];
  foto.cena = null;
  document.body.classList.remove('modo-foto');
  $('#painelFoto').hidden = true;
  cena.environment = foto.antes.env;
  cena.background = foto.antes.bg;
  hemi.visible = true;
  grpSel.visible = grpZonas.visible = true;
  renderer.toneMappingExposure = 1;
  aplicarSol();
  ctlPersp.enabled = !vista.caminhar && !vista.topo;
}

function salvarFoto() {
  if (!foto.t0) return;
  foto.pt.renderSample(); // desenha agora para ler o canvas no mesmo instante
  renderer.domElement.toBlob((b) => baixar(b, `apartamento-${slug(cen().nome)}-foto-${horaTxt(luz.hora).replace(':', 'h')}.png`));
}

// =====================================================================
// 5. PAREDES, ABERTURAS E PISOS
// =====================================================================
const grpPlanta = new T.Group();
const grpMoveis = new T.Group();
const grpSel = new T.Group();
cena.add(grpPlanta, grpMoveis, grpSel);

function limpar(grp) {
  grp.traverse((o) => { if (o.geometry && !o.userData.compartilhado) o.geometry.dispose(); });
  grp.clear();
}

function caixa(l, a, p, mat, x, y, z, info) {
  const m = new T.Mesh(new T.BoxGeometry(l, a, p), mat);
  m.position.set(x, y, z);
  m.castShadow = mat !== MAT.vidro;
  m.receiveShadow = true;
  if (info) m.userData = info;
  return m;
}

function construirPlanta() {
  limpar(grpPlanta);
  const pl = doc.planta;
  const H = pl.alturaParede;
  const Hc = vista.corte && !vista.caminhar ? Math.min(H, CFG.alturaCorte) : H;

  // chão externo e laje sob as paredes
  const chao = new T.Mesh(new T.PlaneGeometry(8000, 8000), MAT.chao);
  chao.rotation.x = -Math.PI / 2; chao.position.y = -2;
  grpPlanta.add(chao);
  grpPlanta.add(malhaPoligono(deslocar(pl.contorno, pl, true), MAT.laje, -0.4));

  for (const amb of pl.ambientes) {
    const m = malhaPoligono(poligonoUtil(amb), MAT.piso[amb.piso] || MAT.piso.madeira, 0);
    m.userData = { tipo: 'ambiente', id: amb.id };
    grpPlanta.add(m);
  }
  for (const w of pl.paredes) grpPlanta.add(w.demolida ? paredeDemolida(w) : construirParede(w, pl, H, Hc));
  if (vista.caminhar) { // teto, para a luz entrar só pelas janelas
    const teto = malhaPoligono(deslocar(pl.contorno, pl, true), MAT.teto, H);
    teto.castShadow = true;
    grpPlanta.add(teto);
  }
  for (const f of EXTENSOES.aposPlanta) f(grpPlanta, pl);
  montarRotulos();
}

function malhaPoligono(pts, mat, y) {
  const s = new T.Shape(pts.map(([x, z]) => new T.Vector2(x, -z)));
  const g = new T.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2);
  const m = new T.Mesh(g, mat);
  m.position.y = y;
  m.receiveShadow = true;
  return m;
}

// Cada parede vira um grupo no sistema local: u ao longo da parede
// (0 = início), v atravessando a espessura, y para cima.
function grupoParede(w) {
  const g = new T.Group();
  g.position.set(w.x1, 0, w.z1);
  g.rotation.y = horizontal(w) ? 0 : -Math.PI / 2;
  return g;
}

function construirParede(w, pl, H, Hc) {
  const g = grupoParede(w);
  const selec = sel?.tipo === 'parede' && sel.id === w.id;
  const info = { tipo: 'parede', id: w.id };
  const lado = selec ? MAT.paredeSel : matParede(w.cor);
  const L = comprimento(w), e = w.esp;
  const peca = (u0, u1, y0, y1) => {
    y1 = Math.min(y1, Hc);
    if (u1 - u0 < 0.1 || y1 - y0 < 0.1) return;
    const topo = y1 >= Hc - 0.1 ? (selec ? MAT.topoSel : MAT.topo) : lado;
    const m = new T.Mesh(new T.BoxGeometry(u1 - u0, y1 - y0, e), [lado, lado, topo, lado, lado, lado]);
    m.position.set((u0 + u1) / 2, (y0 + y1) / 2, 0);
    m.castShadow = m.receiveShadow = true;
    m.userData = info;
    g.add(m);
    if (y0 === 0 && Hc > 8) { // rodapé
      const r = new T.Mesh(new T.BoxGeometry(u1 - u0, 7, e + 1.6), MAT.rodape);
      r.position.set((u0 + u1) / 2, 3.5, 0);
      r.receiveShadow = true;
      r.userData = info;
      g.add(r);
    }
  };
  const aberturas = pl.aberturas.filter((a) => a.parede === w.id).sort((a, b) => a.pos - b.pos);
  let u = -e / 2;
  for (const ab of aberturas) {
    peca(u, ab.pos, 0, H);
    if (ab.tipo === 'janela') peca(ab.pos, ab.pos + ab.largura, 0, ab.peitoril);
    const topoVao = ab.tipo === 'janela' ? ab.peitoril + ab.altura : ab.altura;
    peca(ab.pos, ab.pos + ab.largura, topoVao, H);
    construirAbertura(g, ab, w, Hc, { tipo: 'parede', id: w.id, abertura: ab.id });
    u = ab.pos + ab.largura;
  }
  peca(u, L + e / 2, 0, H);
  return g;
}

function construirAbertura(g, ab, w, Hc, info) {
  const e = w.esp, u0 = ab.pos, L = ab.largura;
  const add = (l, a, p, mat, x, y, z) => {
    const y0 = y - a / 2, y1 = Math.min(y + a / 2, Hc);
    if (y1 - y0 < 0.1) return;
    g.add(caixa(l, y1 - y0, p, mat, x, (y0 + y1) / 2, z, info));
  };
  if (ab.tipo === 'janela') {
    const y0 = ab.peitoril, h = ab.altura, pf = 5;
    add(L + 6, 3, e + 6, MAT.peitoril, u0 + L / 2, y0 - 1.5, 0);
    add(pf, h, 7, MAT.esquadria, u0 + pf / 2, y0 + h / 2, 0);
    add(pf, h, 7, MAT.esquadria, u0 + L - pf / 2, y0 + h / 2, 0);
    add(L, pf, 7, MAT.esquadria, u0 + L / 2, y0 + h - pf / 2, 0);
    add(L, pf, 7, MAT.esquadria, u0 + L / 2, y0 + pf / 2, 0);
    add(4, h - 2 * pf, 5, MAT.esquadria, u0 + L / 2, y0 + h / 2, 0);
    add(L / 2 - pf, h - 2 * pf, 0.8, MAT.vidro, u0 + L / 4 + pf / 4, y0 + h / 2, -1.5);
    add(L / 2 - pf, h - 2 * pf, 0.8, MAT.vidro, u0 + (3 * L) / 4 - pf / 4, y0 + h / 2, 1.5);
  } else if (ab.tipo === 'porta') {
    const h = ab.altura, bt = 3, lado = ab.lado === -1 ? -1 : 1;
    add(bt, h, e + 2, MAT.batente, u0 + bt / 2, h / 2, 0);
    add(bt, h, e + 2, MAT.batente, u0 + L - bt / 2, h / 2, 0);
    add(L, bt, e + 2, MAT.batente, u0 + L / 2, h - bt / 2, 0);
    // folha aberta a 90°, encostada na face da parede do lado em que abre
    const R = L - 2 * bt, noInicio = ab.dobradica !== 'fim';
    const uh = noInicio ? u0 + bt : u0 + L - bt, sU = noInicio ? 1 : -1, v0 = (lado * e) / 2;
    const hf = h - bt - 1;
    add(3.5, hf, R, MAT.folha, uh + sU * 1.75, hf / 2 + 0.5, v0 + (lado * R) / 2);
    if (Hc > 105) {
      const mc = new T.Mesh(new T.CylinderGeometry(1, 1, 12, 10), MAT.macaneta);
      mc.rotation.z = Math.PI / 2;
      mc.position.set(uh + sU * 1.75, 105, v0 + lado * (R - 6));
      g.add(mc);
    }
    const arco = [];
    for (let i = 0; i <= 24; i++) {
      const t = (i / 24) * (Math.PI / 2);
      arco.push(new T.Vector3(uh + sU * R * Math.cos(t), 0.4, v0 + lado * R * Math.sin(t)));
    }
    g.add(new T.Line(new T.BufferGeometry().setFromPoints(arco), MAT.arco));
  } else if (ab.tipo === 'correr') {
    const h = ab.altura, pf = 5, meio = L / 2;
    add(L, 1, e, MAT.aluminio, u0 + L / 2, 0.5, 0);
    add(pf, h, e, MAT.aluminio, u0 + pf / 2, h / 2, 0);
    add(pf, h, e, MAT.aluminio, u0 + L - pf / 2, h / 2, 0);
    add(L, pf, e, MAT.aluminio, u0 + L / 2, h - pf / 2, 0);
    for (const [ini, v] of [[u0 + pf, -2], [u0 + meio - 3, 2]]) {
      const lf = meio - pf + 3, hf = h - 2 * pf;
      add(4, hf, 3, MAT.aluminio, ini + 2, pf + hf / 2, v);
      add(4, hf, 3, MAT.aluminio, ini + lf - 2, pf + hf / 2, v);
      add(lf, 4, 3, MAT.aluminio, ini + lf / 2, pf + 2, v);
      add(lf, 4, 3, MAT.aluminio, ini + lf / 2, pf + hf - 2, v);
      add(lf - 8, hf - 8, 0.8, MAT.vidro, ini + lf / 2, pf + hf / 2, v);
    }
  }
}

// Parede derrubada: só um contorno tracejado no piso, clicável.
function paredeDemolida(w) {
  const g = grupoParede(w);
  const L = comprimento(w), e = w.esp, info = { tipo: 'parede', id: w.id };
  const fundo = new T.Mesh(new T.PlaneGeometry(L + e, e), MAT.demolidaFundo);
  fundo.rotation.x = -Math.PI / 2; fundo.position.set(L / 2, 0.3, 0); fundo.userData = info;
  const pts = [[-e / 2, -e / 2], [L + e / 2, -e / 2], [L + e / 2, e / 2], [-e / 2, e / 2], [-e / 2, -e / 2]]
    .map(([u, v]) => new T.Vector3(u, 0.5, v));
  const linha = new T.Line(new T.BufferGeometry().setFromPoints(pts), MAT.demolida);
  linha.computeLineDistances();
  g.add(fundo, linha);
  return g;
}

// Rótulos de área sobre cada ambiente (HTML sobre o canvas).
const camadaRotulos = $('#rotulos');
let rotulos = [];
function montarRotulos() {
  camadaRotulos.textContent = '';
  rotulos = doc.planta.ambientes.map((amb) => {
    const util = poligonoUtil(amb);
    const [x, z] = centroRotulo(util);
    const div = document.createElement('div');
    div.className = 'rotulo' + (sel?.tipo === 'ambiente' && sel.id === amb.id ? ' ativo' : '');
    div.innerHTML = `<b></b><span></span>`;
    div.querySelector('b').textContent = amb.nome;
    div.querySelector('span').textContent = m2(areaUtil(amb));
    camadaRotulos.append(div);
    return { div, pos: new T.Vector3(x, 1, z), nome: amb.nome, area: m2(areaUtil(amb)) };
  });
}
function posicionar(lista) {
  const w = palco.clientWidth, h = palco.clientHeight, v = new T.Vector3();
  for (const r of lista) {
    v.copy(r.pos).project(camAtiva());
    const vis = !vista.caminhar && v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
    r.el ??= r.div;
    r.el.style.display = vis ? '' : 'none';
    r.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)${r.canto ? '' : ' translate(-50%, -50%)'}`;
  }
}
const posicionarRotulos = () => posicionar(rotulos);

// =====================================================================
// 6. MÓVEIS
// =====================================================================
// Cada móvel do catálogo é montado a partir de formas (caixa, cilindro,
// esfera, torno). Peças com 'mov' se mexem conforme m.aberto (0 a 1):
// portas giram, gavetas deslizam, persianas enrolam. As peças fixas são
// fundidas por material para o celular desenhar menos objetos.
const objMovel = new Map();   // id do móvel → THREE.Group
const modelos = new Map();    // id do modelo .glb → { cena, tam, centro, base }
let luzesMoveis = [];         // luminárias acesas à noite

// ---- texturas de detalhe (cinza, tingidas pela cor da peça)
function texturaDetalhe(tileCm, px, desenhar) {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d');
  desenhar(g, px, aleatorio(px + tileCm));
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(100 / tileCm, 100 / tileCm); // as coordenadas de textura das peças são em metros
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
const GERADORES = {
  madeira: () => texturaDetalhe(70, 512, (g, px, r) => {
    g.fillStyle = '#d9d9d9'; g.fillRect(0, 0, px, px);
    for (let k = 0; k < 140; k++) {
      const y = r() * px, esc = r() > 0.5;
      g.strokeStyle = esc ? `rgba(70,50,30,${0.05 + r() * 0.12})` : `rgba(255,255,255,${0.04 + r() * 0.08})`;
      g.lineWidth = 0.6 + r() * 2.4;
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= px; x += 32) g.lineTo(x, y + Math.sin(x / 90 + k) * (2 + r() * 3));
      g.stroke();
    }
  }),
  tecido: () => texturaDetalhe(4, 128, (g, px, r) => {
    for (let y = 0; y < px; y += 2) for (let x = 0; x < px; x += 2) {
      const v = 205 + (((x + y) / 2) % 2 ? 22 : 0) + r() * 18;
      g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 2, 2);
    }
  }),
  boucle: () => texturaDetalhe(9, 256, (g, px, r) => {
    g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, px, px);
    for (let k = 0; k < 2600; k++) {
      const v = 170 + r() * 85; g.fillStyle = `rgb(${v},${v},${v})`;
      g.beginPath(); g.arc(r() * px, r() * px, 1.5 + r() * 3.5, 0, 7); g.fill();
    }
  }),
  couro: () => texturaDetalhe(30, 256, (g, px, r) => {
    g.fillStyle = '#d6d6d6'; g.fillRect(0, 0, px, px);
    for (let k = 0; k < 5000; k++) { const v = 185 + r() * 60; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.fillRect(r() * px, r() * px, 1.5, 1.5); }
  }),
  marmore: () => texturaDetalhe(110, 512, (g, px, r) => {
    g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, px, px);
    for (let k = 0; k < 16; k++) {
      g.strokeStyle = `rgba(110,110,115,${0.08 + r() * 0.25})`; g.lineWidth = 0.6 + r() * 2.5;
      g.beginPath(); let x = r() * px, y = 0; g.moveTo(x, y);
      while (y < px) { x += (r() - 0.45) * 40; y += 20 + r() * 30; g.lineTo(x, y); }
      g.stroke();
    }
  }),
  granito: () => texturaDetalhe(40, 256, (g, px, r) => {
    g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, px, px);
    for (let k = 0; k < 7000; k++) { const v = r() * 255; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * px, r() * px, 1 + r() * 2, 1 + r() * 2); }
  }),
  palha: () => texturaDetalhe(6, 128, (g, px) => {
    g.fillStyle = '#cfcfcf'; g.fillRect(0, 0, px, px);
    g.strokeStyle = '#8f8f8f'; g.lineWidth = 3;
    for (let k = -px; k < px * 2; k += 16) {
      g.beginPath(); g.moveTo(k, 0); g.lineTo(k + px, px); g.stroke();
      g.beginPath(); g.moveTo(k, px); g.lineTo(k + px, 0); g.stroke();
    }
  }),
  azulejo: () => texturaDetalhe(30, 512, (g, px, r) => {
    const h = px / 4, w = px / 2;
    for (let lin = 0; lin < 4; lin++) for (let col = -1; col < 3; col++) {
      const v = 228 + r() * 20; g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(col * w + (lin % 2) * w / 2, lin * h, w, h);
    }
    g.strokeStyle = '#a8a39b'; g.lineWidth = 4;
    for (let lin = 0; lin <= 4; lin++) { g.beginPath(); g.moveTo(0, lin * h); g.lineTo(px, lin * h); g.stroke(); }
    for (let lin = 0; lin < 4; lin++) for (let col = 0; col <= 2; col++) {
      const x = col * w + (lin % 2) * w / 2; g.beginPath(); g.moveTo(x, lin * h); g.lineTo(x, lin * h + h); g.stroke();
    }
  }),
  // ---- texturas das referências (BePê)
  granilite: () => texturaDetalhe(40, 512, (g, px, r) => {
    g.fillStyle = '#f1efea'; g.fillRect(0, 0, px, px);
    const tons = ['#8d8a85', '#2f2f31', '#b9b4aa', '#d7d2c8', '#6f6b66', '#c9b9a0'];
    for (let k = 0; k < 2600; k++) {
      g.fillStyle = tons[Math.floor(r() * tons.length)];
      const s = 1 + r() * (r() > 0.9 ? 6 : 2.5);
      g.beginPath(); g.ellipse(r() * px, r() * px, s, s * (0.5 + r() * 0.6), r() * 3, 0, 7); g.fill();
    }
  }),
  azulejo_grade: () => texturaDetalhe(30, 512, (g, px) => {
    const n = 3, s = px / n; // 3 × 3 peças de 10 cm
    g.fillStyle = '#26324a'; g.fillRect(0, 0, px, px);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? '#f7f6f2' : '#f4f3ef'; g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6); }
  }),
  xadrez: () => texturaDetalhe(4, 128, (g, px) => { // gingham (vichy)
    g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, px, px);
    g.fillStyle = 'rgba(40,40,40,.55)'; g.fillRect(0, 0, px / 2, px); g.fillRect(0, 0, px, px / 2);
  }),
  xadrez_terracota: () => texturaDetalhe(16, 128, (g, px) => {
    g.fillStyle = '#efe4d2'; g.fillRect(0, 0, px, px);
    g.fillStyle = '#8f3f22'; g.fillRect(0, 0, px / 2, px / 2); g.fillRect(px / 2, px / 2, px / 2, px / 2);
  }),
  canelado: () => texturaDetalhe(6, 128, (g, px) => { // estofado com gomos verticais
    const grad = g.createLinearGradient(0, 0, px, 0);
    grad.addColorStop(0, '#9a9a9a'); grad.addColorStop(0.5, '#f0f0f0'); grad.addColorStop(1, '#9a9a9a');
    g.fillStyle = grad; g.fillRect(0, 0, px, px);
  }),
  tweed: () => texturaDetalhe(5, 128, (g, px, r) => {
    for (let y = 0; y < px; y += 2) for (let x = 0; x < px; x += 2) {
      const t = r(); g.fillStyle = t > 0.7 ? '#e9e4da' : t > 0.35 ? '#5b6b85' : '#2c3448'; g.fillRect(x, y, 2, 2);
    }
  }),
  papel: () => texturaDetalhe(12, 128, (g, px) => {
    g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, px, px);
    g.strokeStyle = 'rgba(120,120,120,.35)'; g.lineWidth = 3;
    for (let y = 8; y < px; y += 21) { g.beginPath(); g.moveTo(0, y); g.lineTo(px, y); g.stroke(); }
  }),
};
const TEX = {};
const tex = (nome) => (TEX[nome] ??= GERADORES[nome]());

// Acabamentos: como cada material reage à luz.
const ACAB = {
  padrao:   { roughness: 0.7 },
  tecido:   { roughness: 0.95, tex: 'tecido', bump: 0.5 },
  linho:    { roughness: 0.93, tex: 'tecido', bump: 0.9 },
  veludo:   { fisico: true, roughness: 0.8, sheen: 1, sheenRoughness: 0.3, tex: 'tecido', bump: 0.1 },
  boucle:   { roughness: 1, tex: 'boucle', bump: 2 },
  couro:    { roughness: 0.45, tex: 'couro', bump: 0.4 },
  blackout: { roughness: 0.95, tex: 'tecido', bump: 0.3 },
  voil:     { roughness: 0.9, transparent: true, opacity: 0.5, depthWrite: false, sombra: false, lados: 2 },
  madeira:  { roughness: 0.55, tex: 'madeira', bump: 0.12 },
  palha:    { roughness: 0.8, tex: 'palha', bump: 1.2 },
  laca:     { roughness: 0.28 },
  metal:    { roughness: 0.3, metalness: 0.8 },
  espelho:  { roughness: 0.02, metalness: 1 },
  vidro:    { fisico: true, roughness: 0.04, transparent: true, opacity: 0.25, depthWrite: false, sombra: false },
  tela:     { roughness: 0.12, metalness: 0.3 },
  pedra:    { roughness: 0.35, tex: 'granito' },
  marmore:  { roughness: 0.18, tex: 'marmore' },
  ceramica: { roughness: 0.16 },
  azulejo:  { roughness: 0.22, tex: 'azulejo' },
  planta:   { roughness: 0.55, lados: 2 },
  luz:      { roughness: 0.6, luz: true, lados: 2 },
  granilite: { roughness: 0.28, tex: 'granilite' },
  azulejo_grade: { roughness: 0.18, tex: 'azulejo_grade' },
  xadrez:   { roughness: 0.92, tex: 'xadrez', bump: 0.15 },
  xadrez_terracota: { roughness: 0.92, tex: 'xadrez_terracota', bump: 0.15 },
  canelado: { roughness: 0.92, tex: 'canelado', bump: 3 },
  tweed:    { roughness: 0.95, tex: 'tweed', bump: 0.8 },
  papel:    { roughness: 0.85, tex: 'papel', luz: true, lados: 2 },
};
const NOMES_ACAB = {
  linho: 'Linho', tecido: 'Tecido liso', veludo: 'Veludo', boucle: 'Bouclê', couro: 'Couro', blackout: 'Blackout',
  voil: 'Voil (translúcido)', madeira: 'Madeira', laca: 'Laca', palha: 'Palhinha', marmore: 'Mármore', pedra: 'Granito', metal: 'Metal',
  granilite: 'Granilite', azulejo_grade: 'Azulejo 10×10', xadrez: 'Xadrez vichy', xadrez_terracota: 'Xadrez terracota',
  canelado: 'Canelado', tweed: 'Tweed', azulejo: 'Azulejo metrô',
};
const cacheMat = new Map();
const matsLuz = new Set();
function material(cor, acab = 'padrao') {
  const k = `${cor}|${acab}`;
  if (cacheMat.has(k)) return cacheMat.get(k);
  const a = ACAB[acab] || ACAB.padrao;
  const props = { color: cor, roughness: a.roughness, metalness: a.metalness || 0 };
  if (a.tex) { props.map = tex(a.tex); if (a.bump) { props.bumpMap = tex(a.tex); props.bumpScale = a.bump; } }
  if (a.transparent) Object.assign(props, { transparent: true, opacity: a.opacity, depthWrite: a.depthWrite });
  if (a.lados === 2) props.side = T.DoubleSide;
  if (a.sheen) Object.assign(props, { sheen: a.sheen, sheenRoughness: a.sheenRoughness, sheenColor: new T.Color(cor).lerp(new T.Color('#ffffff'), 0.35) });
  if (a.luz) Object.assign(props, { emissive: new T.Color('#ffd49a'), emissiveIntensity: 0 });
  const mat = a.fisico ? new T.MeshPhysicalMaterial(props) : new T.MeshStandardMaterial(props);
  mat.userData.sombra = a.sombra !== false;
  if (a.luz) matsLuz.add(mat);
  cacheMat.set(k, mat);
  return mat;
}

// ---- expressões do catálogo: números ou fórmulas com L, P, A (medidas do
// móvel), i (índice de repetição) e funções matemáticas básicas.
const NOMES_EXPR = ['L', 'P', 'A', 'i', 'min', 'max', 'abs', 'floor', 'ceil', 'round', 'sin', 'cos', 'sqrt', 'PI'];
const VALORES_EXPR = [Math.min, Math.max, Math.abs, Math.floor, Math.ceil, Math.round, Math.sin, Math.cos, Math.sqrt, Math.PI];
const cacheExpr = new Map();
function avaliar(v, L, P, A, i = 0) {
  if (typeof v === 'number') return v;
  if (v == null || v === '') return 0;
  let f = cacheExpr.get(v);
  if (!f) {
    const nomes = String(v).match(/[A-Za-z_]+/g) || [];
    if (nomes.some((n) => !NOMES_EXPR.includes(n)) || /[^\w\s.,+\-*/()<>=?:!&|%]/.test(v)) throw new Error(`Expressão inválida no catálogo: ${v}`);
    f = new Function(...NOMES_EXPR, `return (${v});`);
    cacheExpr.set(v, f);
  }
  return f(L, P, A, i, ...VALORES_EXPR);
}

// ---- variantes (formatos), acabamentos e áreas de uso
const varianteDe = (def, m) => (def?.variantes ? def.variantes.find((v) => v.id === m.variante) || def.variantes[0] : null);
const partesDe = (def, m) => varianteDe(def, m)?.partes || def?.partes || [];
const usoDe = (def, m) => varianteDe(def, m)?.uso ?? def?.uso ?? [];
const luzDe = (def, m) => varianteDe(def, m)?.luz ?? def?.luz ?? null;
const acaoDe = (def, m) => varianteDe(def, m)?.acao ?? def?.acao ?? 'Abrir';
const temMov = (def, m) => partesDe(def, m).some((p) => p.mov);

function pegada(m) {
  const gira = m.rot % 180 !== 0;
  const w = gira ? m.p : m.l, d = gira ? m.l : m.p;
  return { x0: m.x - w / 2, x1: m.x + w / 2, z0: m.z - d / 2, z1: m.z + d / 2, w, d, y0: m.y || 0, y1: (m.y || 0) + m.a };
}
function encaixar(m) {
  const pg = pegada(m);
  m.x = snap(pg.x0) + pg.w / 2;
  m.z = snap(pg.z0) + pg.d / 2;
}
// Do sistema do móvel (x para a direita, z para a frente) para a planta.
function paraPlanta(m, x, z) {
  if (m.espelhado) x = -x;
  const t = rad(-m.rot);
  return [m.x + x * Math.cos(t) + z * Math.sin(t), m.z - x * Math.sin(t) + z * Math.cos(t)];
}
function retanguloPlanta(m, x0, x1, z0, z1) {
  const a = paraPlanta(m, x0, z0), b = paraPlanta(m, x1, z1);
  return { x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), z0: Math.min(a[1], b[1]), z1: Math.max(a[1], b[1]) };
}
// Pegada usada nas colisões: aberto, inclui portas e gavetas para fora.
function pegadaColisao(m) {
  const pg = pegada(m), def = defCatalogo(m.tipo);
  if (!(m.aberto > 0.02 && temMov(def, m))) return pg;
  const obj = objMovel.get(m.id);
  if (!obj) return pg;
  obj.updateMatrixWorld(true);
  const b = new T.Box3().setFromObject(obj);
  // sobras pequenas (tecido, puxador) não contam: só o que abre de verdade
  const ext = (aberto, fechado, sinal) => ((aberto - fechado) * sinal > 3 ? aberto : fechado);
  return { ...pg, x0: ext(b.min.x, pg.x0, -1), x1: ext(b.max.x, pg.x1, 1), z0: ext(b.min.z, pg.z0, -1), z1: ext(b.max.z, pg.z1, 1) };
}
function zonasUso(m) {
  const def = defCatalogo(m.tipo), { l: L, p: P, a: A } = m;
  return usoDe(def, m).map((u) => ({
    nome: u.nome || 'Área de uso',
    ...retanguloPlanta(m, avaliar(u.x0, L, P, A), avaliar(u.x1, L, P, A), avaliar(u.z0, L, P, A), avaliar(u.z1, L, P, A)),
  }));
}

// Coordenadas de textura em metros, projetadas pela direção de cada face.
function uvMetros(geo) {
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = new Float32Array(pos.count * 2);
  for (let k = 0; k < pos.count; k++) {
    const ax = Math.abs(nor.getX(k)), ay = Math.abs(nor.getY(k)), az = Math.abs(nor.getZ(k));
    const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
    const [u, v] = ax >= ay && ax >= az ? [z, y] : ay >= az ? [x, z] : [x, y];
    uv[k * 2] = u / 100; uv[k * 2 + 1] = v / 100;
  }
  geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
}

function criarParte(pt, m, def, i) {
  const { l: L, p: P, a: A } = m;
  const v = (k, pad = 0) => (pt[k] == null ? pad : avaliar(pt[k], L, P, A, i));
  if (pt.se != null && !v('se')) return null;
  let cor = Array.isArray(pt.cor) ? pt.cor[i % pt.cor.length] : pt.cor;
  cor = !cor || cor === 'principal' ? m.cores.principal : cor === 'secundaria' ? (m.cores.secundaria || '#888888') : cor;
  const acab = pt.acab === '@' ? (m.acab || def.acabamentos?.[0] || 'tecido') : pt.acab;
  const mat = material(cor, acab);
  let geo, y = v('y');
  if (pt.f === 'caixa') {
    const l = v('l'), a = v('a'), p = v('p');
    if (l <= 0 || a <= 0 || p <= 0) return null;
    const r = Math.min(v('r'), l / 2 - 0.01, a / 2 - 0.01, p / 2 - 0.01);
    geo = r > 0.2 ? new T.RoundedBoxGeometry(l, a, p, 3, r) : new T.BoxGeometry(l, a, p);
    y += a / 2;
  } else if (pt.f === 'cil') {
    const a = v('a');
    if (a <= 0) return null;
    if (pt.l != null) { // elíptico: largura l e profundidade p
      const l = v('l'), p = v('p', l);
      if (l <= 0 || p <= 0) return null;
      geo = new T.CylinderGeometry(0.5 * v('k', 1), 0.5, a, 40);
      geo.scale(l, 1, p);
    } else {
      const raio = v('raio'), raio2 = pt.raio2 == null ? raio : v('raio2');
      if (raio <= 0 && raio2 <= 0) return null;
      geo = new T.CylinderGeometry(raio2, raio, a, 24);
    }
    if (pt.eixo === 'x') geo.rotateZ(-Math.PI / 2);
    else if (pt.eixo === 'z') geo.rotateX(Math.PI / 2);
    else y += a / 2;
  } else if (pt.f === 'esfera') {
    const raio = v('raio');
    if (raio <= 0) return null;
    geo = new T.SphereGeometry(raio, 20, 14);
    geo.scale(v('ex', 1), v('ey', 1), v('ez', 1));
    y += raio * v('ey', 1);
  } else if (pt.f === 'torno') {
    const pts = pt.pts.map(([r, h]) => new T.Vector2(Math.max(0.01, avaliar(r, L, P, A, i)), avaliar(h, L, P, A, i)));
    geo = new T.LatheGeometry(pts, 28);
  } else return null;
  uvMetros(geo);
  const pos = new T.Vector3(v('x'), y, v('z'));
  const rot = new T.Euler(rad(v('rx')), rad(v('ry')), rad(v('rz')));
  let mov = null;
  if (pt.mov) {
    const mv = pt.mov, e = (k, pad = 0) => (mv[k] == null ? pad : avaliar(mv[k], L, P, A, i));
    mov = {
      pivo: new T.Vector3(e('px', pos.x), e('py', pos.y), e('pz', pos.z)),
      eixo: mv.eixo || 'y', ang: rad(e('gira')),
      desl: mv.desliza ? new T.Vector3(...mv.desliza.map((d) => avaliar(d, L, P, A, i))) : null,
      esc: mv.escala ? mv.escala.map((d) => avaliar(d, L, P, A, i)) : null,
    };
  }
  return { geo, mat, pos, rot, mov };
}

function aplicarAbertura(g, k) {
  for (const a of g.userData.anim || []) {
    a.g.rotation.set(0, 0, 0);
    if (a.ang) a.g.rotation[a.eixo] = a.ang * k;
    a.g.position.copy(a.pivo);
    if (a.desl) a.g.position.addScaledVector(a.desl, k);
    if (a.esc) a.g.scale.set(1 + (a.esc[0] - 1) * k, 1 + (a.esc[1] - 1) * k, 1 + (a.esc[2] - 1) * k);
  }
}

function construirMovel(m) {
  const def = defCatalogo(m.tipo);
  const g = new T.Group();
  const interno = new T.Group();
  g.add(interno);
  const anim = [];
  if (def?.modelo) {
    const mod = modelos.get(def.modelo);
    if (mod) {
      const c = mod.cena.clone(true);
      c.position.set(-mod.centro.x, -mod.base, -mod.centro.z);
      const env = new T.Group();
      env.scale.set(m.l / mod.tam.x, m.a / mod.tam.y, m.p / mod.tam.z);
      env.add(c);
      c.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.userData.compartilhado = true; } });
      interno.add(env);
    } else {
      interno.add(caixa(m.l, m.a, m.p, material('#c8ccd2'), 0, m.a / 2, 0)); // modelo ainda carregando
    }
  } else if (def) {
    const fixas = new Map(); // material → geometrias já posicionadas
    for (const pt of partesDe(def, m)) {
      let n = 1;
      try { if (pt.n != null) n = Math.max(0, Math.min(300, Math.floor(avaliar(pt.n, m.l, m.p, m.a)))); } catch (err) { console.warn(err); }
      for (let i = 0; i < n; i++) {
        let r;
        try { r = criarParte(pt, m, def, i); } catch (err) { console.warn(err); }
        if (!r) continue;
        if (r.mov) {
          const mesh = new T.Mesh(r.geo, r.mat);
          mesh.castShadow = r.mat.userData.sombra; mesh.receiveShadow = true;
          mesh.position.copy(r.pos).sub(r.mov.pivo);
          mesh.rotation.copy(r.rot);
          const piv = new T.Group();
          piv.add(mesh);
          interno.add(piv);
          anim.push({ g: piv, ...r.mov });
        } else {
          r.geo.applyMatrix4(new T.Matrix4().compose(r.pos, new T.Quaternion().setFromEuler(r.rot), new T.Vector3(1, 1, 1)));
          if (!fixas.has(r.mat)) fixas.set(r.mat, []);
          fixas.get(r.mat).push(r.geo);
        }
      }
    }
    for (const [mat, geos0] of fixas) {
      // juntar exige todas indexadas ou todas não indexadas
      const misto = geos0.some((gg) => gg.index) && geos0.some((gg) => !gg.index);
      const geos = misto ? geos0.map((gg) => { if (!gg.index) return gg; const n = gg.toNonIndexed(); gg.dispose(); return n; }) : geos0;
      const unida = geos.length > 1 ? T.mergeGeometries(geos, false) : geos[0];
      const lista = unida ? [unida] : geos;
      if (unida && unida !== geos[0]) for (const gg of geos) gg.dispose();
      for (const geo of lista) {
        const mesh = new T.Mesh(geo, mat);
        mesh.castShadow = mat.userData.sombra; mesh.receiveShadow = true;
        interno.add(mesh);
      }
    }
    const lz = luzDe(def, m);
    if (lz) {
      const luzP = new T.PointLight(lz.cor || '#ffd49a', 0, 520, 1);
      luzP.position.set(avaliar(lz.x, m.l, m.p, m.a), avaliar(lz.y, m.l, m.p, m.a), avaliar(lz.z, m.l, m.p, m.a));
      luzP.userData.base = lz.intensidade ?? 90;
      interno.add(luzP);
    }
  } else {
    interno.add(caixa(m.l, m.a, m.p, material('#e5484d'), 0, m.a / 2, 0));
  }
  interno.scale.x = m.espelhado ? -1 : 1;
  g.position.set(m.x, m.y || 0, m.z);
  g.rotation.y = (-m.rot * Math.PI) / 180;
  g.userData.anim = anim;
  aplicarAbertura(g, m.aberto || 0);
  g.traverse((o) => { o.userData.tipo ??= 'movel'; o.userData.id ??= m.id; });
  return g;
}

function construirMoveis() {
  limpar(grpMoveis);
  objMovel.clear();
  for (const m of cen().moveis) {
    const g = construirMovel(m);
    grpMoveis.add(g);
    objMovel.set(m.id, g);
  }
  aplicarVisibilidadeTopo();
  luzesMoveis = [];
  grpMoveis.traverse((o) => { if (o.isPointLight) luzesMoveis.push(o); });
  luzesMoveis.slice(8).forEach((l) => { l.visible = false; }); // limite para o celular
  aplicarSol();
  for (const f of EXTENSOES.aposMoveis) f(grpMoveis, cen());
}

// Na vista de cima (planta baixa), o que fica no alto — pendentes,
// prateleiras, armários aéreos — some para mostrar o que está embaixo.
function aplicarVisibilidadeTopo() {
  for (const m of cen().moveis) {
    const obj = objMovel.get(m.id);
    if (obj) obj.visible = !(vista.topo && (m.y || 0) >= 140);
  }
}

// Abre/fecha com animação (portas, gavetas, sofá retrátil, persianas…).
let animando = null;
function alternarAbertura(m) {
  const alvo = (m.aberto || 0) > 0.5 ? 0 : 1;
  const de = m.aberto || 0, t0 = performance.now(), dur = 650;
  registrar();
  cancelAnimationFrame(animando);
  const passo = (agora) => {
    const t = Math.min(1, (agora - t0) / dur), k = t * t * (3 - 2 * t);
    m.aberto = de + (alvo - de) * k;
    const obj = objMovel.get(m.id);
    if (obj) aplicarAbertura(obj, m.aberto);
    if (t < 1) animando = requestAnimationFrame(passo);
    else { m.aberto = alvo; atualizarTudo(); }
  };
  animando = requestAnimationFrame(passo);
}

// =====================================================================
// 7. COLISÕES, ÁREAS DE USO E PORTAS
// =====================================================================
// Três verificações: móveis que se sobrepõem (inclusive com portas e
// gavetas abertas), áreas de uso bloqueadas (o espaço para puxar a
// cadeira, abrir o guarda-roupa, sentar no sofá) e móveis no caminho do
// abrir das portas.
let colisoes = { porMovel: new Map(), lista: [], usoBloq: new Set(), portasBloq: new Set() };

function sobrepoe(a, b) {
  return Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > CFG.tolColisao &&
         Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) > CFG.tolColisao;
}
const sobrepoeAltura = (a, b) => Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > CFG.tolColisao;
function caixaParede(w) {
  const e = w.esp / 2;
  return { x0: Math.min(w.x1, w.x2) - e, x1: Math.max(w.x1, w.x2) + e, z0: Math.min(w.z1, w.z2) - e, z1: Math.max(w.z1, w.z2) + e, y0: 0, y1: 9999 };
}
const ignoraPar = (a, b) => (a.ignora || []).includes(b.grupo) || (b.ignora || []).includes(a.grupo);

// Giro de cada porta: dobradiça, raio e os dois sentidos do quarto de círculo.
function girosPortas() {
  const pl = doc.planta, lista = [];
  for (const ab of pl.aberturas) {
    if (ab.tipo !== 'porta') continue;
    const w = pl.paredes.find((p) => p.id === ab.parede);
    if (!w || w.demolida) continue;
    const hz = horizontal(w), u = hz ? [1, 0] : [0, 1], vv = hz ? [0, 1] : [-1, 0];
    const noInicio = ab.dobradica !== 'fim', lado = ab.lado === -1 ? -1 : 1;
    const uh = noInicio ? ab.pos + 3 : ab.pos + ab.largura - 3, v0 = (lado * w.esp) / 2;
    lista.push({
      ab, nome: ab.id === 'porta-entrada' ? 'porta de entrada' : `porta (${w.nome})`, R: ab.largura - 6,
      c: [w.x1 + u[0] * uh + vv[0] * v0, w.z1 + u[1] * uh + vv[1] * v0],
      du: [u[0] * (noInicio ? 1 : -1), u[1] * (noInicio ? 1 : -1)], dv: [vv[0] * lado, vv[1] * lado],
    });
  }
  return lista;
}
function bloqueiaGiro(pg, giro) {
  for (let ri = 1; ri <= 5; ri++) for (let ti = 0; ti <= 6; ti++) {
    const r = (giro.R * ri) / 5.2, t = (Math.PI / 2) * (0.04 + (ti / 6) * 0.92);
    if (r * Math.sin(t) < 5) continue; // folha praticamente fechada, no plano da parede
    const x = giro.c[0] + giro.du[0] * r * Math.cos(t) + giro.dv[0] * r * Math.sin(t);
    const z = giro.c[1] + giro.du[1] * r * Math.cos(t) + giro.dv[1] * r * Math.sin(t);
    if (x > pg.x0 + 0.5 && x < pg.x1 - 0.5 && z > pg.z0 + 0.5 && z < pg.z1 - 0.5) return true;
  }
  return false;
}

function verificarColisoes() {
  const porMovel = new Map(), lista = [], usoBloq = new Set(), portasBloq = new Set();
  const marcar = (id, txt) => { if (!porMovel.has(id)) porMovel.set(id, []); porMovel.get(id).push(txt); };
  const itens = cen().moveis.map((m) => ({ m, def: defCatalogo(m.tipo) || {}, pg: pegadaColisao(m) }))
    .filter((it) => it.def.colide !== false);
  const paredes = doc.planta.paredes.filter((w) => !w.demolida).map((w) => ({ w, cx: caixaParede(w) }));
  for (let i = 0; i < itens.length; i++) {
    const A = itens[i];
    for (let j = i + 1; j < itens.length; j++) {
      const B = itens[j];
      if (ignoraPar(A.def, B.def) || !sobrepoe(A.pg, B.pg) || !sobrepoeAltura(A.pg, B.pg)) continue;
      marcar(A.m.id, B.m.nome); marcar(B.m.id, A.m.nome);
      lista.push({ ids: [A.m.id, B.m.id], txt: `${A.m.nome} × ${B.m.nome}` });
    }
    for (const { w, cx } of paredes) {
      if (!sobrepoe(A.pg, cx)) continue;
      marcar(A.m.id, `parede ${w.nome}`);
      lista.push({ ids: [A.m.id], txt: `${A.m.nome} × parede ${w.nome}` });
    }
    // área de uso: o que estiver no chão (até 1 m de altura) atrapalha
    zonasUso(A.m).forEach((z, k) => {
      const quem = [
        ...itens.filter((B) => B !== A && !ignoraPar(A.def, B.def) && B.pg.y0 < 60 && sobrepoe(z, B.pg)).map((B) => B.m.nome),
        ...paredes.filter(({ cx }) => sobrepoe(z, cx)).map(({ w }) => `parede ${w.nome}`),
      ];
      if (!quem.length) return;
      usoBloq.add(`${A.m.id}#${k}`);
      marcar(A.m.id, `${z.nome.toLowerCase()} bloqueada por ${quem.join(', ')}`);
      lista.push({ ids: [A.m.id], txt: `${A.m.nome}: ${z.nome.toLowerCase()} bloqueada`, tipo: 'uso' });
    });
  }
  for (const giro of girosPortas()) {
    for (const B of itens) {
      if (B.pg.y0 >= 60 || !bloqueiaGiro(B.pg, giro)) continue;
      portasBloq.add(giro.ab.id);
      marcar(B.m.id, `no caminho da ${giro.nome}`);
      lista.push({ ids: [B.m.id], txt: `${B.m.nome} bloqueia a ${giro.nome}`, tipo: 'porta' });
    }
  }
  colisoes = { porMovel, lista, usoBloq, portasBloq };
  renderAvisos();
}

// ---- cotas: distância livre do móvel selecionado até o obstáculo mais
// próximo em cada direção (parede ou outro móvel na mesma altura).
function calcularCotas(m) {
  const pg = pegada(m), obst = [];
  for (const w of doc.planta.paredes) if (!w.demolida) obst.push(caixaParede(w));
  for (const o of cen().moveis) {
    if (o.id === m.id || defCatalogo(o.tipo)?.colide === false) continue;
    const po = pegada(o);
    if (sobrepoeAltura(po, pg)) obst.push(po);
  }
  const cotas = [];
  const dirs = [['x', 1], ['x', -1], ['z', 1], ['z', -1]];
  for (const [eixo, s] of dirs) {
    const [a0, a1, b0, b1] = eixo === 'x' ? ['x0', 'x1', 'z0', 'z1'] : ['z0', 'z1', 'x0', 'x1'];
    const borda = s > 0 ? pg[a1] : pg[a0];
    let melhor = Infinity;
    for (const o of obst) {
      if (Math.min(o[b1], pg[b1]) - Math.max(o[b0], pg[b0]) <= 1) continue; // não está na frente
      const d = s > 0 ? o[a0] - borda : borda - o[a1];
      if (d > -0.5 && d < melhor) melhor = Math.max(0, d);
    }
    if (!Number.isFinite(melhor) || melhor > 800) continue;
    const meio = (pg[b0] + pg[b1]) / 2;
    const p1 = eixo === 'x' ? [borda, meio] : [meio, borda];
    const p2 = eixo === 'x' ? [borda + s * melhor, meio] : [meio, borda + s * melhor];
    cotas.push({ eixo, s, dist: melhor, p1, p2 });
  }
  return cotas;
}

// =====================================================================
// 8. SELEÇÃO E ARRASTE
// =====================================================================
const matSel = new T.MeshBasicMaterial({ color: CFG.corSel, transparent: true, opacity: 0.16, depthWrite: false });
const matCol = new T.MeshBasicMaterial({ color: CFG.corColisao, transparent: true, opacity: 0.28, depthWrite: false });
const matUso = new T.MeshBasicMaterial({ color: '#27ae60', transparent: true, opacity: 0.16, depthWrite: false });
const matUsoBloq = new T.MeshBasicMaterial({ color: CFG.corColisao, transparent: true, opacity: 0.26, depthWrite: false });
const matPorta = new T.MeshBasicMaterial({ color: '#f2994a', transparent: true, opacity: 0.16, depthWrite: false });
const linhaSel = new T.LineBasicMaterial({ color: CFG.corSel });
const linhaCol = new T.LineBasicMaterial({ color: CFG.corColisao });
const linhaUso = new T.LineDashedMaterial({ color: '#1e8449', dashSize: 6, gapSize: 4 });
const linhaCota = new T.LineBasicMaterial({ color: '#1d2530' });

// O que aparece sobre a planta (painel "Mostrar").
const camadas = Object.assign({ uso: false, cantos: false, cotas: true },
  (() => { try { return JSON.parse(localStorage.getItem('simulador-apto:camadas')) || {}; } catch { return {}; } })());
const guardarCamadas = () => { try { localStorage.setItem('simulador-apto:camadas', JSON.stringify(camadas)); } catch { /* ok */ } };

function contornoTracejado(pts, mat, y) {
  const l = new T.Line(new T.BufferGeometry().setFromPoints([...pts, pts[0]].map(([x, z]) => new T.Vector3(x, y, z))), mat);
  l.computeLineDistances();
  return l;
}
const retPts = (r) => [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]];

function desenharSelecao() {
  limpar(grpSel);
  const marca = (m, fundo, linha) => {
    const pg = pegada(m);
    const q = new T.Mesh(new T.PlaneGeometry(pg.w, pg.d), fundo);
    q.rotation.x = -Math.PI / 2; q.position.set(m.x, 0.7, m.z);
    grpSel.add(q);
    const obj = objMovel.get(m.id);
    if (obj) grpSel.add(new T.Box3Helper(new T.Box3().setFromObject(obj), linha.color));
  };
  if (!vista.caminhar) for (const id of colisoes.porMovel.keys()) { const m = movel(id); if (m) marca(m, matCol, linhaCol); }
  const selM = sel?.tipo === 'movel' ? movel(sel.id) : null;
  if (selM) marca(selM, matSel, linhaSel);
  if (vista.caminhar) return;
  // áreas de uso: de todos (camada ligada) ou só do móvel selecionado
  for (const m of cen().moveis) {
    if (!camadas.uso && m !== selM) continue;
    zonasUso(m).forEach((z, k) => {
      const bloq = colisoes.usoBloq.has(`${m.id}#${k}`);
      grpSel.add(malhaPoligono(retPts(z), bloq ? matUsoBloq : matUso, 0.5));
      grpSel.add(contornoTracejado(retPts(z), bloq ? linhaCol : linhaUso, 0.6));
    });
  }
  // giro das portas: todas com a camada ligada; bloqueadas sempre
  for (const giro of girosPortas()) {
    const bloq = colisoes.portasBloq.has(giro.ab.id);
    if (!camadas.uso && !bloq) continue;
    const pts = [giro.c];
    for (let k = 0; k <= 16; k++) {
      const t = (k / 16) * (Math.PI / 2);
      pts.push([giro.c[0] + (giro.du[0] * Math.cos(t) + giro.dv[0] * Math.sin(t)) * giro.R,
                giro.c[1] + (giro.du[1] * Math.cos(t) + giro.dv[1] * Math.sin(t)) * giro.R]);
    }
    grpSel.add(malhaPoligono(pts, bloq ? matUsoBloq : matPorta, 0.45));
  }
  desenharCotas(selM);
}

// ---- cotas (linhas + rótulos clicáveis para digitar a distância)
const camadaCotas = $('#cotas');
let cotasTela = [];
function desenharCotas(m) {
  camadaCotas.textContent = '';
  cotasTela = [];
  if (!m || !camadas.cotas || vista.caminhar) return;
  const y = (m.y || 0) + 1.5;
  for (const c of calcularCotas(m)) {
    const [x1, z1] = c.p1, [x2, z2] = c.p2;
    const pts = [new T.Vector3(x1, y, z1), new T.Vector3(x2, y, z2)];
    const per = c.eixo === 'x' ? [0, 6] : [6, 0]; // tracinhos nas pontas
    for (const [x, z] of [c.p1, c.p2]) pts.push(new T.Vector3(x - per[0], y, z - per[1]), new T.Vector3(x + per[0], y, z + per[1]));
    grpSel.add(new T.LineSegments(new T.BufferGeometry().setFromPoints([pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]]), linhaCota));
    const bt = el('button', { type: 'button', class: 'cota', title: 'Clique para digitar a distância' }, `${fmt(c.dist)}`);
    bt.addEventListener('pointerdown', (e) => e.stopPropagation());
    bt.addEventListener('click', () => editarCota(bt, m, c));
    camadaCotas.append(bt);
    cotasTela.push({ el: bt, pos: new T.Vector3((x1 + x2) / 2, y, (z1 + z2) / 2) });
  }
}
function editarCota(bt, m, c) {
  const inp = el('input', { type: 'text', inputmode: 'decimal', value: fmt(c.dist), class: 'cota-campo' });
  bt.replaceWith(inp);
  const item = cotasTela.find((t) => t.el === bt);
  if (item) item.el = inp;
  inp.focus(); inp.select();
  let feito = false;
  const aplicar = () => {
    if (feito) return; feito = true;
    const v = numero(inp.value);
    if (!Number.isFinite(v) || v < 0 || Math.abs(v - c.dist) < 0.05) { desenharSelecao(); return; }
    const delta = (c.dist - v) * c.s;
    alterar(() => { if (c.eixo === 'x') m.x += delta; else m.z += delta; });
  };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') aplicar(); if (e.key === 'Escape') { feito = true; desenharSelecao(); } });
  inp.addEventListener('blur', aplicar);
}

// ---- cantos: zonas de função (home office, jantar, TV…) desenhadas no piso
const FUNCOES = {
  office:     { nome: 'Home office', cor: '#2f80ed' },
  estar:      { nome: 'TV / estar', cor: '#9b51e0' },
  jantar:     { nome: 'Jantar', cor: '#f2994a' },
  dormir:     { nome: 'Dormir', cor: '#27ae60' },
  cozinha:    { nome: 'Cozinha', cor: '#eb5757' },
  banho:      { nome: 'Banho', cor: '#2d9cdb' },
  leitura:    { nome: 'Leitura', cor: '#bb6bd9' },
  circulacao: { nome: 'Circulação', cor: '#828282' },
  servico:    { nome: 'Serviço', cor: '#a0785a' },
  outro:      { nome: 'Outro', cor: '#4f4f4f' },
};
const grpZonas = new T.Group();
cena.add(grpZonas);
let rotulosZonas = [];
const zona = (id) => (cen().zonas || []).find((z) => z.id === id);
const retZona = (z) => ({ x0: z.x - z.l / 2, x1: z.x + z.l / 2, z0: z.z - z.p / 2, z1: z.z + z.p / 2 });

function construirZonas() {
  limpar(grpZonas);
  rotulosZonas.forEach((r) => r.div.remove());
  rotulosZonas = [];
  if (!camadas.cantos || vista.caminhar) return;
  for (const z of cen().zonas || []) {
    const f = FUNCOES[z.funcao] || FUNCOES.outro, ativo = sel?.tipo === 'zona' && sel.id === z.id;
    const r = retZona(z);
    const fundo = malhaPoligono(retPts(r), new T.MeshBasicMaterial({ color: f.cor, transparent: true, opacity: ativo ? 0.2 : 0.09, depthWrite: false }), 0.35);
    fundo.userData = { tipo: 'zona', id: z.id };
    grpZonas.add(fundo, contornoTracejado(retPts(r), new T.LineDashedMaterial({ color: f.cor, dashSize: ativo ? 14 : 9, gapSize: 6 }), 0.4));
    const div = el('div', { class: 'rotulo-zona' + (ativo ? ' ativo' : ''), style: `--cor:${f.cor}` }, z.nome || f.nome);
    camadaRotulos.append(div);
    rotulosZonas.push({ div, canto: true, pos: new T.Vector3(r.x0 + 4, 1, r.z0 + 4) });
  }
}
function moveisNaZona(z) {
  const r = retZona(z);
  return cen().moveis.filter((m) => m.x > r.x0 && m.x < r.x1 && m.z > r.z0 && m.z < r.z1);
}
function novaZona() {
  const rc = tela.getBoundingClientRect();
  let p = pontoNoPiso({ clientX: rc.left + rc.width / 2, clientY: rc.top + rc.height / 2 });
  if (!p || !dentro([p.x, p.z], doc.planta.contorno)) p = { x: 150, z: 150 };
  const z = { id: novoId('z'), funcao: 'outro', x: snap(p.x), z: snap(p.z), l: 150, p: 150 };
  camadas.cantos = true; guardarCamadas();
  alterar(() => { (cen().zonas ||= []).push(z); });
  selecionar({ tipo: 'zona', id: z.id });
}

// ---- caminhar pelo apartamento (câmera na altura dos olhos)
const andar = { yaw: Math.PI / 2, pitch: -0.12, x: 380, z: 395, orbita: null, anim: 0 };
function aplicarCameraAndar() {
  camPersp.position.set(andar.x, 160, andar.z);
  camPersp.rotation.set(andar.pitch, andar.yaw, 0, 'YXZ');
}
function alternarCaminhada() {
  vista.caminhar = !vista.caminhar;
  if (vista.caminhar) {
    if (vista.topo) { vista.topo = false; ctlTopo.enabled = false; }
    andar.orbita = { pos: camPersp.position.clone(), alvo: ctlPersp.target.clone() };
    ctlPersp.enabled = false;
    camPersp.fov = 70; camPersp.updateProjectionMatrix();
    aplicarCameraAndar();
    toast('Arraste para olhar em volta; toque no piso para andar até lá. W/A/S/D também andam.');
  } else {
    camPersp.fov = 42; camPersp.updateProjectionMatrix();
    if (andar.orbita) { camPersp.position.copy(andar.orbita.pos); ctlPersp.target.copy(andar.orbita.alvo); }
    ctlPersp.enabled = true; ctlPersp.update();
  }
  document.body.classList.toggle('caminhando', vista.caminhar);
  construirPlanta(); construirZonas(); desenharSelecao(); atualizarBotoes();
}
function andarPara(x, z) {
  const de = { x: andar.x, z: andar.z }, t0 = performance.now(), dur = Math.min(900, 250 + Math.hypot(x - de.x, z - de.z) * 2.5);
  cancelAnimationFrame(andar.anim);
  const passo = (agora) => {
    const t = Math.min(1, (agora - t0) / dur), k = t * t * (3 - 2 * t);
    andar.x = de.x + (x - de.x) * k; andar.z = de.z + (z - de.z) * k;
    aplicarCameraAndar();
    if (t < 1) andar.anim = requestAnimationFrame(passo);
  };
  andar.anim = requestAnimationFrame(passo);
}
function passoAndar(frente, lado) {
  const s = Math.sin(andar.yaw), c = Math.cos(andar.yaw);
  const x = andar.x - s * frente + c * lado, z = andar.z - c * frente - s * lado;
  if (dentro([x, z], doc.planta.contorno)) { andar.x = x; andar.z = z; aplicarCameraAndar(); }
}

function selecionar(s) {
  sel = s;
  construirPlanta();
  construirZonas();
  desenharSelecao();
  renderPainel();
  renderAreas();
  renderCantos();
}

const ray = new T.Raycaster();
const planoPiso = new T.Plane(new T.Vector3(0, 1, 0), 0);
function raioDe(e) {
  const r = renderer.domElement.getBoundingClientRect();
  cena.updateMatrixWorld();
  camAtiva().updateMatrixWorld();
  ray.setFromCamera(new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camAtiva());
}
function alvoEm(e) {
  raioDe(e);
  for (const h of ray.intersectObjects([grpMoveis, grpZonas, grpPlanta], true)) {
    const u = h.object.userData;
    if (u.tipo) return { tipo: u.tipo, id: u.id, abertura: u.abertura };
  }
  return null;
}
function pontoNoPiso(e) {
  raioDe(e);
  return ray.ray.intersectPlane(planoPiso, new T.Vector3());
}

const toques = new Map();
let arr = null; // gesto em andamento

function aoPressionar(e) {
  toques.set(e.pointerId, true);
  if (foto.ativa) {
    if (vista.caminhar && toques.size === 1) {
      arr = { id: e.pointerId, x: e.clientX, y: e.clientY, alvo: null, movido: false, olhar: true, yaw0: andar.yaw, pitch0: andar.pitch };
      renderer.domElement.setPointerCapture(e.pointerId);
    }
    return;
  }
  if (toques.size > 1) { if (arr?.arrastavel) cancelarArraste(); arr = null; return; }
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const alvo = alvoEm(e);
  arr = { id: e.pointerId, x: e.clientX, y: e.clientY, alvo, movido: false };
  const jaSel = (tipo) => alvo?.tipo === tipo && sel?.tipo === tipo && sel.id === alvo.id;
  const paredeSel = jaSel('parede') && !parede(alvo.id)?.demolida;
  if (alvo?.tipo === 'movel' || paredeSel || jaSel('zona')) {
    const inicio = pontoNoPiso(e);
    if (!inicio) return;
    ctlAtivo().enabled = false;
    Object.assign(arr, { arrastavel: true, estado: JSON.stringify(doc), inicio });
    if (alvo.tipo === 'movel') {
      const m = movel(alvo.id);
      Object.assign(arr, { x0: m.x, z0: m.z });
      if (sel?.id !== m.id) selecionar({ tipo: 'movel', id: m.id });
    } else if (alvo.tipo === 'zona') {
      const z = zona(alvo.id);
      Object.assign(arr, { x0: z.x, z0: z.z });
    } else {
      arr.planta0 = clonar(doc.planta);
      arr.delta = 0;
    }
    renderer.domElement.setPointerCapture(e.pointerId);
  } else if (vista.caminhar) {
    Object.assign(arr, { olhar: true, yaw0: andar.yaw, pitch0: andar.pitch });
    renderer.domElement.setPointerCapture(e.pointerId);
  }
}

function aoMover(e) {
  if (!arr || e.pointerId !== arr.id) return;
  if (!arr.movido && Math.hypot(e.clientX - arr.x, e.clientY - arr.y) > 4) arr.movido = true;
  if (arr.olhar && arr.movido) {
    andar.yaw = arr.yaw0 + (e.clientX - arr.x) * 0.0045;
    andar.pitch = Math.max(-1.2, Math.min(1.2, arr.pitch0 + (e.clientY - arr.y) * 0.0045));
    aplicarCameraAndar();
    return;
  }
  if (!arr.arrastavel || !arr.movido) return;
  const p = pontoNoPiso(e);
  if (!p) return;
  if (arr.alvo.tipo === 'movel') {
    const m = movel(arr.alvo.id);
    m.x = arr.x0 + (p.x - arr.inicio.x);
    m.z = arr.z0 + (p.z - arr.inicio.z);
    encaixar(m);
    objMovel.get(m.id)?.position.set(m.x, m.y || 0, m.z);
    verificarColisoes();
    desenharSelecao();
    renderPainelPosicao();
  } else if (arr.alvo.tipo === 'zona') {
    const z = zona(arr.alvo.id);
    z.x = snap(arr.x0 + (p.x - arr.inicio.x) - z.l / 2) + z.l / 2;
    z.z = snap(arr.z0 + (p.z - arr.inicio.z) - z.p / 2) + z.p / 2;
    construirZonas();
  } else {
    const w0 = arr.planta0.paredes.find((w) => w.id === arr.alvo.id);
    const hz = horizontal(w0);
    const d = snap(hz ? p.z - arr.inicio.z : p.x - arr.inicio.x);
    if (d === arr.delta) return;
    const nova = clonar(arr.planta0);
    if (hz) esticar(nova, 'z', w0.z1, w0.x1, w0.x2, d);
    else esticar(nova, 'x', w0.x1, w0.z1, w0.z2, d);
    if (problemaPlanta(nova, arr.planta0)) return;
    arr.delta = d;
    doc.planta = nova;
    construirPlanta();
    verificarColisoes();
    desenharSelecao();
    renderAreas();
    dica(`${d > 0 ? '+' : ''}${d} cm`);
  }
}

function aoSoltar(e) {
  toques.delete(e.pointerId);
  if (!arr || e.pointerId !== arr.id) return;
  const g = arr;
  arr = null;
  if (g.arrastavel) {
    ctlAtivo().enabled = !vista.caminhar;
    if (g.movido) { registrar(g.estado); atualizarTudo(); }
    dica('');
    return;
  }
  if (g.olhar && (g.movido || foto.ativa)) return;
  if (g.movido) return; // foi órbita/arraste de câmera
  const a = g.alvo;
  if (vista.caminhar && (!a || a.tipo === 'ambiente' || a.tipo === 'zona')) {
    const p = pontoNoPiso(e);
    if (p && dentro([p.x, p.z], doc.planta.contorno)) andarPara(p.x, p.z);
    if (sel) selecionar(null);
    return;
  }
  if (!a) selecionar(null);
  else if (a.tipo === 'parede') selecionar({ tipo: 'parede', id: a.id, abertura: a.abertura });
  else if (a.tipo === 'ambiente') selecionar({ tipo: 'ambiente', id: a.id });
  else if (a.tipo === 'zona') selecionar({ tipo: 'zona', id: a.id });
}

function cancelarArraste() {
  if (!arr) return;
  ctlAtivo().enabled = !vista.caminhar;
  doc = JSON.parse(arr.estado);
  arr = null;
  atualizarTudo();
}

const tela = renderer.domElement;
tela.addEventListener('pointerdown', aoPressionar, { capture: true });
tela.addEventListener('pointermove', aoMover);
tela.addEventListener('pointerup', aoSoltar);
tela.addEventListener('pointercancel', aoSoltar);
tela.addEventListener('contextmenu', (e) => e.preventDefault());

// ---- ações sobre móveis
function adicionarMovel(tipo) {
  const def = defCatalogo(tipo);
  if (!def) return;
  // coloca no ponto do piso que está no centro da tela (ou no centro da sala)
  const r = tela.getBoundingClientRect();
  let p = vista.caminhar
    ? { x: andar.x - Math.sin(andar.yaw) * 120, z: andar.z - Math.cos(andar.yaw) * 120 }
    : pontoNoPiso({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
  const cont = doc.planta.contorno;
  if (!p || !dentro([p.x, p.z], cont)) {
    const [x, z] = centroRotulo(poligonoUtil(doc.planta.ambientes.find((a) => a.id === 'sala') || doc.planta.ambientes[0]));
    p = { x, z };
  }
  const m = prepararMovel({ tipo, x: p.x, z: p.z, rot: 0 });
  encaixar(m);
  alterar(() => cen().moveis.push(m));
  selecionar({ tipo: 'movel', id: m.id });
}
function girar(sentido = 1) {
  const m = sel?.tipo === 'movel' && movel(sel.id);
  if (m) alterar(() => { m.rot = (m.rot + 90 * sentido + 360) % 360; });
}
function removerSelecionado() {
  if (sel?.tipo !== 'movel') return;
  const id = sel.id;
  alterar(() => { cen().moveis = cen().moveis.filter((m) => m.id !== id); });
  selecionar(null);
}
function duplicarSelecionado() {
  const m = sel?.tipo === 'movel' && movel(sel.id);
  if (!m) return;
  const c = { ...clonar(m), id: novoId('m'), x: m.x + 20, z: m.z + 20 };
  encaixar(c);
  alterar(() => cen().moveis.push(c));
  selecionar({ tipo: 'movel', id: c.id });
}
function empurrar(dx, dz) {
  const m = sel?.tipo === 'movel' && movel(sel.id);
  if (m) alterar(() => { m.x += dx; m.z += dz; });
}

// ---- teclado
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select, dialog')) return;
  const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (foto.ativa) { if (k === 'escape') fecharFoto(); return; }
  if (ctrl && k === 'z' && !e.shiftKey) { e.preventDefault(); desfazer(); }
  else if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); refazer(); }
  else if (ctrl && k === 'd') { e.preventDefault(); duplicarSelecionado(); }
  else if (ctrl) return;
  else if (k === 'delete' || k === 'backspace') { e.preventDefault(); removerSelecionado(); }
  else if (vista.caminhar && ['w', 's', 'a', 'd'].includes(k)) {
    passoAndar(k === 'w' ? 30 : k === 's' ? -30 : 0, k === 'd' ? 30 : k === 'a' ? -30 : 0);
  }
  else if (vista.caminhar && k.startsWith('arrow') && sel?.tipo !== 'movel') {
    e.preventDefault();
    if (k === 'arrowup' || k === 'arrowdown') passoAndar(k === 'arrowup' ? 30 : -30, 0);
    else { andar.yaw += k === 'arrowleft' ? 0.15 : -0.15; aplicarCameraAndar(); }
  }
  else if (k === 'r') girar(e.shiftKey ? -1 : 1);
  else if (k === 't') alternarVista();
  else if (k === 'c') alternarCaminhada();
  else if (k === 'escape') selecionar(null);
  else if (k.startsWith('arrow')) {
    e.preventDefault();
    const s = e.shiftKey ? 25 : CFG.grade;
    empurrar(k === 'arrowleft' ? -s : k === 'arrowright' ? s : 0, k === 'arrowup' ? -s : k === 'arrowdown' ? s : 0);
  }
});

// =====================================================================
// 9. PAINÉIS E BARRA
// =====================================================================
const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString('pt-BR');
const m2 = (v) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;
const numero = (s) => parseFloat(String(s).replace(',', '.'));

function el(tag, attrs = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k in e && typeof v !== 'string') e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat()) if (f != null && f !== false) e.append(f.nodeType ? f : document.createTextNode(f));
  return e;
}

function campoNum(rotulo, valor, aoMudar, { min = 1, max = 2000, sufixo = 'cm', chave } = {}) {
  const inp = el('input', { type: 'text', inputmode: 'decimal', value: fmt(valor), 'data-chave': chave });
  inp.addEventListener('change', () => {
    const v = numero(inp.value);
    if (!Number.isFinite(v) || v < min || v > max) {
      toast(`Use um valor entre ${fmt(min)} e ${fmt(max)}.`);
      inp.value = fmt(valor);
      return;
    }
    aoMudar(v);
  });
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
  inp.addEventListener('focus', () => inp.select());
  return el('label', { class: 'campo' }, el('span', {}, rotulo), inp, el('em', {}, sufixo));
}
function campoTexto(rotulo, valor, aoMudar) {
  const inp = el('input', { type: 'text', value: valor });
  inp.addEventListener('change', () => { const v = inp.value.trim(); if (v) aoMudar(v); });
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
  return el('label', { class: 'campo largo' }, el('span', {}, rotulo), inp);
}
function campoCor(rotulo, valor, aoMudar) {
  const inp = el('input', { type: 'color', value: valor });
  let estado = null;
  inp.addEventListener('input', () => {             // prévia ao vivo
    estado ??= JSON.stringify(doc);
    aoMudar(inp.value, false);
  });
  inp.addEventListener('change', () => {            // grava no histórico
    if (estado) registrar(estado);
    estado = null;
    aoMudar(inp.value, true);
  });
  return el('label', { class: 'campo cor' }, el('span', {}, rotulo), inp);
}
const anexar = (pai, ...filhos) => pai.append(...filhos.flat().filter((f) => f != null && f !== false));
const botao = (txt, acao, extra = {}) => el('button', { type: 'button', onclick: acao, ...extra }, txt);
const secao = (titulo, ...filhos) => el('section', { class: 'bloco' }, el('h3', {}, titulo), ...filhos);

// ---- abas de cenário
function renderAbas() {
  const nav = $('#abas');
  nav.textContent = '';
  doc.cenarios.forEach((c, i) => {
    const b = el('button', {
      type: 'button', class: 'aba' + (i === doc.ativo ? ' ativa' : ''), title: 'Clique duplo para renomear',
      onclick: () => { if (i !== doc.ativo) { doc.ativo = i; if (sel?.tipo === 'movel') sel = null; atualizarTudo(); } },
      ondblclick: () => {
        const n = prompt('Nome do cenário:', c.nome);
        if (n && n.trim()) alterar(() => { c.nome = n.trim(); });
      },
    }, c.nome);
    if (doc.cenarios.length > 1 && i === doc.ativo) {
      b.append(el('span', {
        class: 'fechar', title: 'Excluir cenário',
        onclick: (e) => {
          e.stopPropagation();
          if (confirm(`Excluir o cenário "${c.nome}"? Dá para desfazer.`)) {
            alterar(() => { doc.cenarios.splice(i, 1); doc.ativo = Math.max(0, i - 1); });
            sel = null; atualizarTudo();
          }
        },
      }, '×'));
    }
    nav.append(b);
  });
  nav.append(botao('+', () => {
    const c = clonar(cen());
    c.id = novoId('c'); c.nome = `${c.nome} (cópia)`;
    for (const m of c.moveis) m.id = novoId('m');
    alterar(() => { doc.cenarios.push(c); doc.ativo = doc.cenarios.length - 1; });
    sel = null; atualizarTudo();
  }, { class: 'aba nova', title: 'Duplicar este cenário' }));
}

// ---- barra lateral: áreas, demolição e catálogo
function renderAreas() {
  const box = $('#areas');
  box.textContent = '';
  let total = 0;
  const tab = el('table', { class: 'tab-areas' });
  for (const amb of doc.planta.ambientes) {
    const a = areaUtil(amb);
    total += a;
    tab.append(el('tr', {
      class: sel?.tipo === 'ambiente' && sel.id === amb.id ? 'ativo' : '',
      onclick: () => selecionar({ tipo: 'ambiente', id: amb.id }),
    }, el('td', {}, amb.nome), el('td', {}, m2(a))));
  }
  const constr = areaConstruida(), ref = doc.planta.areaConstrutora || 32;
  const dif = constr - ref, pct = (dif / ref) * 100;
  tab.append(el('tr', { class: 'soma' }, el('td', {}, 'Área útil (soma)'), el('td', {}, m2(total))));
  box.append(tab, el('div', { class: 'comparativo' },
    el('div', {}, el('span', {}, 'Construída (com paredes)'), el('b', {}, m2(constr))),
    el('div', {}, el('span', {}, 'Construtora'), el('b', {}, m2(ref))),
    el('div', { class: Math.abs(pct) <= 3 ? 'ok' : 'alerta' }, el('span', {}, 'Diferença'),
      el('b', {}, `${dif >= 0 ? '+' : '−'}${m2(Math.abs(dif))} (${dif >= 0 ? '+' : '−'}${fmt(Math.abs(pct))}%)`)),
  ));
  for (const r of rotulos) {
    const amb = doc.planta.ambientes.find((a) => a.nome === r.nome);
    if (amb) r.div.querySelector('span').textContent = m2(areaUtil(amb));
  }
}

let animacao = null;
function renderLuz() {
  const box = $('#luz');
  box.textContent = '';
  const info = aplicarSol();
  const { nascer, por } = nascerPor(luz.data);
  const guardar = () => { try { localStorage.setItem(CHAVE_LUZ, JSON.stringify(luz)); } catch { /* ok */ } };
  const hora = el('input', { type: 'range', min: 4, max: 20, step: 0.25, value: String(luz.hora) });
  const rotHora = el('b', {}, horaTxt(luz.hora));
  const txt = el('p', { class: 'nota' });
  const descrever = ({ elev, az }) => {
    txt.textContent = elev <= 0
      ? 'Sol abaixo do horizonte.'
      : `Sol a ${Math.round(elev)}° de altura, vindo do ${pontoCardeal(az)} (azimute ${Math.round(az)}°).`;
  };
  descrever(info);
  hora.addEventListener('input', () => {
    luz.hora = +hora.value; rotHora.textContent = horaTxt(luz.hora);
    descrever(aplicarSol()); guardar();
  });
  const data = el('input', { type: 'date', value: luz.data, onchange: (e) => { if (e.target.value) { luz.data = e.target.value; guardar(); renderLuz(); } } });
  const orient = el('select', { onchange: (e) => alterar(() => { doc.planta.orientacao = +e.target.value; }) },
    ...PONTOS.map((p, i) => el('option', { value: i * 45, selected: Math.round(doc.planta.orientacao / 45) % 8 === i }, p)));
  const animar = botao(animacao ? '■ Parar' : '▶ Passar o dia', () => {
    if (animacao) { clearInterval(animacao); animacao = null; renderLuz(); return; }
    luz.hora = Math.floor((nascer ?? 6) * 4) / 4;
    animacao = setInterval(() => {
      luz.hora += 0.25;
      if (luz.hora > (por ?? 18) + 0.25) { clearInterval(animacao); animacao = null; luz.hora = por ?? 18; guardar(); renderLuz(); return; }
      hora.value = String(luz.hora); rotHora.textContent = horaTxt(luz.hora); descrever(aplicarSol());
    }, 180);
    renderLuz();
  });
  anexar(box,
    el('div', { class: 'luz-local' }, doc.planta.local.nome),
    el('div', { class: 'grade2' },
      el('label', { class: 'campo largo' }, el('span', {}, 'Data'), data),
      el('label', { class: 'campo largo' }, el('span', {}, 'Janelas voltadas p/'), orient)),
    el('label', { class: 'faixa-hora' }, el('span', {}, 'Hora'), rotHora, hora),
    txt,
    el('div', { class: 'linha-botoes' }, animar,
      botao('Manhã', () => { luz.hora = 8; guardar(); renderLuz(); }),
      botao('Tarde', () => { luz.hora = 15; guardar(); renderLuz(); })),
    nascer != null ? el('p', { class: 'nota' }, `Nascer ${horaTxt(nascer)} · pôr ${horaTxt(por)} (horário de Brasília)`) : null,
  );
}

function renderDemolicao() {
  const box = $('#demolicao');
  box.textContent = '';
  const ws = doc.planta.paredes.filter((w) => w.derrubavel);
  if (!ws.length) { box.append(el('p', { class: 'nota' }, 'Nenhuma parede marcada. Selecione uma parede e marque "Pode ser derrubada".')); return; }
  for (const w of ws) {
    box.append(el('label', { class: 'interruptor' },
      el('input', { type: 'checkbox', checked: !!w.demolida, onchange: (e) => alterar(() => { parede(w.id).demolida = e.target.checked; }) }),
      el('span', {}, w.nome), el('em', {}, w.demolida ? 'derrubada' : 'de pé')));
  }
}

let filtroCatalogo = '';
function renderCatalogo() {
  const box = $('#catalogo');
  box.textContent = '';
  const todos = [...CATALOGO, ...doc.catalogoExtra];
  const f = filtroCatalogo.toLowerCase();
  const cats = [...new Set(todos.map((c) => c.cat || 'Outros'))];
  for (const cat of cats) {
    const itens = todos.filter((c) => (c.cat || 'Outros') === cat && (!f || c.nome.toLowerCase().includes(f)));
    if (!itens.length) continue;
    box.append(el('h4', {}, cat));
    for (const c of itens) {
      box.append(el('button', { type: 'button', class: 'item-cat', onclick: () => adicionarMovel(c.tipo), title: 'Adicionar ao cenário' },
        el('i', { style: `background:${c.cores?.principal || '#ccc'}` }),
        el('span', {}, c.nome),
        el('em', {}, `${c.dim.l}×${c.dim.p}`)));
    }
  }
}

// ---- painel da seleção
function renderPainel() {
  const p = $('#painel');
  p.textContent = '';
  document.body.classList.toggle('com-painel', !!sel);
  if (!sel) return;
  const cab = (titulo, sub) => el('header', {}, el('div', {}, el('small', {}, sub), el('h2', {}, titulo)),
    botao('×', () => selecionar(null), { class: 'fechar', title: 'Fechar (Esc)' }));
  if (sel.tipo === 'movel') painelMovel(p, cab);
  else if (sel.tipo === 'parede') painelParede(p, cab);
  else if (sel.tipo === 'ambiente') painelAmbiente(p, cab);
  else if (sel.tipo === 'zona') painelZona(p, cab);
}

function painelMovel(p, cab) {
  const m = movel(sel.id);
  if (!m) return;
  const def = defCatalogo(m.tipo) || { nome: m.tipo };
  const pg = pegada(m), vr = varianteDe(def, m);
  const col = colisoes.porMovel.get(m.id);
  const rotCores = def.rotulosCores || ['Principal', 'Secundária'];
  const [acaoAbrir, acaoFechar] = acaoDe(def, m) instanceof Array ? acaoDe(def, m) : [acaoDe(def, m), 'Fechar'];
  const aberto = (m.aberto || 0) > 0.5;
  const NOME_DIR = { 'x1': 'Livre à direita', 'x-1': 'Livre à esquerda', 'z1': 'Livre abaixo', 'z-1': 'Livre acima' };
  const zonas = zonasUso(m);
  anexar(p,
    cab(m.nome, vr ? `${def.nome} · ${vr.nome}` : def.nome),
    el('div', { class: 'status ' + (col ? 'alerta' : 'ok') }, col ? `⚠ ${[...new Set(col)].join('; ')}` : '✓ Cabe e dá para usar'),
    def.variantes?.length > 1 ? secao('Formato',
      el('div', { class: 'opcoes' }, ...def.variantes.map((v) => botao(v.nome, () => trocarVariante(m, def, v), { class: v === vr ? 'ativo' : '' })))) : null,
    temMov(def, m) ? secao('Funcionamento',
      botao(aberto ? `■ ${acaoFechar}` : `▶ ${acaoAbrir}`, () => alternarAbertura(m), { class: 'acao' }),
      el('p', { class: 'nota' }, aberto ? 'Aberto: as colisões consideram as partes para fora.' : 'Veja o móvel em uso; as colisões passam a considerar as partes abertas.')) : null,
    secao('Medidas',
      el('div', { class: 'grade3' },
        campoNum('Largura', m.l, (v) => alterar(() => { m.l = v; })),
        campoNum('Profund.', m.p, (v) => alterar(() => { m.p = v; })),
        campoNum('Altura', m.a, (v) => alterar(() => { m.a = v; }))),
      el('div', { class: 'grade2', style: 'margin-top:8px' },
        campoNum('Altura do chão', m.y || 0, (v) => alterar(() => { m.y = v; }), { min: 0, max: 300 })),
      botao('Voltar às medidas do catálogo', () => alterar(() => Object.assign(m, vr?.dim || def.dim || {})), { class: 'link' })),
    def.acabamentos ? secao('Material',
      el('div', { class: 'opcoes' }, ...def.acabamentos.map((a) => botao(NOMES_ACAB[a] || a, () => alterar(() => { m.acab = a; }), { class: (m.acab || def.acabamentos[0]) === a ? 'ativo' : '' })))) : null,
    secao('Cores',
      el('div', { class: 'grade2' },
        campoCor(rotCores[0], m.cores.principal, (v, fim) => { m.cores.principal = v; aplicarMudancaMovel(m, fim); }),
        campoCor(rotCores[1], m.cores.secundaria || '#888888', (v, fim) => { m.cores.secundaria = v; aplicarMudancaMovel(m, fim); }))),
    secao('Posição e distâncias',
      el('div', { class: 'grade2' },
        campoNum('X (canto)', pg.x0, (v) => alterar(() => { m.x = v + pg.w / 2; }), { min: -500, max: 3000, chave: 'x' }),
        campoNum('Z (canto)', pg.z0, (v) => alterar(() => { m.z = v + pg.d / 2; }), { min: -500, max: 3000, chave: 'z' }),
        ...calcularCotas(m).map((c) => campoNum(NOME_DIR[c.eixo + c.s], c.dist, (v) => alterar(() => {
          const d = (c.dist - v) * c.s; if (c.eixo === 'x') m.x += d; else m.z += d;
        }), { min: 0, max: 2000 }))),
      el('div', { class: 'linha-botoes' },
        botao('↺ 90°', () => girar(-1), { title: 'Girar anti-horário (Shift+R)' }),
        botao('↻ 90°', () => girar(1), { title: 'Girar horário (R)' }),
        botao('⇋ Espelhar', () => alterar(() => { m.espelhado = !m.espelhado; }), { title: 'Inverter lado (ex.: chaise)' }))),
    zonas.length ? secao('Área de uso',
      ...zonas.map((z, k) => el('div', { class: 'linha-uso ' + (colisoes.usoBloq.has(`${m.id}#${k}`) ? 'alerta' : 'ok') },
        el('span', {}, z.nome), el('b', {}, `${fmt(z.x1 - z.x0)} × ${fmt(z.z1 - z.z0)} cm`))),
      el('p', { class: 'nota' }, 'O espaço para usar o móvel (verde no piso). Fica vermelho se algo estiver em cima.')) : null,
    el('div', { class: 'linha-botoes fim' },
      botao('Duplicar', duplicarSelecionado, { title: 'Ctrl+D' }),
      botao('Remover', removerSelecionado, { class: 'perigo', title: 'Delete' })),
    el('p', { class: 'nota' }, 'Arraste o móvel no piso (encaixe de 5 cm). Clique numa cota para digitar a distância.'),
  );
}
function trocarVariante(m, def, v) {
  alterar(() => {
    m.variante = v.id;
    const costas = paraPlanta(m, 0, -m.p / 2); // as costas ficam onde estavam (encostadas na parede)
    // mantém a largura escolhida se o novo formato for de tamanho parecido
    if (v.dim) Object.assign(m, { l: Math.abs(v.dim.l - m.l) <= m.l * 0.25 ? m.l : v.dim.l, p: v.dim.p, a: v.dim.a });
    if (v.elev != null) m.y = v.elev;
    m.aberto = def.aberto ?? 0;
    const novas = paraPlanta(m, 0, -m.p / 2);
    m.x += costas[0] - novas[0]; m.z += costas[1] - novas[1];
    afastarDasParedes(m);
  });
}
// Se o novo formato ficou maior e entrou na parede, empurra o móvel para fora.
function afastarDasParedes(m) {
  for (let k = 0; k < 4; k++) {
    const pg = pegada(m);
    const w = doc.planta.paredes.find((pw) => {
      if (pw.demolida) return false;
      const c = caixaParede(pw);
      return Math.min(pg.x1, c.x1) - Math.max(pg.x0, c.x0) > 0.5 && Math.min(pg.z1, c.z1) - Math.max(pg.z0, c.z0) > 0.5;
    });
    if (!w) return;
    const c = caixaParede(w);
    const ox = Math.min(pg.x1, c.x1) - Math.max(pg.x0, c.x0), oz = Math.min(pg.z1, c.z1) - Math.max(pg.z0, c.z0);
    if (ox < oz) m.x += m.x < (c.x0 + c.x1) / 2 ? -ox : ox;
    else m.z += m.z < (c.z0 + c.z1) / 2 ? -oz : oz;
  }
}

function painelZona(p, cab) {
  const z = zona(sel.id);
  if (!z) return;
  const f = FUNCOES[z.funcao] || FUNCOES.outro, r = retZona(z);
  const ms = moveisNaZona(z);
  const area = (z.l * z.p) / 1e4;
  const ocup = cen().moveis.filter((m) => defCatalogo(m.tipo)?.colide !== false && (m.y || 0) < 100).reduce((soma, m) => {
    const pg = pegada(m);
    const dx = Math.min(pg.x1, r.x1) - Math.max(pg.x0, r.x0), dz = Math.min(pg.z1, r.z1) - Math.max(pg.z0, r.z0);
    return soma + (dx > 0 && dz > 0 ? dx * dz : 0);
  }, 0) / 1e4;
  const mudar = (fn) => alterar(() => fn(zona(z.id)));
  anexar(p,
    cab(z.nome || f.nome, 'Canto'),
    el('div', { class: 'area-grande', style: `color:${f.cor}` }, m2(area),
      el('small', {}, `${fmt((ocup / area) * 100)}% ocupado por móveis · ${m2(Math.max(0, area - ocup))} livres`)),
    secao('Função',
      el('div', { class: 'opcoes' }, ...Object.entries(FUNCOES).map(([k, fn]) =>
        botao(fn.nome, () => mudar((zz) => { zz.funcao = k; }), { class: z.funcao === k ? 'ativo' : '', style: `--cor:${fn.cor}` }))),
      campoTexto('Nome (opcional)', z.nome || '', (v) => mudar((zz) => { zz.nome = v; }))),
    secao('Medidas',
      el('div', { class: 'grade2' },
        campoNum('Largura', z.l, (v) => mudar((zz) => { zz.x += (v - zz.l) / 2; zz.l = v; }), { min: 20 }),
        campoNum('Profund.', z.p, (v) => mudar((zz) => { zz.z += (v - zz.p) / 2; zz.p = v; }), { min: 20 }),
        campoNum('X (canto)', r.x0, (v) => mudar((zz) => { zz.x = v + zz.l / 2; }), { min: -500, max: 3000 }),
        campoNum('Z (canto)', r.z0, (v) => mudar((zz) => { zz.z = v + zz.p / 2; }), { min: -500, max: 3000 }))),
    secao(`Móveis neste canto (${ms.length})`,
      ms.length ? el('div', { class: 'lista-moveis' }, ...ms.map((m) => el('button', { type: 'button', onclick: () => selecionar({ tipo: 'movel', id: m.id }) },
        el('span', {}, m.nome), el('em', {}, `${fmt(m.l)} × ${fmt(m.p)} × ${fmt(m.a)}`))))
        : el('p', { class: 'nota' }, 'Nenhum móvel com o centro dentro deste canto.')),
    el('div', { class: 'linha-botoes fim' },
      botao('Remover canto', () => { alterar(() => { cen().zonas = cen().zonas.filter((x) => x.id !== z.id); }); selecionar(null); }, { class: 'perigo' })),
    el('p', { class: 'nota' }, 'Com o canto selecionado, arraste-o no piso para mudar de lugar.'),
  );
}

function renderCantos() {
  const box = $('#cantos');
  if (!box) return;
  box.textContent = '';
  for (const z of cen().zonas || []) {
    const f = FUNCOES[z.funcao] || FUNCOES.outro;
    box.append(el('button', { type: 'button', class: 'item-canto' + (sel?.tipo === 'zona' && sel.id === z.id ? ' ativo' : ''),
      onclick: () => { if (!camadas.cantos) { camadas.cantos = true; guardarCamadas(); renderMostrar(); } selecionar({ tipo: 'zona', id: z.id }); } },
    el('i', { style: `background:${f.cor}` }), el('span', {}, z.nome || f.nome), el('em', {}, m2((z.l * z.p) / 1e4))));
  }
  box.append(botao('+ Marcar canto', novaZona, { class: 'link' }));
}

function renderMostrar() {
  const box = $('#mostrar');
  box.textContent = '';
  const opcoes = [['uso', 'Áreas de uso e giro das portas'], ['cantos', 'Cantos (funções)'], ['cotas', 'Cotas do móvel selecionado']];
  for (const [k, nome] of opcoes) {
    box.append(el('label', { class: 'interruptor' },
      el('input', { type: 'checkbox', checked: !!camadas[k], onchange: (e) => {
        camadas[k] = e.target.checked; guardarCamadas();
        if (k === 'cantos' && !camadas.cantos && sel?.tipo === 'zona') sel = null;
        construirZonas(); desenharSelecao(); renderPainel();
      } }), el('span', {}, nome)));
  }
}

function aplicarMudancaMovel(m, fim) {
  if (fim) { atualizarTudo(); return; }
  const velho = objMovel.get(m.id);
  const novo = construirMovel(m);
  grpMoveis.remove(velho); limpar(velho);
  grpMoveis.add(novo); objMovel.set(m.id, novo);
}
function renderPainelPosicao() {
  const m = sel?.tipo === 'movel' && movel(sel.id);
  if (!m) return;
  const pg = pegada(m);
  const x = $('#painel [data-chave="x"]'), z = $('#painel [data-chave="z"]');
  if (x) x.value = fmt(pg.x0);
  if (z) z.value = fmt(pg.z0);
}

function painelParede(p, cab) {
  const w = parede(sel.id);
  if (!w) return;
  const hz = horizontal(w), L = comprimento(w);
  const eixo = hz ? 'z' : 'x', c = hz ? w.z1 : w.x1;
  const aberturas = doc.planta.aberturas.filter((a) => a.parede === w.id).sort((a, b) => a.pos - b.pos);
  const folga = folgaInicio(w);
  const reposicionar = (v) => editarPlanta((pl) => {
    if (hz) esticar(pl, 'z', c, w.x1, w.x2, v - c); else esticar(pl, 'x', c, w.z1, w.z2, v - c);
  });
  const novoComprimento = (v) => editarPlanta((pl) => {
    // move a ponta final; a parede ligada nessa ponta vai junto
    if (hz) esticar(pl, 'x', w.x2, w.z1, w.z1, v - L); else esticar(pl, 'z', w.z2, w.x1, w.x1, v - L);
  });
  const editarAb = (ab, fn) => editarPlanta((pl) => fn(pl.aberturas.find((a) => a.id === ab.id)));
  anexar(p, 
    cab(w.nome, `Parede ${hz ? 'horizontal' : 'vertical'} · ${w.esp} cm`),
    w.demolida ? el('div', { class: 'status alerta' }, 'Parede derrubada (simulação)') : null,
    secao('Nome', campoTexto('Nome', w.nome, (v) => alterar(() => { parede(w.id).nome = v; }))),
    secao('Pintura',
      el('div', { class: 'grade2' },
        campoCor('Cor', w.cor || '#efe9df', (v, fim) => { parede(w.id).cor = v; if (fim) atualizarTudo(); else construirPlanta(); })),
      w.cor ? botao('Voltar ao branco', () => alterar(() => { delete parede(w.id).cor; }), { class: 'link' }) : null),
    secao('Posição e tamanho',
      el('div', { class: 'grade2' },
        campoNum(`Eixo (${eixo})`, c, reposicionar, { min: -1000, max: 3000 }),
        campoNum('Comprimento', L, novoComprimento, { min: 10, max: 3000 }),
        campoNum('Espessura', w.esp, (v) => alterar(() => { parede(w.id).esp = v; }), { min: 3, max: 60 }),
        campoNum('Pé-direito', doc.planta.alturaParede, (v) => alterar(() => { doc.planta.alturaParede = v; }), { min: 200, max: 500 })),
      el('p', { class: 'nota' }, 'Com a parede selecionada, arraste-a para movê-la (encaixe 5 cm). Paredes, ambientes e aberturas ligados acompanham. Mudar o comprimento empurra a parede ligada na ponta final.')),
    secao('Demolição',
      el('label', { class: 'interruptor' },
        el('input', { type: 'checkbox', checked: !!w.derrubavel, onchange: (e) => alterar(() => { const x = parede(w.id); x.derrubavel = e.target.checked; if (!x.derrubavel) x.demolida = false; }) }),
        el('span', {}, 'Pode ser derrubada')),
      w.derrubavel ? botao(w.demolida ? 'Reconstruir parede' : 'Derrubar parede', () => alterar(() => { parede(w.id).demolida = !w.demolida; }), { class: w.demolida ? '' : 'perigo' }) : null),
    secao(`Aberturas (${aberturas.length})`,
      ...aberturas.map((ab) => el('div', { class: 'abertura' + (sel.abertura === ab.id ? ' ativa' : '') },
        el('div', { class: 'abertura-cab' }, el('b', {}, `${TIPOS_ABERTURA[ab.tipo]} ${fmt(ab.largura)}`),
          botao('Remover', () => alterar(() => { doc.planta.aberturas = doc.planta.aberturas.filter((a) => a.id !== ab.id); }), { class: 'link perigo' })),
        el('div', { class: 'grade2' },
          campoNum('Do canto', ab.pos - folga, (v) => editarAb(ab, (a) => { a.pos = v + folga; }), { min: -folga, max: 3000 }),
          campoNum('Largura', ab.largura, (v) => editarAb(ab, (a) => { a.largura = v; }), { min: 20, max: 1000 }),
          campoNum('Altura', ab.altura, (v) => editarAb(ab, (a) => { a.altura = v; }), { min: 20, max: 300 }),
          ab.tipo === 'janela' ? campoNum('Peitoril', ab.peitoril, (v) => editarAb(ab, (a) => { a.peitoril = v; }), { min: 0, max: 250 }) : null),
        ab.tipo === 'porta' ? el('div', { class: 'linha-botoes' },
          botao('Abrir para o outro lado', () => editarAb(ab, (a) => { a.lado = a.lado === -1 ? 1 : -1; })),
          botao('Trocar dobradiça', () => editarAb(ab, (a) => { a.dobradica = a.dobradica === 'fim' ? 'inicio' : 'fim'; }))) : null,
      )),
      el('div', { class: 'linha-botoes' },
        botao('+ Porta', () => novaAbertura(w, 'porta')),
        botao('+ Janela', () => novaAbertura(w, 'janela')),
        botao('+ Correr', () => novaAbertura(w, 'correr')))),
  );
  for (const ab of aberturas) {
    const outra = aberturas.find((o) => o !== ab && o.pos < ab.pos + ab.largura && ab.pos < o.pos + o.largura);
    if (outra) { anexar(p, el('div', { class: 'status alerta' }, `⚠ ${TIPOS_ABERTURA[ab.tipo]} e ${TIPOS_ABERTURA[outra.tipo]} se sobrepõem`)); break; }
  }
}

function novaAbertura(w, tipo) {
  const padrao = { porta: { largura: 80, altura: 210, dobradica: 'inicio', lado: 1 }, janela: { largura: 120, altura: 120, peitoril: 100 }, correr: { largura: 200, altura: 210 } }[tipo];
  const L = comprimento(w);
  const ocupados = doc.planta.aberturas.filter((a) => a.parede === w.id).map((a) => [a.pos - 5, a.pos + a.largura + 5]);
  let pos = null;
  for (let u = Math.max(0, L / 2 - padrao.largura / 2), passo = 0; passo < 200; passo++) {
    const cand = snap(u + (passo % 2 ? 1 : -1) * Math.ceil(passo / 2) * 5);
    if (cand < 0 || cand + padrao.largura > L) continue;
    if (!ocupados.some(([a, b]) => cand < b && a < cand + padrao.largura)) { pos = cand; break; }
  }
  if (pos == null) { toast('Não há espaço livre nesta parede para essa abertura.'); return; }
  const ab = { id: novoId('ab'), tipo, parede: w.id, pos, ...padrao };
  alterar(() => doc.planta.aberturas.push(ab));
  sel.abertura = ab.id; renderPainel();
}

function painelAmbiente(p, cab) {
  const amb = ambiente(sel.id);
  if (!amb) return;
  const util = poligonoUtil(amb), b = limites(util), bc = limites(amb.pontos);
  const larg = b.x1 - b.x0, prof = b.z1 - b.z0;
  const retangular = amb.pontos.length === 4;
  const faixa = (eixo, c) => { // trecho da borda do ambiente sobre a linha eixo=c
    const X = eixo === 'x' ? 0 : 1, Y = 1 - X;
    const ys = amb.pontos.filter((q) => Math.abs(q[X] - c) < 0.5).map((q) => q[Y]);
    return [Math.min(...ys), Math.max(...ys)];
  };
  anexar(p, 
    cab(amb.nome, 'Ambiente'),
    el('div', { class: 'area-grande' }, m2(areaUtil(amb)), el('small', {}, 'área útil (sem paredes)')),
    secao('Nome e piso',
      campoTexto('Nome', amb.nome, (v) => alterar(() => { ambiente(amb.id).nome = v; })),
      el('label', { class: 'campo largo' }, el('span', {}, 'Piso'),
        el('select', { onchange: (e) => alterar(() => { ambiente(amb.id).piso = e.target.value; }) },
          ...Object.entries(PISOS).map(([k, v]) => el('option', { value: k, selected: amb.piso === k }, v.nome))))),
    secao('Medidas internas',
      el('div', { class: 'grade2' },
        campoNum('Largura', larg, (v) => editarPlanta((pl) => { const [a, bb] = faixa('x', bc.x1); esticar(pl, 'x', bc.x1, a, bb, v - larg); }), { min: 30, max: 3000 }),
        campoNum('Profund.', prof, (v) => editarPlanta((pl) => { const [a, bb] = faixa('z', bc.z1); esticar(pl, 'z', bc.z1, a, bb, v - prof); }), { min: 30, max: 3000 })),
      el('p', { class: 'nota' }, retangular
        ? 'Mudar a largura move a parede da direita; a profundidade move a parede de baixo. Para mover outra parede, clique nela.'
        : 'Ambiente em L: largura e profundidade movem a borda mais à direita e a mais abaixo. Para as outras bordas, clique na parede.')),
  );
}

function renderAvisos() {
  const box = $('#avisos');
  box.textContent = '';
  if (!colisoes.lista.length) { box.hidden = true; return; }
  box.hidden = false;
  const n = colisoes.lista.length, uso = colisoes.lista.filter((c) => c.tipo).length;
  box.append(el('b', {}, `⚠ ${n} ${n === 1 ? 'conflito' : 'conflitos'}${uso ? ` (${uso} de uso)` : ''}`));
  for (const c of colisoes.lista.slice(0, 6)) {
    box.append(el('button', { type: 'button', onclick: () => selecionar({ tipo: 'movel', id: c.ids[0] }) }, c.txt));
  }
  if (colisoes.lista.length > 6) box.append(el('span', {}, `e mais ${colisoes.lista.length - 6}`));
}

let tDica;
function dica(txt) { const d = $('#dica'); d.textContent = txt; d.hidden = !txt; }
function toast(txt) {
  const t = $('#toast');
  t.textContent = txt; t.classList.add('visivel');
  clearTimeout(tDica); tDica = setTimeout(() => t.classList.remove('visivel'), 3200);
}

function atualizarBotoes() {
  $('#bDesfazer').disabled = !hist.voltar.length;
  $('#bRefazer').disabled = !hist.avancar.length;
  $('#bVista').innerHTML = `<span class="texto">Vista </span>${vista.topo ? '3D' : 'de cima'}`;
  $('#bCorte').classList.toggle('ligado', vista.corte);
  $('#bCaminhar').classList.toggle('ligado', vista.caminhar);
  $('#bCaminhar').querySelector('.texto').textContent = vista.caminhar ? 'Sair' : 'Caminhar';
  $('#bVista').disabled = vista.caminhar;
  $('#bCorte').disabled = vista.caminhar;
}

function atualizarTudo() {
  if (doc.ativo >= doc.cenarios.length) doc.ativo = 0;
  validarSelecao();
  construirPlanta();
  construirMoveis();
  verificarColisoes();
  construirZonas();
  desenharSelecao();
  renderAbas();
  renderAreas();
  renderCantos();
  renderMostrar();
  renderLuz();
  renderDemolicao();
  renderCatalogo();
  renderPainel();
  atualizarBotoes();
  salvarAuto();
}

function alternarVista() {
  if (vista.caminhar) return;
  vista.topo = !vista.topo;
  ctlPersp.enabled = !vista.topo;
  ctlTopo.enabled = vista.topo;
  aplicarVisibilidadeTopo();
  atualizarBotoes();
}

$('#bDesfazer').onclick = desfazer;
$('#bRefazer').onclick = refazer;
$('#bVista').onclick = alternarVista;
$('#bCorte').onclick = () => { vista.corte = !vista.corte; construirPlanta(); atualizarBotoes(); };
$('#bEnquadrar').onclick = () => { if (vista.caminhar) alternarCaminhada(); enquadrar(); };
$('#bCaminhar').onclick = () => { if (!foto.ativa) alternarCaminhada(); };
$('#bFoto').onclick = () => (foto.ativa ? fecharFoto() : abrirFoto());
$('#fotoFechar').onclick = fecharFoto;
$('#fotoSalvar').onclick = salvarFoto;
$('#fotoExposicao').addEventListener('input', (e) => { renderer.toneMappingExposure = +e.target.value; });
$('#fotoHora').addEventListener('input', (e) => {
  luz.hora = +e.target.value;
  $('#fotoHoraTxt').textContent = horaTxt(luz.hora);
  try { localStorage.setItem(CHAVE_LUZ, JSON.stringify(luz)); } catch { /* ok */ }
  recomecarFoto();
});
$('#bPNG').onclick = exportarPNG;
$('#bLateral').onclick = () => document.body.classList.toggle('lateral-aberta');
$('#buscaCatalogo').addEventListener('input', (e) => { filtroCatalogo = e.target.value; renderCatalogo(); });

// =====================================================================
// 10. ARQUIVOS — salvar no navegador, JSON, PNG e modelos .glb
// =====================================================================
let tSalvar;
function salvarAuto() {
  clearTimeout(tSalvar);
  tSalvar = setTimeout(() => {
    try {
      localStorage.setItem(CFG.chave, JSON.stringify(doc));
      $('#salvo').textContent = `Salvo no navegador ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch (err) {
      $('#salvo').textContent = 'Não foi possível salvar no navegador';
    }
  }, 300);
}

function baixar(blob, nome) {
  const a = el('a', { href: URL.createObjectURL(blob), download: nome });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

// IndexedDB guarda os .glb (grandes demais para o localStorage).
const idb = {
  abrir: () => new Promise((ok, erro) => {
    const r = indexedDB.open('simulador-apto', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('modelos');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  }),
  async gravar(id, buf) {
    const db = await idb.abrir();
    return new Promise((ok, erro) => { const t = db.transaction('modelos', 'readwrite'); t.objectStore('modelos').put(buf, id); t.oncomplete = ok; t.onerror = () => erro(t.error); });
  },
  async ler(id) {
    const db = await idb.abrir();
    return new Promise((ok, erro) => { const r = db.transaction('modelos').objectStore('modelos').get(id); r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error); });
  },
};
const paraBase64 = (buf) => {
  const b = new Uint8Array(buf); let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
};
const deBase64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer;

async function exportarJSON() {
  const saida = clonar(doc);
  saida.modelos = {};
  for (const c of doc.catalogoExtra) {
    try { const buf = modelos.get(c.modelo)?.buf || (await idb.ler(c.modelo)); if (buf) saida.modelos[c.modelo] = paraBase64(buf); } catch { /* segue sem o modelo */ }
  }
  baixar(new Blob([JSON.stringify(saida, null, 1)], { type: 'application/json' }), `apartamento-${new Date().toISOString().slice(0, 10)}.json`);
}

async function importarJSON(arquivo) {
  try {
    const d = JSON.parse(await arquivo.text());
    if (!docValido(d)) throw new Error('estrutura');
    for (const [id, b64] of Object.entries(d.modelos || {})) {
      const buf = deBase64(b64);
      try { await idb.gravar(id, buf); } catch { /* fica só na memória */ }
      await carregarModelo(id, buf);
    }
    delete d.modelos;
    registrar();
    doc = prepararDoc(d);
    sel = null;
    atualizarTudo(); enquadrar();
    toast('Layout importado. Ctrl+Z desfaz.');
  } catch (err) {
    toast('Arquivo inválido: não é um layout deste simulador.');
  }
}

function exportarPNG() {
  if (foto.ativa) { salvarFoto(); return; }
  grpSel.visible = false;
  if (!foto.ativa) desenharQuadro(); // na foto realista, o canvas já tem a imagem
  const src = renderer.domElement;
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  grpSel.visible = true;
  const k = src.width / palco.clientWidth, v = new T.Vector3();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const r of rotulos) {
    v.copy(r.pos).project(camAtiva());
    if (v.z >= 1) continue;
    const x = ((v.x + 1) / 2) * src.width, y = ((1 - v.y) / 2) * src.height;
    g.font = `600 ${13 * k}px system-ui, sans-serif`;
    const w = Math.max(g.measureText(r.nome).width, g.measureText(r.area).width) + 16 * k;
    g.fillStyle = 'rgba(255,255,255,.88)';
    g.beginPath(); g.roundRect(x - w / 2, y - 20 * k, w, 40 * k, 8 * k); g.fill();
    g.fillStyle = '#1d2530'; g.fillText(r.nome, x, y - 7 * k);
    g.font = `${12 * k}px system-ui, sans-serif`; g.fillStyle = '#4a5563'; g.fillText(r.area, x, y + 9 * k);
  }
  g.font = `${12 * k}px system-ui, sans-serif`; g.textAlign = 'left'; g.fillStyle = 'rgba(29,37,48,.75)';
  const [ano, mes, dia] = luz.data.split('-');
  g.fillText(`${cen().nome} · útil ${m2(doc.planta.ambientes.reduce((s, a) => s + areaUtil(a), 0))} · sol de ${dia}/${mes}/${ano} às ${horaTxt(luz.hora)}`, 14 * k, src.height - 14 * k);
  c.toBlob((b) => baixar(b, `apartamento-${slug(cen().nome)}.png`));
}

// ---- modelos .glb
const loader = new T.GLTFLoader();
function carregarModelo(id, buf) {
  return new Promise((ok, erro) => {
    loader.parse(buf.slice(0), '', (gltf) => {
      const cenaM = gltf.scene;
      const b = new T.Box3().setFromObject(cenaM);
      const tam = b.getSize(new T.Vector3()), centro = b.getCenter(new T.Vector3());
      const info = { cena: cenaM, tam, centro, base: b.min.y, buf };
      modelos.set(id, info);
      ok(info);
    }, (e) => erro(e));
  });
}

let glbPendente = null;
async function aoEscolherGLB(arquivo) {
  try {
    const buf = await arquivo.arrayBuffer();
    const id = novoId('glb');
    const info = await carregarModelo(id, buf);
    const maior = Math.max(info.tam.x, info.tam.y, info.tam.z);
    const escala = maior < 20 ? 100 : maior > 1000 ? 0.1 : 1; // metros, milímetros ou cm
    glbPendente = { id, info, buf };
    $('#glbNome').value = arquivo.name.replace(/\.(glb|gltf)$/i, '');
    $('#glbOriginal').textContent = `${fmt(info.tam.x)} × ${fmt(info.tam.z)} × ${fmt(info.tam.y)} (largura × profundidade × altura)`;
    $('#glbEscala').value = String(escala).replace('.', ',');
    atualizarPreviaGLB();
    $('#dlgGLB').showModal();
  } catch (err) {
    console.error(err);
    toast('Não consegui ler esse arquivo .glb (modelos com compressão Draco não são suportados).');
  }
}
function atualizarPreviaGLB() {
  if (!glbPendente) return;
  const e = numero($('#glbEscala').value) || 1, t = glbPendente.info.tam;
  $('#glbResultado').textContent = `${fmt(t.x * e)} × ${fmt(t.z * e)} × ${fmt(t.y * e)} cm`;
}
async function confirmarGLB() {
  const { id, info, buf } = glbPendente;
  const e = numero($('#glbEscala').value) || 1;
  const dim = { l: Math.max(1, Math.round(info.tam.x * e)), p: Math.max(1, Math.round(info.tam.z * e)), a: Math.max(1, Math.round(info.tam.y * e)) };
  const item = { tipo: id, nome: $('#glbNome').value.trim() || 'Modelo importado', cat: 'Importados', modelo: id, dim, cores: { principal: '#b8bcc2' } };
  glbPendente = null;
  alterar(() => doc.catalogoExtra.push(item));
  adicionarMovel(id);
  try { await idb.gravar(id, buf); } catch { toast('Aviso: o modelo não ficará salvo no navegador; exporte o JSON para guardá-lo.'); }
}

$('#bSalvar').onclick = () => { salvarAuto(); toast('Layout salvo neste navegador.'); };
$('#bExportar').onclick = exportarJSON;
$('#bImportar').onclick = () => $('#arqJSON').click();
$('#bGLB').onclick = () => $('#arqGLB').click();
$('#bGLB2').onclick = () => $('#arqGLB').click();
$('#bOriginal').onclick = () => {
  if (!confirm('Voltar à planta e aos cenários originais? Dá para desfazer.')) return;
  registrar(); doc = docOriginal(doc.catalogoExtra); sel = null; atualizarTudo(); enquadrar();
};
$('#arqJSON').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) importarJSON(f); };
$('#arqGLB').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) aoEscolherGLB(f); };
$('#glbEscala').addEventListener('input', atualizarPreviaGLB);
$('#dlgGLB').addEventListener('close', () => { if ($('#dlgGLB').returnValue === 'ok' && glbPendente) confirmarGLB(); else glbPendente = null; });
for (const d of document.querySelectorAll('details.menu')) d.addEventListener('click', (e) => { if (e.target.closest('button')) d.open = false; });

// =====================================================================
// 11. EXTENSÕES FUTURAS
// =====================================================================
// Pontos de encaixe para as próximas funções, sem mexer no resto:
//  - Cotas e medidas na tela: função em EXTENSOES.aposPlanta que desenha
//    linhas e textos a partir de doc.planta (recebe o grupo 3D da planta).
//  - Texturas: trocar as funções texturaMadeira/texturaPiso em MAT.piso,
//    ou acrescentar novos tipos em PISOS.
//  - Modo caminhada: uma terceira câmera ao lado de camPersp/camTopo,
//    ativada em alternarVista().
//  - Luz artificial à noite: somar PointLights em aplicarSol() quando o
//    sol estiver abaixo do horizonte (a partir de pontosEletricos).
//  - Tomadas e pontos de luz: doc.planta.pontosEletricos (já existe, vazio,
//    e já acompanha o "esticar" das paredes) + uma função em aposPlanta.
const EXTENSOES = { aposPlanta: [], aposMoveis: [] };

// =====================================================================
// 12. INÍCIO
// =====================================================================
function carregarDoc() {
  try {
    const s = localStorage.getItem(CFG.chave);
    if (s) {
      const d = JSON.parse(s);
      if (docValido(d) && (d.planta.revisao || 1) === PLANTA_ORIGINAL.revisao) return prepararDoc(d);
      if (docValido(d)) { // planta antiga: guarda uma cópia e abre a nova
        localStorage.setItem(`${CFG.chave}:revisao-${d.planta.revisao || 1}`, s);
        setTimeout(() => toast('A planta foi atualizada. O layout anterior ficou guardado como cópia no navegador.'), 800);
        return docOriginal(d.catalogoExtra || []);
      }
    }
  } catch { /* começa do original */ }
  return docOriginal();
}

doc = carregarDoc();
if (PLANTA_ORIGINAL.aviso) { $('#avisoPlanta').textContent = PLANTA_ORIGINAL.aviso; $('#avisoPlanta').hidden = false; }
redimensionar();
atualizarTudo();
enquadrar();

// modelos .glb guardados no navegador
(async () => {
  let algum = false;
  for (const c of doc.catalogoExtra) {
    if (!c.modelo || modelos.has(c.modelo)) continue;
    try { const buf = await idb.ler(c.modelo); if (buf) { await carregarModelo(c.modelo, buf); algum = true; } } catch { /* sem modelo */ }
  }
  if (algum) { construirMoveis(); desenharSelecao(); }
})();

renderer.setAnimationLoop(() => {
  if (foto.ativa) { quadroFoto(); return; }
  if (!vista.caminhar) ctlAtivo().update();
  desenharQuadro();
  posicionarRotulos();
  posicionarBussola();
  posicionar(cotasTela);
  posicionar(rotulosZonas);
});

// acesso pelo console, útil para testes e ajustes finos
window.simulador = { get doc() { return doc; }, atualizarTudo, selecionar, esticar, areaUtil, areaConstruida, alternarVista, enquadrar, exportarPNG, CFG, camera: camAtiva,
  _grp: grpMoveis, olhar(px, py, pz, tx, ty, tz) { camPersp.position.set(px, py, pz); ctlPersp.target.set(tx, ty, tz); ctlPersp.update(); },
  alternarAbertura: (id) => alternarAbertura(movel(id)), alternarCaminhada, camadas, andar, aplicarCameraAndar, alvo: (x, y) => alvoEm({ clientX: x, clientY: y }), get sel() { return sel; } };
})();
