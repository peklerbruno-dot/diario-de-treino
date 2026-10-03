// =====================================================================
// CATÁLOGO DE MÓVEIS — dados
// =====================================================================
// Cada móvel é uma lista de formas. Medidas podem ser números (cm) ou
// fórmulas com L, P e A (largura, profundidade e altura do móvel) — é o
// que deixa redimensionar sem deformar pés e puxadores. Também valem
// min, max, abs, floor, ceil, round, sin, cos, sqrt e PI.
//
// Eixos locais: x de -L/2 a L/2 (esquerda → direita), z de -P/2 (costas)
// a P/2 (frente), y a partir da base do móvel.
//
// Formas:
//   caixa:  { f:'caixa', x, z, y, l, p, a, r }   x,z = centro; y = base; r = cantos arredondados
//   cil:    { f:'cil', x, z, y, raio, raio2, a, eixo }   raio2 = topo (cone); eixo 'x'/'z' = deitado (y = centro)
//           ou { f:'cil', l, p, a, k }   cilindro elíptico (mesa oval), k = topo/base
//   esfera: { f:'esfera', x, z, y, raio, ex, ey, ez }   ex/ey/ez = achatamento
//   torno:  { f:'torno', pts: [[raio, altura], …] }      perfil girado (vasos, cúpulas)
// Em qualquer forma: rx, ry, rz (giro em graus), se (condição), n (repetições,
// com i = 0, 1, 2… nas fórmulas), cor ('principal', 'secundaria', '#hex' ou
// lista por repetição) e acab (acabamento; '@' = material escolhido no painel).
//
// Movimento ('Abrir', 'Estender'…): mov: { gira: graus, eixo, px, py, pz } gira
// em torno do pivô; mov: { desliza: [dx, dy, dz] } desliza; mov: { escala:
// [sx, sy, sz], px, py, pz } encolhe (persiana). O botão do painel leva de 0 a 1.
//
// Variantes: 'variantes: [{ id, nome, dim, partes, uso, acao, luz }]' — o
// formato do móvel, trocado no painel.
// Área de uso: 'uso: [{ nome, x0, x1, z0, z1 }]' — retângulos locais que
// precisam ficar livres para usar o móvel.
// Luz: 'luz: { x, y, z, intensidade }' — acende à noite.
// =====================================================================

// ---- pedaços reaproveitados
const CANTOS4 = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const pes = (a, raio, recuo, extra = {}) => CANTOS4.map(([sx, sz]) => ({
  f: 'cil', raio, raio2: extra.raio2 ?? raio, a, x: `${sx}*(L/2-${recuo})`, z: `${sz}*(P/2-${recuo})`, cor: 'secundaria', acab: 'madeira', ...extra,
}));
const frente = (prof, nome = 'Área de uso', extra = {}) => ({ nome, x0: '-L/2', x1: 'L/2', z0: 'P/2', z1: `P/2+${prof}`, ...extra });
const TONS_ROUPA = ['#2f3b4c', '#c9b9a3', '#7a8b6f', '#e8e2d6', '#8c4f3c', '#3d3d40', '#b8c4cf', '#d9a98a'];
const TONS_LIVRO = ['#8c3b2e', '#2f4a6b', '#d8c079', '#3c5a46', '#e9e2d3', '#6b4c7a', '#1f2b38', '#c27a52'];
const LUZ_QUENTE = '#ffcf8f';

// Cama: corpo comum às variantes (cb = espaço da cabeceira; bau = colchão levanta)
function cama(cb, bau) {
  const zc = `(${cb}/2)`, Pb = `(P-${cb})`;
  const lev = bau ? { mov: { gira: -35, eixo: 'x', px: 0, py: 'A', pz: `${zc}-${Pb}/2+2` } } : {};
  return [
    ...CANTOS4.map(([sx, sz]) => ({ f: 'cil', raio: 2.5, a: 8, x: `${sx}*(L/2-10)`, z: `${zc}+${sz}*(${Pb}/2-10)`, cor: '#2a2622', acab: 'metal' })),
    { f: 'caixa', l: 'L', p: Pb, a: 'A*0.45-8', y: 8, z: zc, cor: 'secundaria', acab: 'tecido', r: 2 },
    ...(bau ? [{ f: 'caixa', l: 'L-6', p: `${Pb}-6`, a: 0.6, y: 'A*0.45', z: zc, cor: '#3b342d' }] : []),
    { f: 'caixa', l: 'L-1', p: `${Pb}-1`, a: 'A*0.55', y: 'A*0.45', z: zc, cor: '#f4f1ea', acab: 'tecido', r: 5, ...lev },
    // edredom (cor principal) caindo nas laterais e no pé
    { f: 'caixa', l: 'L+3', p: `${Pb}*0.7`, a: 5, y: 'A-2', z: `${zc}+${Pb}*0.15`, acab: '@', r: 2.4, ...lev },
    { f: 'caixa', l: 3, p: `${Pb}*0.7`, a: 26, y: 'A-26', x: '-L/2-1', z: `${zc}+${Pb}*0.15`, acab: '@', r: 1.2, ...lev },
    { f: 'caixa', l: 3, p: `${Pb}*0.7`, a: 26, y: 'A-26', x: 'L/2+1', z: `${zc}+${Pb}*0.15`, acab: '@', r: 1.2, ...lev },
    { f: 'caixa', l: 'L+3', p: 3, a: 26, y: 'A-26', z: `${zc}+${Pb}/2+1`, acab: '@', r: 1.2, ...lev },
    { f: 'caixa', l: 'L+2', p: 14, a: 6, y: 'A-1', z: `${zc}-${Pb}*0.2+7`, cor: '#faf8f3', acab: 'tecido', r: 2.8, ...lev },
    // travesseiros, almofada e manta
    { f: 'caixa', n: 2, l: 'L*0.43', p: 34, a: 13, y: 'A-1', x: '(i*2-1)*L*0.23', z: `${zc}-${Pb}/2+25`, rx: -10, cor: '#fbfaf6', acab: 'tecido', r: 6, ...lev },
    { f: 'caixa', l: 'min(45,L*0.35)', p: 12, a: 32, y: 'A+2', z: `${zc}-${Pb}/2+44`, rx: -18, cor: '#b9836a', acab: 'veludo', r: 5, ...lev },
    { f: 'caixa', l: 'L+5', p: 40, a: 2.5, y: 'A+3', z: `${zc}+${Pb}/2-26`, cor: '#7f8f86', acab: 'linho', r: 1.2, ...lev },
  ];
}
const usoCama = [
  { nome: 'Lado esquerdo', x0: '-L/2-50', x1: '-L/2', z0: '-P/2+45', z1: 'P/2' },
  { nome: 'Lado direito', x0: 'L/2', x1: 'L/2+50', z0: '-P/2+45', z1: 'P/2' },
  { nome: 'Pé da cama', x0: '-L/2', x1: 'L/2', z0: 'P/2', z1: 'P/2+40' },
];

// Sofá: c = com chaise, ret = retrátil (assento desliza e encosto reclina)
function sofa({ chaise = false, ret = false }) {
  const C = 'L*0.36';
  const desl = ret ? { mov: { desliza: [0, 0, 40] } } : {};
  const recl = ret ? { mov: { gira: -16, eixo: 'x', py: 40, pz: '-P/2+20' } } : {};
  const D = chaise ? 90 : 'P';            // profundidade do corpo principal
  const zc = chaise ? '-P/2+45' : '0';    // centro do corpo principal
  const braco = chaise ? [1] : [-1, 1];   // braços (o lado da chaise fica livre)
  const largAssento = chaise ? `(L*0.64-16)` : '(L-32)';
  const x0Assento = chaise ? `(-L/2+${C})` : '(-L/2+16)';
  const nAss = chaise ? 2 : 3;
  return [
    // pés de madeira cônicos
    ...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => ({
      f: 'cil', raio: 1.8, raio2: 2.6, a: 10, x: `${sx}*(L/2-7)`, z: sz < 0 ? '-P/2+7' : (chaise && sx < 0 ? 'P/2-7' : `-P/2+${chaise ? 83 : 'P-7'}`), cor: 'secundaria', acab: 'madeira',
    })),
    ...(chaise ? [{ f: 'cil', raio: 1.8, raio2: 2.6, a: 10, x: `-L/2+${C}-7`, z: 'P/2-7', cor: 'secundaria', acab: 'madeira' }] : []),
    { f: 'caixa', l: 'L', p: D, a: 18, y: 10, z: zc, acab: '@', r: 3 },
    ...(chaise ? [{ f: 'caixa', l: C, p: 'P-90', a: 18, y: 10, x: `-L/2+${C}/2`, z: 45, acab: '@', r: 3 }] : []),
    ...(ret ? [{ f: 'caixa', l: 'L-34', p: 40, a: 16, y: 11, z: 'P/2-21', acab: '@', r: 3, ...desl }] : []),
    { f: 'caixa', l: 'L', p: 18, a: 'A-10', y: 10, z: '-P/2+9', acab: '@', r: 6 },
    ...braco.map((s) => ({ f: 'caixa', l: 16, p: D, a: 'A*0.7-10', y: 10, x: `${s}*(L/2-8)`, z: zc, acab: '@', r: 7 })),
    // almofadas do assento
    ...(chaise ? [{ f: 'caixa', l: `${C}-2`, p: 'P-20', a: 14, y: 28, x: `-L/2+${C}/2`, z: 10, acab: '@', r: 6 }] : []),
    { f: 'caixa', n: nAss, l: `${largAssento}/${nAss}-1`, p: chaise ? 70 : 'P-22', a: 14, y: 28,
      x: `${x0Assento}+${largAssento}/${nAss}*(i+0.5)`, z: chaise ? '-P/2+54' : '9', acab: '@', r: 6, ...desl },
    // almofadas do encosto
    { f: 'caixa', n: chaise ? 3 : nAss, l: chaise ? '(L-16)/3-1' : `${largAssento}/${nAss}-1`, p: 16, a: 'A-44', y: 40,
      x: chaise ? '-L/2+(L-16)/6+i*(L-16)/3' : `${x0Assento}+${largAssento}/${nAss}*(i+0.5)`, z: '-P/2+26', rx: -8, acab: '@', r: 7, ...recl },
    // almofadas soltas
    { f: 'caixa', l: 42, p: 13, a: 42, y: 41, x: chaise ? `-L/2+${C}/2` : '-L/2+38', z: '-P/2+38', rx: -15, rz: -6, cor: '#c47a4f', acab: 'veludo', r: 6 },
    { f: 'caixa', l: 40, p: 13, a: 40, y: 41, x: 'L/2-38', z: '-P/2+38', rx: -15, rz: 7, cor: '#e7dcc8', acab: 'boucle', r: 6 },
  ];
}

// Gaveta/porta reutilizável: mov desliza para frente
const gaveta = (x, y, l, a, P = 'P', extra = {}) => [
  { f: 'caixa', l, p: 1.8, a, x, y, z: `${P}/2+0.9`, acab: 'madeira', mov: { desliza: [0, 0, `${P}*0.6`] }, ...extra },
  { f: 'caixa', l: `${l}-4`, p: `${P}-6`, a: `${a}*0.8`, x, y: `${y}+2`, z: `${P}/2-(${P}-6)/2`, cor: '#d8c4a8', mov: { desliza: [0, 0, `${P}*0.6`] } },
  { f: 'caixa', l: 12, p: 1.4, a: 1.4, x, y: `${y}+${a}*0.7`, z: `${P}/2+2.4`, cor: '#b19a72', acab: 'metal', mov: { desliza: [0, 0, `${P}*0.6`] } },
];

// TV: moldura + tela (largura w)
const tv = (w, y, z) => [
  { f: 'caixa', l: w, p: 2.5, a: `${w}*0.575`, y, z, cor: '#1a1a1c', acab: 'metal' },
  { f: 'caixa', l: `${w}-1.6`, p: 0.3, a: `${w}*0.575-1.6`, y: `${y}+0.8`, z: `${z}+1.4`, cor: '#07080b', acab: 'tela' },
];

// Planta em vaso (folhas de costela-de-adão)
const folhas = (n, yBase, alt, raio, cor = 'principal') => ({
  f: 'esfera', n, raio, ex: 1, ey: 0.12, ez: 0.62, x: `cos(i*2.4)*min(L,P)*0.2`, z: `sin(i*2.4)*min(L,P)*0.2`,
  y: `${yBase}+(i%4)*${alt}/4`, ry: '-i*137', rz: '18+(i%3)*12', cor, acab: 'planta',
});

const CATALOGO = [
  // ================================================================ QUARTO
  {
    tipo: 'cama_box', nome: 'Cama', cat: 'Quarto',
    dim: { l: 128, p: 188, a: 60 }, cores: { principal: '#d9cfc0', secundaria: '#8b7d6b' }, rotulosCores: ['Roupa de cama', 'Base / cabeceira'],
    acabamentos: ['linho', 'tecido', 'veludo'],
    uso: usoCama,
    variantes: [
      { id: 'box', nome: 'Box simples', partes: cama(0, false) },
      { id: 'cabeceira', nome: 'Com cabeceira estofada', partes: [
        ...cama(8, false),
        { f: 'caixa', l: 'L+12', p: 8, a: 115, z: '-P/2+4', cor: 'secundaria', acab: 'tecido', r: 3 },
        { f: 'caixa', n: 4, l: '(L+12)/4-2', p: 4, a: 62, y: 46, x: '-(L+12)/2+(L+12)/8+i*(L+12)/4', z: '-P/2+9', cor: 'secundaria', acab: 'tecido', r: 2 },
      ] },
      { id: 'bau', nome: 'Box baú', acao: ['Abrir baú', 'Fechar baú'], partes: cama(0, true) },
    ],
  },
  {
    tipo: 'guarda_roupa', nome: 'Guarda-roupa', cat: 'Quarto',
    dim: { l: 160, p: 55, a: 220 }, cores: { principal: '#ebe6de', secundaria: '#b89a78' }, rotulosCores: ['Portas', 'Corpo'],
    variantes: ['correr', 'espelho', 'abrir'].map((id) => {
      const corpo = [
        { f: 'caixa', l: 'L', p: 2, a: 'A', z: '-P/2+1', cor: 'secundaria', acab: 'madeira' },
        { f: 'caixa', n: 2, l: 2, p: 'P-6', a: 'A', x: '(i*2-1)*(L/2-1)', z: -3, cor: 'secundaria', acab: 'madeira' },
        { f: 'caixa', l: 'L', p: 'P-6', a: 2, y: 'A-2', z: -3, cor: 'secundaria', acab: 'madeira' },
        { f: 'caixa', l: 'L-4', p: 'P-8', a: 8, z: -3, cor: '#2b2622' },
        { f: 'caixa', l: 'L-4', p: 'P-8', a: 1.8, y: 8, z: -3, cor: 'secundaria', acab: 'madeira' },
        { f: 'caixa', l: 1.8, p: 'P-8', a: 'A-12', y: 10, z: -3, cor: 'secundaria', acab: 'madeira' },
        // por dentro: cabideiro com roupas à esquerda, prateleiras à direita
        { f: 'cil', eixo: 'x', raio: 1, a: 'L/2-4', y: 'A-26', x: '-L/4', z: -4, cor: '#c9ccd1', acab: 'metal' },
        { f: 'caixa', n: 'floor((L/2-12)/6)', l: 2.5, p: 'P-18', a: '80+(i%3)*12', y: 'A-27-80-(i%3)*12', x: '-L/2+7+i*6', z: -4, cor: TONS_ROUPA, acab: 'tecido', r: 1 },
        { f: 'caixa', n: 4, l: 'L/2-4', p: 'P-10', a: 1.8, y: '10+(i+1)*(A-14)/5', x: 'L/4', z: -4, cor: 'secundaria', acab: 'madeira' },
        { f: 'caixa', n: 4, l: 'L/2-14', p: 'P-22', a: 14, y: '10+(i+1)*(A-14)/5+1.8', x: 'L/4', z: -6, cor: TONS_ROUPA.slice(2), acab: 'tecido', r: 2 },
      ];
      if (id === 'abrir') {
        const portas = [0, 1, 2, 3].map((k) => {
          const xs = `-L/2+L/8+${k}*L/4`, piv = ['-L/2+0.5', '-0.5', '0.5', 'L/2-0.5'][k], ang = k % 2 ? 100 : -100;
          const pux = ['-L/4-3', '-L/4+3', 'L/4-3', 'L/4+3'][k];
          const mov = { gira: ang, eixo: 'y', px: piv, pz: 'P/2-1' };
          return [
            { f: 'caixa', l: 'L/4-1', p: 2, a: 'A-12', y: 10, x: xs, z: 'P/2-1', cor: 'principal', acab: 'laca', mov },
            { f: 'caixa', l: 1.5, p: 2, a: 40, y: 'A*0.45', x: pux, z: 'P/2+1', cor: '#a9a9a9', acab: 'metal', mov },
          ];
        }).flat();
        return { id, nome: 'Portas de abrir', acao: ['Abrir portas', 'Fechar portas'], uso: [frente('L/4+10', 'Abrir as portas')], partes: [...corpo, ...portas] };
      }
      const mov = { desliza: ['L/2-6', 0, 0] };
      return {
        id, nome: id === 'espelho' ? 'Correr com espelho' : 'Portas de correr', acao: ['Abrir porta', 'Fechar porta'],
        uso: [frente(60, 'Frente do armário')],
        partes: [
          ...corpo,
          { f: 'caixa', l: 'L', p: 7, a: 3, y: 'A-3', z: 'P/2-3.5', cor: 'secundaria', acab: 'madeira' },
          { f: 'caixa', l: 'L/2+2', p: 2, a: 'A-14', y: 10, x: 'L/4-1', z: 'P/2-4.5', cor: 'principal', acab: 'laca' },
          { f: 'caixa', l: 1.5, p: 1.5, a: 'A*0.5', y: 'A*0.25', x: 'L/2-4', z: 'P/2-3.2', cor: '#9a9a9a', acab: 'metal' },
          { f: 'caixa', l: 'L/2+2', p: 2, a: 'A-14', y: 10, x: '-L/4+1', z: 'P/2-1.5', cor: id === 'espelho' ? '#dfe7ea' : 'principal', acab: id === 'espelho' ? 'espelho' : 'laca', mov },
          { f: 'caixa', l: 1.5, p: 1.5, a: 'A*0.5', y: 'A*0.25', x: '-L/2+4', z: 'P/2-0.2', cor: '#9a9a9a', acab: 'metal', mov },
        ],
      };
    }),
  },
  {
    tipo: 'criado_mudo', nome: 'Criado-mudo', cat: 'Quarto',
    dim: { l: 45, p: 40, a: 55 }, cores: { principal: '#c4a27a', secundaria: '#7a5a3e' }, rotulosCores: ['Corpo', 'Pés'],
    variantes: [
      { id: 'gaveta', nome: 'Gaveta e nicho', acao: ['Abrir gaveta', 'Fechar gaveta'], uso: [frente(35, 'Abrir a gaveta')], partes: [
        ...pes(18, 1.1, 4, { raio2: 1.8 }),
        { f: 'caixa', l: 'L', p: 'P', a: 'A-18', y: 18, acab: 'madeira', r: 0.8 },
        { f: 'caixa', l: 'L-4', p: 0.4, a: '(A-18)*0.42', y: 20, z: 'P/2+0.1', cor: '#3a3029' },
        ...gaveta(0, '18+(A-18)*0.5', 'L-3', '(A-18)*0.46'),
        { f: 'caixa', n: 3, l: '(L-10)/3', p: 'P*0.5', a: '6+i*2', y: 21, x: '-L/2+5+(L-10)/6+i*(L-10)/3', z: -2, cor: TONS_LIVRO, acab: 'tecido' },
      ] },
      { id: 'nicho', nome: 'Aberto com prateleira', partes: [
        ...pes(18, 1.1, 4, { raio2: 1.8 }),
        { f: 'caixa', l: 'L', p: 'P', a: 2, y: 18, acab: 'madeira' },
        { f: 'caixa', l: 'L', p: 'P', a: 2, y: 'A-2', acab: 'madeira' },
        { f: 'caixa', n: 2, l: 2, p: 'P', a: 'A-22', y: 20, x: '(i*2-1)*(L/2-1)', acab: 'madeira' },
        { f: 'caixa', l: 'L-4', p: 1.5, a: 'A-22', y: 20, z: '-P/2+0.75', acab: 'madeira' },
        { f: 'caixa', l: 'L-4', p: 'P-2', a: 1.8, y: '18+(A-18)/2', acab: 'madeira' },
        { f: 'caixa', n: 5, l: 3, p: 'P*0.6', a: '13+(i%3)*2', y: 20, x: '-L/2+6+i*3.4', z: -2, cor: TONS_LIVRO, acab: 'tecido' },
      ] },
    ],
  },
  {
    tipo: 'cortina', nome: 'Cortina', cat: 'Quarto', colide: false, aberto: 1,
    dim: { l: 150, p: 12, a: 250 }, cores: { principal: '#ece6dc', secundaria: '#6d6d70' }, rotulosCores: ['Tecido', 'Varão'],
    acabamentos: ['linho', 'voil', 'blackout', 'veludo'],
    acao: ['Abrir cortina', 'Fechar cortina'],
    partes: [
      { f: 'cil', eixo: 'x', raio: 1.2, a: 'L+10', y: 'A-4', cor: 'secundaria', acab: 'metal' },
      { f: 'esfera', n: 2, raio: 2.2, x: '(i*2-1)*(L/2+6)', y: 'A-6.2', cor: 'secundaria', acab: 'metal' },
      // pregas: fechadas cobrem a janela; abertas juntam nos cantos
      { f: 'caixa', n: 'floor(L/18)', l: 10, p: 7, a: 'A-10', y: 2, x: '-L/2+(L/2)/floor(L/18)*(i+0.5)', z: '(i%2)*3-1.5', acab: '@', r: 3,
        mov: { desliza: ['(-L/2+5+i*4.5)-(-L/2+(L/2)/floor(L/18)*(i+0.5))', 0, 0] } },
      { f: 'caixa', n: 'floor(L/18)', l: 10, p: 7, a: 'A-10', y: 2, x: 'L/2-(L/2)/floor(L/18)*(i+0.5)', z: '(i%2)*3-1.5', acab: '@', r: 3,
        mov: { desliza: ['(L/2-5-i*4.5)-(L/2-(L/2)/floor(L/18)*(i+0.5))', 0, 0] } },
    ],
  },
  {
    tipo: 'persiana', nome: 'Persiana rolô', cat: 'Quarto', colide: false, aberto: 0.85, elev: 95,
    dim: { l: 125, p: 8, a: 130 }, cores: { principal: '#e9e3d8', secundaria: '#d8d4cd' }, rotulosCores: ['Tela', 'Caixa'],
    acabamentos: ['tecido', 'blackout', 'voil'], acao: ['Enrolar', 'Baixar'],
    partes: [
      { f: 'caixa', l: 'L', p: 'P', a: 9, y: 'A-9', cor: 'secundaria', acab: 'laca', r: 2 },
      { f: 'caixa', l: 'L-4', p: 1, a: 'A-9', y: 0, acab: '@', mov: { escala: [1, 0.03, 1], px: 0, py: 'A-9', pz: 0 } },
      { f: 'caixa', l: 'L-4', p: 2, a: 2.5, y: 0, cor: 'secundaria', acab: 'metal', mov: { desliza: [0, 'A-12', 0] } },
    ],
  },

  // ================================================================ SALA
  {
    tipo: 'sofa_chaise', nome: 'Sofá', cat: 'Sala',
    dim: { l: 205, p: 160, a: 85 }, cores: { principal: '#9a9c98', secundaria: '#6b4a32' }, rotulosCores: ['Estofado', 'Pés'],
    acabamentos: ['linho', 'veludo', 'boucle', 'couro'],
    variantes: [
      { id: 'chaise', nome: 'Com chaise', partes: sofa({ chaise: true }),
        uso: [{ nome: 'Pernas e passagem', x0: '-L/2+L*0.36', x1: 'L/2', z0: '-P/2+90', z1: '-P/2+135' }] },
      { id: 'reto', nome: 'Reto', dim: { l: 205, p: 95, a: 85 }, partes: sofa({}), uso: [frente(45, 'Pernas e passagem')] },
      { id: 'retratil', nome: 'Retrátil e reclinável', dim: { l: 220, p: 105, a: 92 }, acao: ['Estender e reclinar', 'Recolher'],
        partes: sofa({ ret: true }), uso: [frente(45, 'Pernas e passagem')] },
    ],
  },
  {
    tipo: 'sofa', nome: 'Sofá reto', cat: 'Sala',
    dim: { l: 180, p: 95, a: 85 }, cores: { principal: '#9a9c98', secundaria: '#6b4a32' }, rotulosCores: ['Estofado', 'Pés'],
    acabamentos: ['linho', 'veludo', 'boucle', 'couro'],
    variantes: [
      { id: 'reto', nome: 'Reto', partes: sofa({}), uso: [frente(45, 'Pernas e passagem')] },
      { id: 'retratil', nome: 'Retrátil e reclinável', dim: { l: 200, p: 105, a: 92 }, acao: ['Estender e reclinar', 'Recolher'],
        partes: sofa({ ret: true }), uso: [frente(45, 'Pernas e passagem')] },
    ],
  },
  {
    tipo: 'poltrona', nome: 'Poltrona', cat: 'Sala',
    dim: { l: 75, p: 80, a: 80 }, cores: { principal: '#b9895b', secundaria: '#4a3527' }, rotulosCores: ['Estofado', 'Estrutura'],
    acabamentos: ['couro', 'linho', 'veludo', 'boucle'],
    uso: [frente(40, 'Pernas')],
    partes: [
      ...pes(16, 1.6, 6, { raio2: 2.2 }),
      { f: 'caixa', l: 'L-4', p: 'P-6', a: 4, y: 16, cor: 'secundaria', acab: 'madeira', r: 1 },
      { f: 'caixa', l: 'L-16', p: 'P-14', a: 13, y: 20, z: 4, acab: '@', r: 6 },
      { f: 'caixa', l: 'L-16', p: 14, a: 'A-26', y: 24, z: '-P/2+10', rx: -12, acab: '@', r: 7 },
      { f: 'caixa', n: 2, l: 8, p: 'P-6', a: 24, y: 20, x: '(i*2-1)*(L/2-4)', cor: 'secundaria', acab: 'madeira', r: 2 },
      { f: 'caixa', l: 34, p: 11, a: 30, y: 33, z: '-P/2+22', rx: -14, cor: '#e7dcc8', acab: 'linho', r: 5 },
    ],
  },
  {
    tipo: 'puff', nome: 'Puff', cat: 'Sala',
    dim: { l: 50, p: 50, a: 42 }, cores: { principal: '#c8b49a', secundaria: '#6b4a32' }, rotulosCores: ['Estofado', 'Pés'],
    acabamentos: ['boucle', 'veludo', 'couro', 'linho'],
    variantes: [
      { id: 'redondo', nome: 'Redondo', partes: [
        { f: 'cil', l: 'L', p: 'P', a: 'A-4', y: 0, acab: '@', k: 0.98 },
        { f: 'cil', l: 'L-2', p: 'P-2', a: 4, y: 'A-4', acab: '@', k: 0.9 },
      ] },
      { id: 'quadrado', nome: 'Quadrado com pés', partes: [...pes(8, 1.4, 5, { raio2: 2 }), { f: 'caixa', l: 'L', p: 'P', a: 'A-8', y: 8, acab: '@', r: 6 }] },
    ],
  },
  {
    tipo: 'estante_tv', nome: 'Estante divisória com TV', cat: 'Sala',
    dim: { l: 180, p: 45, a: 180 }, cores: { principal: '#c4a27a', secundaria: '#3b3632' }, rotulosCores: ['Madeira', 'Painel'],
    variantes: [
      { id: 'vazada', nome: 'Vazada com nichos', partes: [
        { f: 'caixa', l: 'L', p: 'P', a: 6, cor: '#2b2622' },
        { f: 'caixa', l: 'L', p: 'P', a: 3, y: 6, acab: 'madeira' },
        { f: 'caixa', n: 2, l: 3, p: 'P', a: 'A-6', y: 6, x: '(i*2-1)*(L/2-1.5)', acab: 'madeira' },
        { f: 'caixa', l: 'L', p: 'P', a: 3, y: 'A-3', acab: 'madeira' },
        { f: 'caixa', n: 2, l: 'L-6', p: 'P', a: 3, y: 'i ? A*0.78 : A*0.25', acab: 'madeira' },
        { f: 'caixa', l: 'L-6', p: 2.5, a: 'A*0.53-3', y: 'A*0.25+3', cor: 'secundaria', acab: 'madeira' },
        ...tv('min(L*0.72,145)', 'A*0.28', 2.6),
        { f: 'caixa', l: 'min(L*0.5,90)', p: 8, a: 6, y: 'A*0.25+3', z: 'P/2-7', cor: '#202022', acab: 'tecido', r: 2 },
        { f: 'caixa', n: 7, l: 3.2, p: 'P*0.55', a: '20+(i%3)*3', y: 'A*0.78+3', x: 'L/2-12-i*3.6', z: '-P*0.1', cor: TONS_LIVRO, acab: 'tecido' },
        { f: 'torno', pts: [[0, 0], [5, 0], [7, 6], [6, 14], [3.5, 20], [4, 23], [0, 23]], x: '-L/2+18', y: 'A*0.78+3', cor: '#d9cbb5', acab: 'ceramica' },
        { f: 'cil', raio: 6, raio2: 7, a: 10, x: '-L/2+20', y: 9, cor: '#efe9df', acab: 'ceramica' },
        folhas(6, 22, 12, 7, '#4f7a4a'),
        { f: 'caixa', n: 2, l: 24, p: 'P*0.6', a: '12-i*3', y: 9, x: 'L/2-22', z: '-i*1', cor: ['#e6dccb', '#7d6a58'], acab: 'linho', r: 1 },
      ] },
      { id: 'ripada', nome: 'Painel ripado', partes: [
        { f: 'caixa', l: 'L', p: 'P', a: 8, cor: '#2b2622' },
        { f: 'caixa', l: 'L', p: 'P', a: 40, y: 8, acab: 'madeira', r: 0.6 },
        { f: 'caixa', n: 2, l: 'L/2-2', p: 1, a: 34, y: 11, x: '(i*2-1)*L/4', z: 'P/2', cor: 'secundaria', acab: 'madeira' },
        { f: 'caixa', n: 'floor(L/6)', l: 3.5, p: 3, a: 'A-48', y: 48, x: '-L/2+3+i*(L-6)/(floor(L/6)-1)', acab: 'madeira' },
        ...tv('min(L*0.72,145)', 'A*0.42', 3),
        { f: 'caixa', l: 'min(L*0.5,90)', p: 8, a: 6, y: 48, z: 'P/2-7', cor: '#202022', acab: 'tecido', r: 2 },
        { f: 'torno', pts: [[0, 0], [6, 0], [8, 10], [5, 22], [5.5, 25], [0, 25]], x: '-L/2+20', y: 48, cor: '#3f5a4c', acab: 'ceramica' },
      ] },
    ],
  },
  {
    tipo: 'rack_tv', nome: 'Rack', cat: 'Sala',
    dim: { l: 160, p: 40, a: 50 }, cores: { principal: '#c4a27a', secundaria: '#ebe6de' }, rotulosCores: ['Corpo', 'Portas'],
    uso: [frente(40, 'Abrir as portas')],
    variantes: [
      { id: 'basculante', nome: 'Portas basculantes', acao: ['Abrir portas', 'Fechar portas'], partes: [
        ...pes(12, 1.2, 6, { raio2: 2 }),
        { f: 'caixa', l: 'L', p: 'P', a: 'A-12', y: 12, acab: 'madeira', r: 0.6 },
        { f: 'caixa', n: 2, l: 'L/2-3', p: 1.8, a: 'A-18', y: 15, x: '(i*2-1)*L/4', z: 'P/2+0.9', cor: 'secundaria', acab: 'laca',
          mov: { gira: 85, eixo: 'x', py: 15, pz: 'P/2' } },
      ] },
      { id: 'gavetas', nome: 'Gavetas', acao: ['Abrir gavetas', 'Fechar gavetas'], partes: [
        ...pes(12, 1.2, 6, { raio2: 2 }),
        { f: 'caixa', l: 'L', p: 'P', a: 'A-12', y: 12, acab: 'madeira', r: 0.6 },
        ...gaveta('-L/4', 15, 'L/2-3', 'A-18', 'P', { cor: 'secundaria', acab: 'laca' }),
        ...gaveta('L/4', 15, 'L/2-3', 'A-18', 'P', { cor: 'secundaria', acab: 'laca' }),
      ] },
    ],
  },
  {
    tipo: 'tv_parede', nome: 'TV na parede', cat: 'Sala', elev: 95,
    dim: { l: 123, p: 6, a: 71 }, cores: { principal: '#1a1a1c', secundaria: '#07080b' },
    partes: [
      { f: 'caixa', l: 'L*0.4', p: 3, a: 'A*0.4', y: 'A*0.3', z: '-P/2+1.5', cor: '#2a2a2c', acab: 'metal' },
      ...tv('L', 0, '-P/2+3'),
    ],
  },
  {
    tipo: 'mesa_centro', nome: 'Mesa de centro', cat: 'Sala',
    dim: { l: 90, p: 50, a: 40 }, cores: { principal: '#c4a27a', secundaria: '#2b2b2b' }, rotulosCores: ['Tampo', 'Pés'],
    variantes: [
      { id: 'retangular', nome: 'Retangular', partes: [
        { f: 'caixa', l: 'L', p: 'P', a: 3, y: 'A-3', acab: 'madeira', r: 1 },
        { f: 'caixa', l: 'L-8', p: 'P-8', a: 2, y: 9, acab: 'madeira' },
        ...pes('A-3', 1.2, 4, { acab: 'metal' }),
        { f: 'caixa', n: 3, l: '22-i*2', p: '16-i', a: 2.5, y: 'A+i*2.5', x: '-L/4', ry: 'i*8', cor: TONS_LIVRO, acab: 'tecido' },
        { f: 'torno', pts: [[0, 0], [4, 0], [5, 5], [3, 12], [3.5, 14], [0, 14]], x: 'L/4', y: 'A', cor: '#e8e2d6', acab: 'ceramica' },
      ] },
      { id: 'redonda', nome: 'Redonda em dois níveis', partes: [
        { f: 'cil', l: 'L*0.62', p: 'P', a: 3, y: 'A-3', acab: 'madeira' },
        { f: 'cil', raio: 2.5, a: 'A-3', x: '-L*0.19', cor: 'secundaria', acab: 'metal' },
        { f: 'cil', l: 'L*0.5', p: 'P*0.8', a: 3, y: 'A*0.65', x: 'L*0.25', z: 'P*0.08', cor: '#e8e2d6', acab: 'marmore' },
        { f: 'cil', raio: 2, a: 'A*0.65', x: 'L*0.25', z: 'P*0.08', cor: 'secundaria', acab: 'metal' },
      ] },
      { id: 'bau', nome: 'Baú', acao: ['Abrir tampa', 'Fechar tampa'], partes: [
        { f: 'caixa', l: 'L', p: 'P', a: 'A-4', y: 0, acab: 'madeira', r: 1 },
        { f: 'caixa', l: 'L-4', p: 'P-4', a: 0.5, y: 'A-4', cor: '#3b342d' },
        { f: 'caixa', l: 'L', p: 'P', a: 4, y: 'A-4', acab: 'madeira', r: 1, mov: { gira: -100, eixo: 'x', py: 'A-4', pz: '-P/2' } },
      ] },
    ],
  },
  {
    tipo: 'tapete', nome: 'Tapete', cat: 'Sala', colide: false,
    dim: { l: 200, p: 140, a: 1 }, cores: { principal: '#d9d0c1', secundaria: '#9c8f7b' }, rotulosCores: ['Fundo', 'Detalhe'],
    variantes: [
      { id: 'borda', nome: 'Com borda', partes: [
        { f: 'caixa', l: 'L', p: 'P', a: 'A', acab: 'boucle' },
        { f: 'caixa', l: 'L-16', p: 'P-16', a: 'A+0.15', cor: 'secundaria', acab: 'boucle' },
        { f: 'caixa', l: 'L-22', p: 'P-22', a: 'A+0.3', acab: 'boucle' },
      ] },
      { id: 'listrado', nome: 'Listrado', partes: [
        { f: 'caixa', l: 'L', p: 'P', a: 'A', acab: 'linho' },
        { f: 'caixa', n: 'floor(P/20)', l: 'L', p: 5, a: 'A+0.15', z: '-P/2+10+i*20', cor: 'secundaria', acab: 'linho' },
      ] },
      { id: 'redondo', nome: 'Redondo', partes: [
        { f: 'cil', l: 'L', p: 'P', a: 'A', acab: 'boucle' },
        { f: 'cil', l: 'L-14', p: 'P-14', a: 'A+0.15', cor: 'secundaria', acab: 'boucle' },
      ] },
    ],
  },

  // ================================================================ DIVISÓRIAS
  {
    tipo: 'porta_correr', nome: 'Porta de correr 2 folhas', cat: 'Divisórias',
    dim: { l: 200, p: 8, a: 210 }, cores: { principal: '#3f444a', secundaria: '#d6ecf2' }, rotulosCores: ['Perfil', 'Vidro'],
    acao: ['Abrir', 'Fechar'],
    partes: [
      { f: 'caixa', l: 'L', p: 'P', a: 5, y: 'A-5', acab: 'metal' },
      { f: 'caixa', l: 'L', p: 'P', a: 1, acab: 'metal' },
      // folha de trás (esquerda, fixa)
      { f: 'caixa', l: 'L/2+2', p: 1, a: 'A-8', x: '-L/4+1', z: '-P/4', y: 2, cor: 'secundaria', acab: 'vidro' },
      { f: 'caixa', n: 2, l: 4, p: 3, a: 'A-8', x: 'i ? 3 : -L/2+2', z: '-P/4', y: 2, acab: 'metal' },
      { f: 'caixa', n: 2, l: 'L/2+2', p: 3, a: 4, x: '-L/4+1', z: '-P/4', y: 'i ? A-10 : 2', acab: 'metal' },
      // folha da frente (direita) desliza sobre a outra
      { f: 'caixa', l: 'L/2+2', p: 1, a: 'A-8', x: 'L/4-1', z: 'P/4', y: 2, cor: 'secundaria', acab: 'vidro', mov: { desliza: ['-(L/2-6)', 0, 0] } },
      { f: 'caixa', n: 2, l: 4, p: 3, a: 'A-8', x: 'i ? L/2-2 : -3', z: 'P/4', y: 2, acab: 'metal', mov: { desliza: ['-(L/2-6)', 0, 0] } },
      { f: 'caixa', n: 2, l: 'L/2+2', p: 3, a: 4, x: 'L/4-1', z: 'P/4', y: 'i ? A-10 : 2', acab: 'metal', mov: { desliza: ['-(L/2-6)', 0, 0] } },
    ],
  },
  {
    tipo: 'painel_fixo', nome: 'Painel fixo', cat: 'Divisórias',
    dim: { l: 50, p: 5, a: 210 }, cores: { principal: '#3f444a', secundaria: '#d6ecf2' }, rotulosCores: ['Perfil', 'Vidro'],
    partes: [
      { f: 'caixa', l: 'L-6', p: 1, a: 'A-6', y: 3, cor: 'secundaria', acab: 'vidro' },
      { f: 'caixa', n: 2, l: 3, p: 'P', a: 'A', x: '(i*2-1)*(L/2-1.5)', acab: 'metal' },
      { f: 'caixa', n: 2, l: 'L', p: 'P', a: 3, y: 'i ? A-3 : 0', acab: 'metal' },
    ],
  },

  // ================================================================ MESAS E CADEIRAS
  {
    tipo: 'mesa_jantar', nome: 'Mesa de jantar', cat: 'Mesas e cadeiras', grupo: 'mesa',
    dim: { l: 110, p: 75, a: 76 }, cores: { principal: '#c4a27a', secundaria: '#2b2b2b' }, rotulosCores: ['Tampo', 'Pés'],
    variantes: [
      { id: 'retangular', nome: 'Retangular', partes: [
        { f: 'caixa', l: 'L', p: 'P', a: 3.5, y: 'A-3.5', acab: 'madeira', r: 1 },
        { f: 'caixa', l: 'L-14', p: 'P-14', a: 7, y: 'A-10.5', acab: 'madeira' },
        ...CANTOS4.map(([sx, sz]) => ({ f: 'caixa', l: 5, p: 5, a: 'A-3.5', x: `${sx}*(L/2-6)`, z: `${sz}*(P/2-6)`, cor: 'secundaria', acab: 'metal' })),
        { f: 'torno', pts: [[0, 0], [8, 0], [14, 4], [17, 9], [0, 7]], y: 'A', cor: '#efe9df', acab: 'ceramica' },
        { f: 'esfera', n: 3, raio: 3.6, x: '(i-1)*5', z: '(i%2)*3-1', y: 'A+3', cor: ['#e0a63c', '#b5432f', '#9bb34a'], acab: 'laca' },
      ] },
      { id: 'extensivel', nome: 'Extensível', acao: ['Estender mesa', 'Recolher mesa'], partes: [
        { f: 'caixa', l: 'L/2', p: 'P', a: 3.5, y: 'A-3.5', x: '-L/4', acab: 'madeira', r: 1 },
        { f: 'caixa', l: 'L/2', p: 'P', a: 3.5, y: 'A-3.5', x: 'L/4', acab: 'madeira', r: 1, mov: { desliza: [40, 0, 0] } },
        { f: 'caixa', l: 39.5, p: 'P-1', a: 3.5, y: 'A-8', x: 20, acab: 'madeira', mov: { desliza: [0, 4.5, 0] } },
        { f: 'caixa', l: 'L/2-8', p: 'P-14', a: 7, y: 'A-10.5', x: '-L/4+1', acab: 'madeira' },
        { f: 'caixa', l: 'L/2-8', p: 'P-14', a: 7, y: 'A-10.5', x: 'L/4-1', acab: 'madeira', mov: { desliza: [40, 0, 0] } },
        ...[-1, 1].map((sz) => ({ f: 'caixa', l: 5, p: 5, a: 'A-3.5', x: '-L/2+6', z: `${sz}*(P/2-6)`, cor: 'secundaria', acab: 'metal' })),
        ...[-1, 1].map((sz) => ({ f: 'caixa', l: 5, p: 5, a: 'A-3.5', x: 'L/2-6', z: `${sz}*(P/2-6)`, cor: 'secundaria', acab: 'metal', mov: { desliza: [40, 0, 0] } })),
      ] },
      { id: 'pe_central', nome: 'Pé central', partes: [
        { f: 'caixa', l: 'L', p: 'P', a: 3.5, y: 'A-3.5', acab: 'madeira', r: 1.5 },
        { f: 'caixa', n: 2, l: 8, p: 'P*0.55', a: 'A-3.5', x: '(i*2-1)*L*0.28', cor: 'secundaria', acab: 'metal' },
        { f: 'caixa', n: 2, l: 10, p: 'P*0.7', a: 3, x: '(i*2-1)*L*0.28', cor: 'secundaria', acab: 'metal' },
      ] },
    ],
  },
  {
    tipo: 'mesa_redonda', nome: 'Mesa redonda / oval', cat: 'Mesas e cadeiras', grupo: 'mesa',
    dim: { l: 90, p: 90, a: 76 }, cores: { principal: '#efe9df', secundaria: '#2b2b2b' }, rotulosCores: ['Tampo', 'Base'],
    variantes: [
      { id: 'pe_central', nome: 'Pé central (tulipa)', partes: [
        { f: 'cil', l: 'L', p: 'P', a: 3, y: 'A-3', acab: 'marmore' },
        { f: 'torno', pts: [[0, 0], ['min(L,P)*0.28', 0], ['min(L,P)*0.26', 2], [5, 12], [4, 'A-10'], [9, 'A-3'], [0, 'A-3']], cor: 'secundaria', acab: 'laca' },
      ] },
      { id: 'quatro_pes', nome: 'Quatro pés', partes: [
        { f: 'cil', l: 'L', p: 'P', a: 3, y: 'A-3', acab: 'madeira' },
        ...[0, 1, 2, 3].map((k) => ({ f: 'cil', raio: 1.6, raio2: 2.4, a: 'A-3', x: `cos(${k}*PI/2+PI/4)*L*0.32`, z: `sin(${k}*PI/2+PI/4)*P*0.32`, cor: 'secundaria', acab: 'madeira' })),
      ] },
    ],
  },
  {
    tipo: 'cadeira', nome: 'Cadeira', cat: 'Mesas e cadeiras', grupo: 'cadeira', ignora: ['mesa'],
    dim: { l: 45, p: 50, a: 90 }, cores: { principal: '#c4a27a', secundaria: '#2b2b2b' }, rotulosCores: ['Assento', 'Estrutura'],
    acabamentos: ['madeira', 'linho', 'couro', 'palha'],
    uso: [{ nome: 'Afastar a cadeira', x0: '-L/2', x1: 'L/2', z0: '-P/2-40', z1: '-P/2' }],
    variantes: [
      { id: 'madeira', nome: 'Madeira', partes: [
        { f: 'caixa', l: 'L-2', p: 'P-6', a: 3.5, y: 43, z: 2, acab: '@', r: 1.2 },
        ...[-1, 1].map((sx) => ({ f: 'cil', raio: 1.6, a: 43, x: `${sx}*(L/2-4)`, z: 'P/2-4', cor: 'secundaria', acab: 'madeira' })),
        ...[-1, 1].map((sx) => ({ f: 'caixa', l: 3, p: 3, a: 'A', x: `${sx}*(L/2-4)`, z: '-P/2+4', rx: -4, cor: 'secundaria', acab: 'madeira' })),
        { f: 'caixa', n: 2, l: 'L-6', p: 2.5, a: 8, y: 'i ? A-12 : A-30', z: '-P/2+3', rx: -6, cor: 'secundaria', acab: 'madeira', r: 1 },
        { f: 'cil', n: 2, eixo: 'x', raio: 0.9, a: 'L-8', y: 18, z: '(i*2-1)*(P/2-5)', cor: 'secundaria', acab: 'madeira' },
      ] },
      { id: 'estofada', nome: 'Estofada', partes: [
        ...pes(42, 1.3, 4, { raio2: 1.6 }),
        { f: 'caixa', l: 'L', p: 'P-4', a: 8, y: 40, z: 2, acab: '@', r: 3 },
        { f: 'caixa', l: 'L', p: 7, a: 'A-46', y: 46, z: '-P/2+3.5', rx: -9, acab: '@', r: 3.4 },
      ] },
      { id: 'concha', nome: 'Concha (Eames)', partes: [
        { f: 'caixa', l: 'L', p: 'P-6', a: 3, y: 44, z: 2, cor: 'principal', acab: 'laca', r: 1.4 },
        { f: 'caixa', l: 'L-2', p: 3, a: 34, y: 'A-36', z: '-P/2+5', rx: -14, cor: 'principal', acab: 'laca', r: 1.4 },
        ...CANTOS4.map(([sx, sz]) => ({ f: 'cil', raio: 1.2, a: 45, y: -0.5, x: `${sx}*(L/2-9)`, z: `${sz}*(P/2-11)`, rz: `${-sx}*7`, rx: `${sz}*7`, cor: 'secundaria', acab: 'madeira' })),
        { f: 'cil', n: 2, eixo: 'x', raio: 0.4, a: 'L-12', y: 22, z: '(i*2-1)*(P/2-13)', cor: '#2b2b2b', acab: 'metal' },
        { f: 'cil', n: 2, eixo: 'z', raio: 0.4, a: 'P-16', y: 22, x: '(i*2-1)*(L/2-10)', cor: '#2b2b2b', acab: 'metal' },
      ] },
      { id: 'banqueta', nome: 'Banqueta alta', dim: { l: 40, p: 40, a: 75 }, uso: [], partes: [
        { f: 'cil', l: 'L', p: 'P', a: 4, y: 'A-4', acab: '@' },
        ...pes('A-4', 1.3, 6, { raio2: 1.6 }),
        { f: 'caixa', n: 2, l: 'L-12', p: 1.6, a: 1.6, y: 'A*0.35', z: '(i*2-1)*(P/2-6)', cor: 'secundaria', acab: 'madeira' },
      ] },
    ],
  },
  {
    tipo: 'mesa_computador', nome: 'Mesa de trabalho', cat: 'Mesas e cadeiras', grupo: 'mesa',
    dim: { l: 140, p: 70, a: 75 }, cores: { principal: '#efe9df', secundaria: '#2b2b2b' }, rotulosCores: ['Tampo', 'Estrutura'],
    luz: { x: 'L/2-22', y: 'A+38', z: '-P/2+20', intensidade: 70 },
    variantes: ['escrivaninha', 'gaveteiro', 'cavalete'].map((id) => {
      const objetos = [
        { f: 'caixa', l: 22, p: 16, a: 1, y: 'A', z: '-P/2+14', cor: '#1d1d1f', acab: 'metal' },
        { f: 'caixa', l: 4, p: 2, a: 16, y: 'A', z: '-P/2+11', cor: '#1d1d1f', acab: 'metal' },
        ...tv('min(62,L*0.45)', 'A+9', '-P/2+12'),
        { f: 'caixa', l: 42, p: 13, a: 1.5, y: 'A', z: 'P/2-24', cor: '#3a3a3c', r: 0.5 },
        { f: 'caixa', l: 6, p: 10, a: 2.5, y: 'A', x: 28, z: 'P/2-24', cor: '#3a3a3c', r: 1.2 },
        // luminária articulada
        { f: 'cil', raio: 7, a: 1.5, y: 'A', x: 'L/2-14', z: '-P/2+12', cor: '#2b2b2b', acab: 'metal' },
        { f: 'cil', raio: 0.7, a: 36, y: 'A+1', x: 'L/2-17', z: '-P/2+14', rz: 18, cor: '#2b2b2b', acab: 'metal' },
        { f: 'cil', raio: 3, raio2: 7, a: 9, y: 'A+33', x: 'L/2-22', z: '-P/2+20', rx: 25, cor: '#2b2b2b', acab: 'luz' },
        { f: 'cil', raio: 4, a: 9, y: 'A', x: '-L/2+14', z: '-P/2+14', cor: '#e8e2d6', acab: 'ceramica' },
        { f: 'cil', raio: 4.3, raio2: 4.3, a: 9.5, y: 'A', x: '-L/2+24', z: 'P/2-18', cor: '#c47a4f', acab: 'ceramica' },
      ];
      const tampo = { f: 'caixa', l: 'L', p: 'P', a: 3, y: 'A-3', acab: 'laca', r: 0.8 };
      if (id === 'escrivaninha') return { id, nome: 'Escrivaninha', partes: [
        tampo,
        { f: 'caixa', n: 2, l: 4, p: 'P-6', a: 'A-3', x: '(i*2-1)*(L/2-4)', cor: 'secundaria', acab: 'metal' },
        { f: 'caixa', l: 'L-12', p: 2, a: 22, y: 'A-25', z: '-P/2+6', cor: 'secundaria', acab: 'metal' }, ...objetos,
      ] };
      if (id === 'gaveteiro') return { id, nome: 'Com gaveteiro', acao: ['Abrir gaveta', 'Fechar gaveta'], partes: [
        tampo,
        { f: 'caixa', l: 4, p: 'P-6', a: 'A-3', x: '-L/2+4', cor: 'secundaria', acab: 'metal' },
        { f: 'caixa', l: 40, p: 'P-6', a: 'A-3', x: 'L/2-20', z: -3, cor: 'principal', acab: 'laca' },
        { f: 'caixa', n: 2, l: 38, p: 1.8, a: '(A-8)/3-1', y: '2+(i+1)*(A-8)/3', x: 'L/2-20', z: 'P/2-2', cor: 'principal', acab: 'laca' },
        ...gaveta('L/2-20', 2, 38, '(A-8)/3-1', 'P', { cor: 'principal', acab: 'laca' }),
        ...objetos,
      ] };
      return { id, nome: 'Cavaletes', partes: [
        { ...tampo, acab: 'madeira' },
        ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ f: 'caixa', l: 3.5, p: 3.5, a: 'A-1', y: -1, x: `${sx}*(L/2-14)`, z: `${sz}*(P/2-14)`, rz: `${sx}*0`, rx: `${-sz}*9`, cor: 'secundaria', acab: 'madeira' }))),
        { f: 'caixa', n: 2, l: 3, p: 'P-24', a: 3, y: 'A*0.5', x: '(i*2-1)*(L/2-14)', cor: 'secundaria', acab: 'madeira' },
        ...objetos,
      ] };
    }),
  },
  {
    tipo: 'cadeira_escritorio', nome: 'Cadeira de escritório', cat: 'Mesas e cadeiras', grupo: 'cadeira', ignora: ['mesa'],
    dim: { l: 60, p: 60, a: 100 }, cores: { principal: '#2f3237', secundaria: '#1b1b1b' }, rotulosCores: ['Estofado', 'Estrutura'],
    acabamentos: ['tecido', 'couro', 'boucle'],
    uso: [{ nome: 'Afastar a cadeira', x0: '-L/2', x1: 'L/2', z0: '-P/2-40', z1: '-P/2' }],
    partes: [
      { f: 'caixa', n: 5, l: 'min(L,P)*0.44', p: 4, a: 3, y: 6, x: 'cos(i*1.2566)*min(L,P)*0.22', z: 'sin(i*1.2566)*min(L,P)*0.22', ry: '-i*72', cor: 'secundaria', acab: 'metal', r: 1 },
      { f: 'esfera', n: 5, raio: 2.8, x: 'cos(i*1.2566)*min(L,P)*0.43', z: 'sin(i*1.2566)*min(L,P)*0.43', cor: '#111', acab: 'metal' },
      { f: 'cil', raio: 2.6, a: 34, y: 8, cor: '#9a9a9a', acab: 'metal' },
      { f: 'caixa', l: 'L*0.82', p: 'P*0.8', a: 9, y: 42, z: 'P*0.04', acab: '@', r: 4 },
      { f: 'caixa', l: 'L*0.74', p: 7, a: 'A-60', y: 56, z: '-P*0.36', rx: -8, acab: '@', r: 3.4 },
      { f: 'caixa', l: 6, p: 3, a: 14, y: 46, z: '-P*0.33', cor: 'secundaria', acab: 'metal' },
      ...[-1, 1].flatMap((sx) => [
        { f: 'caixa', l: 3, p: 3, a: 16, y: 50, x: `${sx}*L*0.4`, cor: 'secundaria', acab: 'metal' },
        { f: 'caixa', l: 6, p: 'P*0.42', a: 3, y: 65, x: `${sx}*L*0.4`, cor: 'secundaria', acab: 'metal', r: 1.2 },
      ]),
    ],
  },

  // ================================================================ COZINHA
  {
    tipo: 'bancada_cozinha', nome: 'Bancada com cuba e cooktop', cat: 'Cozinha',
    dim: { l: 224, p: 60, a: 90 }, cores: { principal: '#f2f0ec', secundaria: '#2f3033' }, rotulosCores: ['Armários', 'Tampo'],
    acao: ['Abrir armários', 'Fechar armários'],
    uso: [frente(70, 'Trabalhar na bancada')],
    partes: [
      { f: 'caixa', l: 'L', p: 'P-8', a: 10, z: -4, cor: '#2b2b2b' },
      { f: 'caixa', l: 'L', p: 2, a: 'A-14', y: 10, z: '-P/2+1', cor: '#e6e3dd' },
      { f: 'caixa', l: 'L', p: 'P-4', a: 2, y: 10, z: -2, cor: '#e6e3dd' },
      { f: 'caixa', n: 2, l: 2, p: 'P-4', a: 'A-14', y: 10, x: '(i*2-1)*(L/2-1)', z: -2, cor: 'principal', acab: 'laca' },
      { f: 'caixa', l: 'L-4', p: 'P-10', a: 1.8, y: '10+(A-16)/2', z: -3, cor: '#e6e3dd' },
      { f: 'cil', n: 'floor(L/45)', raio: 9, raio2: 9, a: 12, y: 12, x: '-L/2+25+i*42', z: -4, cor: ['#b5432f', '#d9d4cc', '#3d5c6e'], acab: 'ceramica' },
      { f: 'cil', n: 'floor(L/30)', raio: 4, a: 15, y: '12+(A-16)/2', x: '-L/2+15+i*28', z: -6, cor: ['#f3efe6', '#d8c079', '#a8c5b5'], acab: 'vidro' },
      // portas (giram) e puxadores
      ...[0, 1, 2, 3].flatMap((k) => {
        const mov = { gira: -105, eixo: 'y', px: `-L/2+${k}*L/4+0.6`, pz: 'P/2-1' };
        return [
          { f: 'caixa', l: 'L/4-1.2', p: 1.8, a: 'A-17', y: 11, x: `-L/2+L/8+${k}*L/4`, z: 'P/2-1', cor: 'principal', acab: 'laca', mov },
          { f: 'caixa', l: 'L/4-8', p: 2, a: 1.2, y: 'A-10', x: `-L/2+L/8+${k}*L/4`, z: 'P/2+0.6', cor: '#9a9a9a', acab: 'metal', mov },
        ];
      }),
      { f: 'caixa', l: 'L', p: 'P', a: 3.5, y: 'A-3.5', cor: 'secundaria', acab: 'pedra' },
      { f: 'caixa', l: 'L', p: 1, a: 55, y: 'A', z: '-P/2+0.5', cor: '#ece8e1', acab: 'azulejo' },
      // cuba e torneira
      { f: 'caixa', l: 52, p: 42, a: 0.6, y: 'A', x: '-L/2+45', z: -2, cor: '#b9bdc2', acab: 'metal' },
      { f: 'caixa', l: 46, p: 36, a: 0.8, y: 'A', x: '-L/2+45', z: -2, cor: '#7d8186', acab: 'metal' },
      { f: 'cil', raio: 1.4, a: 30, y: 'A', x: '-L/2+45', z: '-P/2+6', cor: '#d0d3d7', acab: 'metal' },
      { f: 'cil', raio: 1.1, a: 16, eixo: 'z', y: 'A+29', x: '-L/2+45', z: '-P/2+13', cor: '#d0d3d7', acab: 'metal' },
      { f: 'caixa', l: 30, p: 20, a: 1.5, y: 'A', x: '-L/2+86', z: 4, rz: 0, ry: -8, cor: '#b78b5c', acab: 'madeira', r: 0.6 },
      // cooktop 58 × 50
      { f: 'caixa', l: 58, p: 50, a: 0.8, y: 'A', x: 'L/2-48', cor: '#0e0e10', acab: 'vidro' },
      { f: 'caixa', l: 58, p: 50, a: 0.6, y: 'A', x: 'L/2-48', cor: '#111214', acab: 'tela' },
      ...[[-14, -11, 6], [14, -11, 6], [-14, 11, 4.5], [14, 11, 4.5]].map(([dx, dz, r]) => (
        { f: 'cil', raio: r, a: 1.2, y: 'A+0.2', x: `L/2-48+${dx}`, z: dz, cor: '#3a3a3c', acab: 'metal' })),
      { f: 'cil', raio: 10, raio2: 9, a: 9, y: 'A+1.4', x: 'L/2-62', z: -11, cor: '#c9ccd0', acab: 'metal' },
      // cafeteira
      { f: 'caixa', l: 18, p: 22, a: 30, y: 'A', x: 'L/2-110', z: '-P/2+16', cor: '#1d1d1f', acab: 'laca', r: 2 },
      { f: 'cil', raio: 6, a: 12, y: 'A+2', x: 'L/2-110', z: '-P/2+26', cor: '#cfe6ee', acab: 'vidro' },
    ],
  },
  {
    tipo: 'armario_aereo', nome: 'Armário aéreo', cat: 'Cozinha', elev: 150,
    dim: { l: 120, p: 35, a: 70 }, cores: { principal: '#f2f0ec', secundaria: '#e6e3dd' }, rotulosCores: ['Portas', 'Interior'],
    acao: ['Abrir portas', 'Fechar portas'],
    partes: [
      { f: 'caixa', l: 'L', p: 2, a: 'A', z: '-P/2+1', cor: 'secundaria' },
      { f: 'caixa', n: 2, l: 'L', p: 'P-2', a: 2, y: 'i ? A-2 : 0', z: -1, cor: 'principal', acab: 'laca' },
      { f: 'caixa', n: 2, l: 2, p: 'P-2', a: 'A', x: '(i*2-1)*(L/2-1)', z: -1, cor: 'principal', acab: 'laca' },
      { f: 'caixa', l: 'L-4', p: 'P-6', a: 1.6, y: 'A/2', z: -2, cor: 'secundaria' },
      { f: 'cil', n: 'floor(L/14)', raio: 3.6, raio2: 4.2, a: 9, y: 2, x: '-L/2+8+i*13', z: -3, cor: ['#ffffff', '#e8e2d6', '#3d5c6e'], acab: 'ceramica' },
      { f: 'caixa', n: 'floor(L/30)', l: 24, p: 'P-12', a: 6, y: 'A/2+1.6', x: '-L/2+15+i*27', z: -3, cor: '#f7f7f5', acab: 'ceramica', r: 2 },
      { f: 'caixa', n: 2, l: 'L/2-1.5', p: 1.8, a: 'A-1', y: 0.5, x: '(i*2-1)*L/4', z: 'P/2-0.9', cor: 'principal', acab: 'laca',
        mov: { gira: -80, eixo: 'x', py: 'A', pz: 'P/2' } },
      { f: 'caixa', n: 2, l: 'L/2-12', p: 1.6, a: 1.2, y: 1.5, x: '(i*2-1)*L/4', z: 'P/2+0.8', cor: '#9a9a9a', acab: 'metal',
        mov: { gira: -80, eixo: 'x', py: 'A', pz: 'P/2' } },
    ],
  },
  {
    tipo: 'geladeira', nome: 'Geladeira', cat: 'Cozinha',
    dim: { l: 70, p: 70, a: 185 }, cores: { principal: '#d6d9dc', secundaria: '#8a8e93' }, rotulosCores: ['Portas', 'Puxadores'],
    acao: ['Abrir portas', 'Fechar portas'],
    uso: [{ nome: 'Abrir a porta', x0: '-L/2', x1: 'L/2', z0: 'P/2', z1: 'P/2+L' }],
    variantes: [['duplex', 'Duplex (freezer em cima)', 'A*0.68'], ['inverse', 'Inverse (freezer embaixo)', 'A*0.3']].map(([id, nome, corte]) => ({
      id, nome, partes: [
        { f: 'caixa', l: 'L', p: 2, a: 'A', z: '-P/2+5', cor: 'principal', acab: 'metal' },
        { f: 'caixa', n: 2, l: 2, p: 'P-6', a: 'A', x: '(i*2-1)*(L/2-1)', z: -2, cor: 'principal', acab: 'metal' },
        { f: 'caixa', n: 2, l: 'L', p: 'P-6', a: 2, y: 'i ? A-2 : 0', z: -2, cor: 'principal', acab: 'metal' },
        { f: 'caixa', l: 'L-4', p: 'P-10', a: 2.5, y: corte, z: -3, cor: '#f3f4f5' },
        { f: 'caixa', l: 'L-4', p: 1, a: 'A-4', y: 2, z: '-P/2+6.5', cor: '#f3f4f5' },
        { f: 'caixa', n: 3, l: 'L-6', p: 'P-12', a: 0.6, y: `${id === 'duplex' ? 'A*0.08' : 'A*0.36'}+i*A*0.11`, z: -4, cor: '#dfeef3', acab: 'vidro' },
        { f: 'cil', n: 4, raio: 3.4, a: 24, y: `${id === 'duplex' ? 'A*0.08' : 'A*0.36'}+0.6`, x: '-L/2+10+i*8', z: -6, cor: ['#3f7a4a', '#e7d9b0', '#b5432f', '#f2f2f2'], acab: 'vidro' },
        { f: 'caixa', n: 2, l: 18, p: 14, a: 10, y: `${id === 'duplex' ? 'A*0.19' : 'A*0.47'}+0.6`, x: '(i*2-1)*12', z: -6, cor: ['#e0a63c', '#9bb34a'], acab: 'laca', r: 2 },
        // portas (giram na dobradiça da direita)
        ...[[`${corte}+1`, `A-${corte}-2`], [1, `${corte}-2`]].flatMap(([y, a]) => {
          const mov = { gira: 105, eixo: 'y', px: 'L/2', pz: 'P/2-2' };
          return [
            { f: 'caixa', l: 'L', p: 4, a, y, z: 'P/2-2', cor: 'principal', acab: 'metal', r: 1, mov },
            { f: 'caixa', l: 2, p: 3, a: `min(40,${a}*0.5)`, y: `${y}+${a}*0.25`, x: '-L/2+5', z: 'P/2+1.5', cor: 'secundaria', acab: 'metal', mov },
          ];
        }),
      ],
    })),
  },

  // ================================================================ BANHEIRO
  {
    tipo: 'box_banho', nome: 'Box', cat: 'Banheiro', colide: false,
    dim: { l: 110, p: 84, a: 200 }, cores: { principal: '#e8e6e1', secundaria: '#aeb3b8' }, rotulosCores: ['Piso', 'Perfis'],
    acao: ['Abrir box', 'Fechar box'],
    uso: [{ nome: 'Entrar no box', x0: 'L*0.06', x1: 'L/2', z0: 'P/2', z1: 'P/2+50' }],
    partes: [
      { f: 'caixa', l: 'L', p: 'P', a: 2.5, cor: 'principal', acab: 'pedra' },
      { f: 'cil', raio: 4, a: 0.3, y: 2.5, z: 0, cor: '#9a9a9a', acab: 'metal' },
      { f: 'caixa', n: 2, l: 'L', p: 4, a: 2, y: 'i ? A-2 : 2.5', z: 'P/2-2', cor: 'secundaria', acab: 'metal' },
      { f: 'caixa', l: 'L/2+3', p: 0.8, a: 'A-7', y: 4.5, x: '-L/4+1.5', z: 'P/2-3', cor: '#cfe6ee', acab: 'vidro' },
      { f: 'caixa', l: 'L/2+3', p: 0.8, a: 'A-7', y: 4.5, x: 'L/4-1.5', z: 'P/2-1', cor: '#cfe6ee', acab: 'vidro', mov: { desliza: ['-(L/2-8)', 0, 0] } },
      { f: 'caixa', l: 2, p: 2, a: 30, y: 'A*0.45', x: 'L/2-6', z: 'P/2+0.5', cor: 'secundaria', acab: 'metal', mov: { desliza: ['-(L/2-8)', 0, 0] } },
      { f: 'cil', raio: 1, a: 20, eixo: 'z', y: 'A+8', z: '-P/2+10', cor: 'secundaria', acab: 'metal' },
      { f: 'cil', raio: 11, a: 1.5, y: 'A+6', z: '-P/2+22', cor: 'secundaria', acab: 'metal' },
      { f: 'cil', raio: 4, a: 3, eixo: 'z', y: 110, z: '-P/2+1.5', cor: 'secundaria', acab: 'metal' },
      { f: 'caixa', l: 30, p: 10, a: 2, y: 120, x: 'L/2-22', z: '-P/2+5', cor: '#f7f7f5', acab: 'ceramica' },
    ],
  },
  {
    tipo: 'vaso', nome: 'Vaso sanitário', cat: 'Banheiro',
    dim: { l: 38, p: 60, a: 75 }, cores: { principal: '#f7f7f5', secundaria: '#dcdcd8' },
    uso: [frente(50, 'Uso')],
    partes: [
      { f: 'caixa', l: 'L*0.55', p: 'P*0.5', a: 32, z: 'P*0.1', acab: 'ceramica', r: 8 },
      { f: 'caixa', l: 'L', p: 'P*0.72', a: 10, y: 30, z: 'P*0.12', acab: 'ceramica', r: 4.9 },
      { f: 'caixa', l: 'L', p: 'P*0.72', a: 2, y: 40, z: 'P*0.12', cor: '#fbfbfa', acab: 'laca', r: 0.9 },
      { f: 'caixa', l: 'L', p: 'P*0.26', a: 'A-40', y: 40, z: '-P/2+P*0.13', acab: 'ceramica', r: 3 },
      { f: 'cil', raio: 2.2, a: 0.6, y: 'A', z: '-P/2+P*0.13', cor: '#c9ccd0', acab: 'metal' },
    ],
  },
  {
    tipo: 'lavatorio', nome: 'Lavatório com gabinete', cat: 'Banheiro',
    dim: { l: 65, p: 42, a: 85 }, cores: { principal: '#c4a27a', secundaria: '#f7f7f5' }, rotulosCores: ['Gabinete', 'Cuba'],
    acao: ['Abrir portas', 'Fechar portas'],
    uso: [frente(55, 'Uso')],
    partes: [
      { f: 'caixa', l: 'L', p: 'P', a: 'A-18', y: 15, acab: 'madeira', r: 0.6 },
      { f: 'caixa', n: 2, l: 'L/2-1.5', p: 1.8, a: 'A-22', y: 17, x: '(i*2-1)*L/4', z: 'P/2+0.9', acab: 'madeira',
        mov: { gira: '(i*2-1)*100', eixo: 'y', px: '(i*2-1)*(L/2-0.8)', pz: 'P/2+0.9' } },
      { f: 'caixa', l: 'L', p: 'P', a: 3, y: 'A-3', cor: '#e8e4dc', acab: 'marmore' },
      { f: 'torno', pts: [[0, 0], [9, 0], [16, 4], [19, 12], [18.4, 12.5], [15, 5], [0, 2]], y: 'A', cor: 'secundaria', acab: 'ceramica' },
      { f: 'cil', raio: 1.3, a: 26, y: 'A', z: '-P/2+5', cor: '#d0d3d7', acab: 'metal' },
      { f: 'cil', raio: 1, a: 12, eixo: 'z', y: 'A+25', z: '-P/2+10', cor: '#d0d3d7', acab: 'metal' },
    ],
  },
  {
    tipo: 'espelho', nome: 'Espelho', cat: 'Banheiro', colide: false, elev: 100,
    dim: { l: 55, p: 3, a: 75 }, cores: { principal: '#dfe7ea', secundaria: '#b19a72' }, rotulosCores: ['Espelho', 'Moldura'],
    variantes: [
      { id: 'redondo', nome: 'Redondo', partes: [
        { f: 'cil', l: 'L', p: 'A', a: 'P', eixo: 'z', y: 'A/2', z: 0, cor: 'secundaria', acab: 'metal' },
        { f: 'cil', l: 'L-3', p: 'A-3', a: 0.6, eixo: 'z', y: 'A/2', z: 'P/2', cor: 'principal', acab: 'espelho' },
      ] },
      { id: 'retangular', nome: 'Retangular', partes: [
        { f: 'caixa', l: 'L', p: 'P', a: 'A', cor: 'secundaria', acab: 'madeira', r: 1 },
        { f: 'caixa', l: 'L-4', p: 0.6, a: 'A-4', y: 2, z: 'P/2', cor: 'principal', acab: 'espelho' },
      ] },
    ],
  },

  // ================================================================ DECORAÇÃO E LUZ
  {
    tipo: 'luminaria', nome: 'Luminária', cat: 'Decoração e luz',
    dim: { l: 40, p: 40, a: 160 }, cores: { principal: '#f1e6cf', secundaria: '#2b2b2b' }, rotulosCores: ['Cúpula', 'Estrutura'],
    variantes: [
      { id: 'piso', nome: 'De piso', luz: { x: 0, y: 'A-15', z: 0, intensidade: 110 }, partes: [
        { f: 'cil', raio: 'min(L,P)*0.38', a: 2, cor: 'secundaria', acab: 'metal' },
        { f: 'cil', raio: 1, a: 'A-30', y: 2, cor: 'secundaria', acab: 'metal' },
        { f: 'cil', raio: 'min(L,P)*0.5', raio2: 'min(L,P)*0.36', a: 30, y: 'A-30', acab: 'luz' },
      ] },
      { id: 'arco', nome: 'Arco', dim: { l: 150, p: 40, a: 200 }, luz: { x: 'L/2-18', y: 'A-40', z: 0, intensidade: 120 }, partes: [
        { f: 'caixa', l: 30, p: 30, a: 8, x: '-L/2+15', cor: '#e8e4dc', acab: 'marmore', r: 1 },
        { f: 'cil', n: 14, raio: 0.9, a: '(L-30)*0.14+6', x: '-L/2+15+(1-cos((i+0.5)/14*PI/2*1.25))*(L-33)/(1-cos(PI/2*1.25))', y: '8+sin((i+0.5)/14*PI/2*1.25)*(A-55)/sin(PI/2*1.25)-((L-30)*0.07+3)',
          rz: '-(i+0.5)/14*90*1.25', cor: 'secundaria', acab: 'metal' },
        { f: 'torno', pts: [[0.1, 25], [6, 24.5], [14, 20], [19, 12], [20, 0], [19.5, 0], [0.1, 18]], x: 'L/2-18', y: 'A-48', cor: 'secundaria', acab: 'metal' },
        { f: 'esfera', raio: 6, x: 'L/2-18', y: 'A-48', cor: '#fff3d6', acab: 'luz' },
      ] },
      { id: 'abajur', nome: 'Abajur', dim: { l: 30, p: 30, a: 45 }, luz: { x: 0, y: 'A-12', z: 0, intensidade: 55 }, partes: [
        { f: 'torno', pts: [[0, 0], [7, 0], [9, 6], [8, 16], [3, 'A*0.55'], [1, 'A*0.58'], [0, 'A*0.58']], cor: 'secundaria', acab: 'ceramica' },
        { f: 'cil', raio: 'min(L,P)*0.5', raio2: 'min(L,P)*0.36', a: 'A*0.45', y: 'A*0.55', acab: 'luz' },
      ] },
      { id: 'pendente', nome: 'Pendente (teto)', dim: { l: 40, p: 40, a: 90 }, elev: 170, luz: { x: 0, y: 4, z: 0, intensidade: 140 }, partes: [
        { f: 'cil', raio: 6, a: 2, y: 'A-2', cor: 'secundaria', acab: 'metal' },
        { f: 'cil', raio: 0.3, a: 'A-20', y: 18, cor: '#111', acab: 'metal' },
        { f: 'torno', pts: [[0.1, 20], [3, 19.5], [10, 15], ['min(L,P)*0.48', 3], ['min(L,P)*0.5', 0], ['min(L,P)*0.49', 0], [0.1, 18]], cor: 'principal', acab: 'laca' },
        { f: 'esfera', raio: 5, y: 2, cor: '#fff3d6', acab: 'luz' },
      ] },
    ],
  },
  {
    tipo: 'planta', nome: 'Planta em vaso', cat: 'Decoração e luz',
    dim: { l: 45, p: 45, a: 120 }, cores: { principal: '#4f7a4a', secundaria: '#d9d2c5' }, rotulosCores: ['Folhas', 'Vaso'],
    variantes: [
      { id: 'costela', nome: 'Costela-de-adão', partes: [
        { f: 'torno', pts: [[0, 0], ['min(L,P)*0.3', 0], ['min(L,P)*0.36', 'A*0.28'], ['min(L,P)*0.34', 'A*0.28'], [0.1, 'A*0.26']], cor: 'secundaria', acab: 'ceramica' },
        { f: 'cil', n: 9, raio: 0.6, a: 'A*0.45', y: 'A*0.25', x: 'cos(i*2.4)*min(L,P)*0.1', z: 'sin(i*2.4)*min(L,P)*0.1', rz: 'cos(i*2.4)*16', rx: '-sin(i*2.4)*16', cor: '#5d7a3a', acab: 'planta' },
        folhas(11, 'A*0.42', 'A*0.5', 'min(L,P)*0.3'),
      ] },
      { id: 'ficus', nome: 'Fícus', partes: [
        { f: 'torno', pts: [[0, 0], ['min(L,P)*0.26', 0], ['min(L,P)*0.3', 'A*0.25'], [0.1, 'A*0.24']], cor: 'secundaria', acab: 'palha' },
        { f: 'cil', raio: 1.6, raio2: 1, a: 'A*0.55', y: 'A*0.22', cor: '#6e5236', acab: 'madeira' },
        { f: 'esfera', n: 6, raio: 'min(L,P)*0.3', ey: 0.85, x: 'cos(i*2.1)*min(L,P)*0.18', z: 'sin(i*2.1)*min(L,P)*0.18', y: 'A*0.48+(i%3)*A*0.1', acab: 'planta' },
      ] },
      { id: 'pequena', nome: 'Pequena (mesa)', dim: { l: 20, p: 20, a: 30 }, partes: [
        { f: 'cil', l: 'L*0.7', p: 'P*0.7', a: 'A*0.4', k: 1.15, cor: 'secundaria', acab: 'ceramica' },
        folhas(9, 'A*0.4', 'A*0.4', 'min(L,P)*0.35'),
      ] },
    ],
  },
  {
    tipo: 'quadro', nome: 'Quadro', cat: 'Decoração e luz', colide: false, elev: 120,
    dim: { l: 60, p: 3, a: 80 }, cores: { principal: '#c47a4f', secundaria: '#2b2b2b' }, rotulosCores: ['Arte', 'Moldura'],
    variantes: [
      { id: 'moldura', nome: 'Com moldura', partes: [
        { f: 'caixa', l: 'L', p: 'P', a: 'A', cor: 'secundaria', acab: 'madeira' },
        { f: 'caixa', l: 'L-4', p: 0.4, a: 'A-4', y: 2, z: 'P/2', cor: '#f6f3ec' },
        { f: 'caixa', l: 'L*0.55', p: 0.5, a: 'A*0.55', y: 'A*0.22', z: 'P/2+0.1', cor: '#e9dfcc' },
        { f: 'cil', raio: 'min(L,A)*0.16', a: 0.6, eixo: 'z', y: 'A*0.52', x: '-L*0.06', z: 'P/2+0.2', cor: 'principal' },
        { f: 'caixa', l: 'L*0.3', p: 0.7, a: 'A*0.12', y: 'A*0.28', x: 'L*0.08', z: 'P/2+0.25', cor: '#2f4a6b' },
      ] },
      { id: 'tela', nome: 'Tela abstrata', partes: [
        { f: 'caixa', l: 'L', p: 'P', a: 'A', cor: '#efe9df' },
        { f: 'caixa', l: 'L', p: 0.4, a: 'A*0.45', y: 0, z: 'P/2', cor: 'principal' },
        { f: 'caixa', l: 'L*0.5', p: 0.5, a: 'A*0.3', y: 'A*0.45', x: 'L*0.25', z: 'P/2', cor: '#d9c39c' },
        { f: 'cil', raio: 'min(L,A)*0.12', a: 0.6, eixo: 'z', y: 'A*0.72', x: '-L*0.2', z: 'P/2+0.1', cor: '#2b2b2b' },
      ] },
      { id: 'trio', nome: 'Trio', dim: { l: 120, p: 3, a: 45 }, partes: [
        { f: 'caixa', n: 3, l: 'L/3-6', p: 'P', a: 'A', x: '(i-1)*L/3', cor: 'secundaria', acab: 'madeira' },
        { f: 'caixa', n: 3, l: 'L/3-10', p: 0.4, a: 'A-4', y: 2, x: '(i-1)*L/3', z: 'P/2', cor: '#f6f3ec' },
        { f: 'cil', n: 3, raio: 'min(L/3,A)*0.22', a: 0.6, eixo: 'z', y: 'A/2', x: '(i-1)*L/3', z: 'P/2+0.2', cor: ['principal', '#7f8f86', '#d9c39c'] },
      ] },
    ],
  },
  {
    tipo: 'prateleira', nome: 'Prateleira com livros', cat: 'Decoração e luz', elev: 150,
    dim: { l: 80, p: 22, a: 26 }, cores: { principal: '#c4a27a', secundaria: '#2b2b2b' }, rotulosCores: ['Madeira', 'Suportes'],
    partes: [
      { f: 'caixa', l: 'L', p: 'P', a: 2.5, acab: 'madeira', r: 0.5 },
      { f: 'caixa', n: 2, l: 2, p: 'P*0.8', a: 0.8, y: -0.8, x: '(i*2-1)*L*0.35', z: '-P*0.1', cor: 'secundaria', acab: 'metal' },
      { f: 'caixa', n: 'floor(L*0.4/3.4)', l: 3, p: 'P*0.75', a: '17+(i%4)*2', y: 2.5, x: '-L/2+4+i*3.4', z: -1, cor: TONS_LIVRO, acab: 'tecido' },
      { f: 'torno', pts: [[0, 0], [4, 0], [5, 4], [3, 10], [3.4, 12], [0, 12]], x: 'L*0.18', y: 2.5, cor: '#d9cbb5', acab: 'ceramica' },
      { f: 'caixa', l: 13, p: 1.5, a: 18, y: 2.5, x: 'L*0.36', z: -2, rx: -10, cor: '#2b2b2b', acab: 'madeira' },
      { f: 'caixa', l: 10, p: 0.3, a: 14, y: 4.5, x: 'L*0.36', z: -1.1, rx: -10, cor: '#9fb3c0' },
    ],
  },
  {
    tipo: 'aparador', nome: 'Aparador', cat: 'Decoração e luz',
    dim: { l: 120, p: 35, a: 80 }, cores: { principal: '#a9774e', secundaria: '#2b2b2b' }, rotulosCores: ['Madeira', 'Pés'],
    acao: ['Abrir portas', 'Fechar portas'], uso: [frente(40, 'Abrir as portas')],
    partes: [
      ...pes(14, 1.3, 5, { raio2: 2 }),
      { f: 'caixa', l: 'L', p: 'P', a: 'A-14', y: 14, acab: 'madeira', r: 0.6 },
      { f: 'caixa', n: 2, l: 'L/2-2', p: 1.8, a: 'A-20', y: 17, x: '(i*2-1)*L/4', z: 'P/2+0.9', cor: '#e8dcc6', acab: 'palha',
        mov: { gira: '(i*2-1)*100', eixo: 'y', px: '(i*2-1)*(L/2-0.8)', pz: 'P/2+0.9' } },
      { f: 'torno', pts: [[0, 0], [5, 0], [8, 8], [6, 22], [3, 30], [3.5, 32], [0, 32]], x: '-L*0.3', y: 'A', cor: '#3f5a4c', acab: 'ceramica' },
      { f: 'caixa', n: 3, l: '26-i*3', p: 18, a: 3, y: 'A+i*3', x: 'L*0.22', cor: TONS_LIVRO, acab: 'tecido' },
    ],
  },

  // ================================================================ GENÉRICOS
  {
    tipo: 'caixa', nome: 'Caixa genérica', cat: 'Genéricos',
    dim: { l: 60, p: 60, a: 60 }, cores: { principal: '#c8ccd2', secundaria: '#9aa0a8' },
    partes: [{ f: 'caixa', l: 'L', p: 'P', a: 'A' }],
  },
  {
    tipo: 'cilindro', nome: 'Cilindro genérico', cat: 'Genéricos',
    dim: { l: 50, p: 50, a: 50 }, cores: { principal: '#c8ccd2', secundaria: '#9aa0a8' },
    partes: [{ f: 'cil', l: 'L', p: 'P', a: 'A' }],
  },
];
