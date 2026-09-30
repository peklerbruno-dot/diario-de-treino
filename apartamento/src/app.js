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
  for (const c of d.cenarios) { c.id ||= novoId('c'); for (const m of c.moveis) prepararMovel(m); }
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
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
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

const vista = { topo: false, corte: false };
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
  parede: new T.MeshStandardMaterial({ color: '#f4f2ee', roughness: 0.93 }),
  paredeSel: new T.MeshStandardMaterial({ color: '#cfe0fb', roughness: 0.9, emissive: '#2f80ed', emissiveIntensity: 0.12 }),
  topo: new T.MeshStandardMaterial({ color: '#3f4349', roughness: 0.85 }),
  topoSel: new T.MeshStandardMaterial({ color: '#2f80ed', roughness: 0.6 }),
  laje: new T.MeshStandardMaterial({ color: '#cfcac2', roughness: 1 }),
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
  cena.background.copy(CEU_NOITE).lerp(CEU_DIA, dia);
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
  const Hc = vista.corte ? Math.min(H, CFG.alturaCorte) : H;

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
  const lado = selec ? MAT.paredeSel : MAT.parede;
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
function posicionarRotulos() {
  const w = palco.clientWidth, h = palco.clientHeight, v = new T.Vector3();
  for (const r of rotulos) {
    v.copy(r.pos).project(camAtiva());
    const vis = v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
    r.div.style.display = vis ? '' : 'none';
    r.div.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -50%)`;
  }
}

// =====================================================================
// 6. MÓVEIS
// =====================================================================
const objMovel = new Map();   // id do móvel → THREE.Group
const modelos = new Map();    // id do modelo .glb → { cena, tam, centro, base }

const ACAB = {
  tecido: { roughness: 0.95 }, madeira: { roughness: 0.6 }, laca: { roughness: 0.32 },
  metal: { roughness: 0.3, metalness: 0.75 }, vidro: { roughness: 0.05, transparent: true, opacity: 0.3, depthWrite: false },
  tela: { roughness: 0.15, metalness: 0.2 }, pedra: { roughness: 0.4 }, padrao: { roughness: 0.75 },
};
const cacheMat = new Map();
function material(cor, acab = 'padrao') {
  const k = `${cor}|${acab}`;
  if (!cacheMat.has(k)) cacheMat.set(k, new T.MeshStandardMaterial({ color: cor, ...(ACAB[acab] || ACAB.padrao) }));
  return cacheMat.get(k);
}

// Avalia medidas do catálogo: número ou expressão com L, P, A, min, max.
const cacheExpr = new Map();
function avaliar(v, L, P, A) {
  if (typeof v === 'number') return v;
  if (v == null || v === '') return 0;
  let f = cacheExpr.get(v);
  if (!f) {
    if (!/^[\d\s.,+\-*/()LPAminax]*$/.test(v)) throw new Error(`Expressão inválida no catálogo: ${v}`);
    f = new Function('L', 'P', 'A', 'min', 'max', `return (${v});`);
    cacheExpr.set(v, f);
  }
  return f(L, P, A, Math.min, Math.max);
}

function pegada(m) {
  const gira = m.rot % 180 !== 0;
  const w = gira ? m.p : m.l, d = gira ? m.l : m.p;
  return { x0: m.x - w / 2, x1: m.x + w / 2, z0: m.z - d / 2, z1: m.z + d / 2, w, d };
}
function encaixar(m) {
  const pg = pegada(m);
  m.x = snap(pg.x0) + pg.w / 2;
  m.z = snap(pg.z0) + pg.d / 2;
}

function criarParte(pt, m) {
  const { l: L, p: P, a: A } = m;
  const v = (k, pad = 0) => (pt[k] == null ? pad : avaliar(pt[k], L, P, A));
  const cor = !pt.cor || pt.cor === 'principal' ? m.cores.principal : pt.cor === 'secundaria' ? m.cores.secundaria : pt.cor;
  const mat = material(cor, pt.acab);
  let geo, pos;
  if (pt.f === 'caixa') {
    const l = v('l'), a = v('a'), p = v('p');
    if (l <= 0 || a <= 0 || p <= 0) return null;
    const r = Math.min(v('r'), l / 2 - 0.01, a / 2 - 0.01, p / 2 - 0.01);
    geo = r > 0.2 ? new T.RoundedBoxGeometry(l, a, p, 3, r) : new T.BoxGeometry(l, a, p);
    pos = [v('x'), v('y') + a / 2, v('z')];
  } else if (pt.f === 'cil') {
    const raio = v('raio'), raio2 = pt.raio2 == null ? raio : v('raio2'), a = v('a');
    if (raio <= 0 || a <= 0) return null;
    geo = new T.CylinderGeometry(raio2, raio, a, 28);
    if (pt.eixo === 'x') geo.rotateZ(-Math.PI / 2);
    if (pt.eixo === 'z') geo.rotateX(Math.PI / 2);
    pos = [v('x'), v('y') + (pt.eixo === 'x' || pt.eixo === 'z' ? 0 : a / 2), v('z')];
  } else if (pt.f === 'esfera') {
    const raio = v('raio');
    if (raio <= 0) return null;
    geo = new T.SphereGeometry(raio, 24, 16);
    pos = [v('x'), v('y') + raio, v('z')];
  } else return null;
  const mesh = new T.Mesh(geo, mat);
  mesh.position.set(...pos);
  mesh.castShadow = pt.acab !== 'vidro';
  mesh.receiveShadow = true;
  return mesh;
}

function construirMovel(m) {
  const def = defCatalogo(m.tipo);
  const g = new T.Group();
  const interno = new T.Group();
  g.add(interno);
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
    for (const pt of def.partes) {
      try { const mesh = criarParte(pt, m); if (mesh) interno.add(mesh); }
      catch (err) { console.warn(err); }
    }
  } else {
    interno.add(caixa(m.l, m.a, m.p, material('#e5484d'), 0, m.a / 2, 0));
  }
  interno.scale.x = m.espelhado ? -1 : 1;
  g.position.set(m.x, 0, m.z);
  g.rotation.y = (-m.rot * Math.PI) / 180;
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
  for (const f of EXTENSOES.aposMoveis) f(grpMoveis, cen());
}

// =====================================================================
// 7. COLISÕES
// =====================================================================
let colisoes = { porMovel: new Map(), lista: [] };

function sobrepoe(a, b) {
  return Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > CFG.tolColisao &&
         Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) > CFG.tolColisao;
}
function caixaParede(w) {
  const e = w.esp / 2;
  return { x0: Math.min(w.x1, w.x2) - e, x1: Math.max(w.x1, w.x2) + e, z0: Math.min(w.z1, w.z2) - e, z1: Math.max(w.z1, w.z2) + e };
}

function verificarColisoes() {
  const porMovel = new Map(), lista = [];
  const marcar = (id, txt) => { if (!porMovel.has(id)) porMovel.set(id, []); porMovel.get(id).push(txt); };
  const itens = cen().moveis.map((m) => ({ m, def: defCatalogo(m.tipo) || {}, pg: pegada(m) }))
    .filter((i) => i.def.colide !== false);
  for (let i = 0; i < itens.length; i++) {
    const A = itens[i];
    for (let j = i + 1; j < itens.length; j++) {
      const B = itens[j];
      if ((A.def.ignora || []).includes(B.def.grupo) || (B.def.ignora || []).includes(A.def.grupo)) continue;
      if (!sobrepoe(A.pg, B.pg)) continue;
      marcar(A.m.id, B.m.nome); marcar(B.m.id, A.m.nome);
      lista.push({ ids: [A.m.id, B.m.id], txt: `${A.m.nome} × ${B.m.nome}` });
    }
    for (const w of doc.planta.paredes) {
      if (w.demolida || !sobrepoe(A.pg, caixaParede(w))) continue;
      marcar(A.m.id, `parede ${w.nome}`);
      lista.push({ ids: [A.m.id], txt: `${A.m.nome} × parede ${w.nome}` });
    }
  }
  colisoes = { porMovel, lista };
  renderAvisos();
}

// =====================================================================
// 8. SELEÇÃO E ARRASTE
// =====================================================================
const matSel = new T.MeshBasicMaterial({ color: CFG.corSel, transparent: true, opacity: 0.16, depthWrite: false });
const matCol = new T.MeshBasicMaterial({ color: CFG.corColisao, transparent: true, opacity: 0.28, depthWrite: false });
const linhaSel = new T.LineBasicMaterial({ color: CFG.corSel });
const linhaCol = new T.LineBasicMaterial({ color: CFG.corColisao });

function desenharSelecao() {
  limpar(grpSel);
  const marca = (m, fundo, linha) => {
    const pg = pegada(m);
    const q = new T.Mesh(new T.PlaneGeometry(pg.w, pg.d), fundo);
    q.rotation.x = -Math.PI / 2; q.position.set(m.x, 0.7, m.z);
    grpSel.add(q);
    const obj = objMovel.get(m.id);
    if (obj) {
      const b = new T.Box3().setFromObject(obj);
      grpSel.add(new T.Box3Helper(b, linha.color));
    }
  };
  for (const id of colisoes.porMovel.keys()) { const m = movel(id); if (m) marca(m, matCol, linhaCol); }
  if (sel?.tipo === 'movel') { const m = movel(sel.id); if (m) marca(m, matSel, linhaSel); }
}

function selecionar(s) {
  sel = s;
  construirPlanta();
  desenharSelecao();
  renderPainel();
  renderAreas();
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
  for (const h of ray.intersectObjects([grpMoveis, grpPlanta], true)) {
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
  if (toques.size > 1) { if (arr?.arrastavel) cancelarArraste(); arr = null; return; }
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const alvo = alvoEm(e);
  arr = { id: e.pointerId, x: e.clientX, y: e.clientY, alvo, movido: false };
  const paredeSel = alvo?.tipo === 'parede' && sel?.tipo === 'parede' && sel.id === alvo.id && !parede(alvo.id)?.demolida;
  if (alvo?.tipo === 'movel' || paredeSel) {
    const inicio = pontoNoPiso(e);
    if (!inicio) return;
    ctlAtivo().enabled = false;
    Object.assign(arr, { arrastavel: true, estado: JSON.stringify(doc), inicio });
    if (alvo.tipo === 'movel') {
      const m = movel(alvo.id);
      Object.assign(arr, { x0: m.x, z0: m.z });
      if (sel?.id !== m.id) selecionar({ tipo: 'movel', id: m.id });
    } else {
      arr.planta0 = clonar(doc.planta);
      arr.delta = 0;
    }
    renderer.domElement.setPointerCapture(e.pointerId);
  }
}

function aoMover(e) {
  if (!arr || e.pointerId !== arr.id) return;
  if (!arr.movido && Math.hypot(e.clientX - arr.x, e.clientY - arr.y) > 4) arr.movido = true;
  if (!arr.arrastavel || !arr.movido) return;
  const p = pontoNoPiso(e);
  if (!p) return;
  if (arr.alvo.tipo === 'movel') {
    const m = movel(arr.alvo.id);
    m.x = arr.x0 + (p.x - arr.inicio.x);
    m.z = arr.z0 + (p.z - arr.inicio.z);
    encaixar(m);
    objMovel.get(m.id)?.position.set(m.x, 0, m.z);
    verificarColisoes();
    desenharSelecao();
    renderPainelPosicao();
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
    ctlAtivo().enabled = true;
    if (g.movido) { registrar(g.estado); atualizarTudo(); }
    dica('');
    return;
  }
  if (g.movido) return; // foi órbita/arraste de câmera
  const a = g.alvo;
  if (!a) selecionar(null);
  else if (a.tipo === 'parede') selecionar({ tipo: 'parede', id: a.id, abertura: a.abertura });
  else if (a.tipo === 'ambiente') selecionar({ tipo: 'ambiente', id: a.id });
}

function cancelarArraste() {
  if (!arr) return;
  ctlAtivo().enabled = true;
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
  let p = pontoNoPiso({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
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
  if (ctrl && k === 'z' && !e.shiftKey) { e.preventDefault(); desfazer(); }
  else if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); refazer(); }
  else if (ctrl && k === 'd') { e.preventDefault(); duplicarSelecionado(); }
  else if (ctrl) return;
  else if (k === 'delete' || k === 'backspace') { e.preventDefault(); removerSelecionado(); }
  else if (k === 'r') girar(e.shiftKey ? -1 : 1);
  else if (k === 't') alternarVista();
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
}

function painelMovel(p, cab) {
  const m = movel(sel.id);
  if (!m) return;
  const def = defCatalogo(m.tipo) || { nome: m.tipo };
  const pg = pegada(m);
  const col = colisoes.porMovel.get(m.id);
  anexar(p, 
    cab(m.nome, def.nome),
    el('div', { class: 'status ' + (col ? 'alerta' : 'ok') }, col ? `⚠ Colide com: ${[...new Set(col)].join(', ')}` : '✓ Sem colisões'),
    secao('Nome', campoTexto('Nome', m.nome, (v) => alterar(() => { m.nome = v; }))),
    secao('Medidas',
      el('div', { class: 'grade3' },
        campoNum('Largura', m.l, (v) => alterar(() => { m.l = v; })),
        campoNum('Profund.', m.p, (v) => alterar(() => { m.p = v; })),
        campoNum('Altura', m.a, (v) => alterar(() => { m.a = v; }))),
      botao('Voltar às medidas do catálogo', () => def.dim && alterar(() => Object.assign(m, { l: def.dim.l, p: def.dim.p, a: def.dim.a })), { class: 'link' })),
    secao('Posição (canto superior esquerdo)',
      el('div', { class: 'grade2' },
        campoNum('X', pg.x0, (v) => alterar(() => { m.x = v + pg.w / 2; }), { min: -500, max: 3000, chave: 'x' }),
        campoNum('Z', pg.z0, (v) => alterar(() => { m.z = v + pg.d / 2; }), { min: -500, max: 3000, chave: 'z' })),
      el('div', { class: 'linha-botoes' },
        botao('↺ 90°', () => girar(-1), { title: 'Girar anti-horário (Shift+R)' }),
        botao('↻ 90°', () => girar(1), { title: 'Girar horário (R)' }),
        botao('⇋ Espelhar', () => alterar(() => { m.espelhado = !m.espelhado; }), { title: 'Inverter lado (ex.: chaise)' }))),
    secao('Cores',
      el('div', { class: 'grade2' },
        campoCor('Principal', m.cores.principal, (v, fim) => { m.cores.principal = v; aplicarMudancaMovel(m, fim); }),
        campoCor('Secundária', m.cores.secundaria || '#888888', (v, fim) => { m.cores.secundaria = v; aplicarMudancaMovel(m, fim); }))),
    el('div', { class: 'linha-botoes fim' },
      botao('Duplicar', duplicarSelecionado, { title: 'Ctrl+D' }),
      botao('Remover', removerSelecionado, { class: 'perigo', title: 'Delete' })),
    el('p', { class: 'nota' }, 'Arraste o móvel no piso (encaixe de 5 cm). Setas movem 5 cm, Shift+setas 25 cm.'),
  );
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
  box.append(el('b', {}, `⚠ ${colisoes.lista.length} ${colisoes.lista.length === 1 ? 'conflito' : 'conflitos'}`));
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
}

function atualizarTudo() {
  if (doc.ativo >= doc.cenarios.length) doc.ativo = 0;
  validarSelecao();
  construirPlanta();
  construirMoveis();
  verificarColisoes();
  desenharSelecao();
  renderAbas();
  renderAreas();
  renderLuz();
  renderDemolicao();
  renderCatalogo();
  renderPainel();
  atualizarBotoes();
  salvarAuto();
}

function alternarVista() {
  vista.topo = !vista.topo;
  ctlPersp.enabled = !vista.topo;
  ctlTopo.enabled = vista.topo;
  atualizarBotoes();
}

$('#bDesfazer').onclick = desfazer;
$('#bRefazer').onclick = refazer;
$('#bVista').onclick = alternarVista;
$('#bCorte').onclick = () => { vista.corte = !vista.corte; construirPlanta(); atualizarBotoes(); };
$('#bEnquadrar').onclick = enquadrar;
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
  grpSel.visible = false;
  renderer.render(cena, camAtiva());
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
  ctlAtivo().update();
  renderer.render(cena, camAtiva());
  posicionarRotulos();
  posicionarBussola();
});

// acesso pelo console, útil para testes e ajustes finos
window.simulador = { get doc() { return doc; }, atualizarTudo, selecionar, esticar, areaUtil, areaConstruida, alternarVista, enquadrar, exportarPNG, CFG, camera: camAtiva, alvo: (x, y) => alvoEm({ clientX: x, clientY: y }), get sel() { return sel; } };
})();
