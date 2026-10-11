// =====================================================================
// PLANTA E CENÁRIOS ORIGINAIS — só dados, sem lógica
// =====================================================================
// Unidade: centímetro. Vista de cima: x cresce para a direita, z cresce
// para baixo. O interior do apartamento vai de x=0 a 420 e de z=0 a 700.
//
// PAREDES: linha de centro de (x1,z1) até (x2,z2), sempre na horizontal
// ou na vertical, do menor para o maior valor. 'esp' = espessura.
// 'derrubavel' = pode ser ocultada no painel "Demolição".
//
// ABERTURAS: 'parede' = id da parede; 'pos' = distância do início da
// parede (x1,z1) até a borda da abertura. Janela: 'peitoril' = altura do
// piso até a base. Porta: 'dobradica' ('inicio' | 'fim') e 'lado'
// (1 | -1, para que lado a folha abre).
//
// AMBIENTES: polígono pela linha de centro das paredes. A área útil é
// calculada descontando meia espessura de cada parede na borda.
//
// Paredes medidas nos primeiros prints (1,43 px/cm sobre o interior de
// 420 × 700) e conferidas na planta final (2,55 px/cm).
// 'revisao' muda quando a planta original muda: um layout salvo com revisão
// antiga é guardado como cópia e o simulador abre a planta nova.
// =====================================================================

const PLANTA_ORIGINAL = {
  revisao: 6,
  alturaParede: 260,

  // Local e orientação — usados para calcular o sol por data e hora.
  // 'orientacao' = para onde olham as janelas da parede esquerda, em graus
  // a partir do norte (0 = N, 90 = L, 180 = S, 270 = O). O apartamento pega
  // o sol da manhã, então as janelas estão voltadas para o leste.
  local: { nome: 'Barra Funda, São Paulo', lat: -23.525, lon: -46.666, fuso: -3 },
  orientacao: 90,
  areaConstrutora: 32, // m², informado pela construtora

  paredes: [
    { id: 'ext-topo',  nome: 'Externa — fundo da sala',            x1: -6,  z1: -6,  x2: 426, z2: -6,  esp: 12 },
    { id: 'ext-dir',   nome: 'Externa — direita (cozinha/entrada)', x1: 426, z1: -6,  x2: 426, z2: 706, esp: 12 },
    { id: 'ext-baixo', nome: 'Externa — quarto e banheiro',        x1: -6,  z1: 706, x2: 426, z2: 706, esp: 12 },
    { id: 'ext-esq',   nome: 'Externa — esquerda (janelas)',       x1: -6,  z1: -6,  x2: -6,  z2: 706, esp: 12 },
    { id: 'sala-quarto',  nome: 'Sala / quarto',     x1: -6,  z1: 455, x2: 305, z2: 455, esp: 10, derrubavel: true },
    { id: 'sala-banho',   nome: 'Sala / banheiro',   x1: 305, z1: 455, x2: 426, z2: 455, esp: 10 },
    { id: 'quarto-banho', nome: 'Quarto / banheiro', x1: 305, z1: 455, x2: 305, z2: 706, esp: 10 },
    // shaft (área hachurada no canto da cozinha): bloco de 32 × 47
    { id: 'shaft', nome: 'Shaft', x1: 404, z1: 4, x2: 404, z2: 30, esp: 32 },
    // shaft do banheiro (canto do box): bloco de 32 × 84
    { id: 'shaft-banho', nome: 'Shaft do banheiro', x1: 404, z1: 632, x2: 404, z2: 690, esp: 32 },
  ],

  aberturas: [
    // Parede esquerda: 3 janelas (115 na sala, 155 na sala, 136 no quarto)
    { id: 'jan-115', tipo: 'janela', parede: 'ext-esq', pos: 67,  largura: 115, altura: 120, peitoril: 100 },
    { id: 'jan-155', tipo: 'janela', parede: 'ext-esq', pos: 257, largura: 155, altura: 120, peitoril: 100 },
    { id: 'jan-136', tipo: 'janela', parede: 'ext-esq', pos: 527, largura: 136, altura: 120, peitoril: 100 },
    // Entrada (80) na parede direita, logo abaixo da geladeira, abrindo para dentro
    { id: 'porta-entrada', tipo: 'porta', parede: 'ext-dir', pos: 357, largura: 80, altura: 210, dobradica: 'fim', lado: 1 },
    // Quarto (vão 78), encostado na parede do banheiro, abrindo para o quarto
    { id: 'porta-quarto', tipo: 'porta', parede: 'sala-quarto', pos: 222, largura: 78, altura: 210, dobradica: 'fim', lado: 1 },
    // Banheiro (vão 70), abrindo para dentro
    { id: 'porta-banho', tipo: 'porta', parede: 'sala-banho', pos: 8, largura: 70, altura: 210, dobradica: 'inicio', lado: 1 },
  ],

  ambientes: [
    { id: 'sala',     nome: 'Estar / jantar', piso: 'madeira',
      pontos: [[-6, -6], [330, -6], [330, 360], [426, 360], [426, 455], [-6, 455]] },
    { id: 'cozinha',  nome: 'Cozinha',  piso: 'cimento',
      pontos: [[330, -6], [388, -6], [388, 47], [426, 47], [426, 360], [330, 360]] },
    { id: 'quarto',   nome: 'Quarto',   piso: 'madeira',  pontos: [[-6, 455], [305, 455], [305, 706], [-6, 706]] },
    { id: 'banheiro', nome: 'Banheiro', piso: 'cimento',
      pontos: [[305, 455], [426, 455], [426, 616], [388, 616], [388, 706], [305, 706]] },
  ],

  // Contorno externo (linha de centro das paredes externas): área construída
  contorno: [[-6, -6], [426, -6], [426, 706], [-6, 706]],

  // FUTURO: alturas de tomadas e pontos de luz — { id, tipo, parede, pos, altura }
  pontosEletricos: [],
};

// ---------------------------------------------------------------------
// MÓVEIS — x,z = centro do móvel; rot = 0/90/180/270; y = altura do chão
// rot 0: frente para baixo (+z) · 90: para a esquerda · 180: para cima · 270: para a direita
// l = largura, p = profundidade, a = altura (cm) · espelhado = lado invertido (chaise, cuba)
// variante = formato (ver o catálogo) · aberto = 0 fechado … 1 aberto
// ---------------------------------------------------------------------
// Banheiro da planta final (o mesmo em todos os cenários)
const BANHEIRO = [
  { tipo: 'lavatorio', nome: 'Lavatório (gabinete 90)', x: 396.5, z: 505, rot: 90, l: 90, p: 43, a: 85,
    cores: { principal: '#a8784f', secundaria: '#f7f7f5' } },
  { tipo: 'vaso',      nome: 'Vaso sanitário', x: 385.5, z: 576, rot: 90, l: 38, p: 65, a: 75 },
  { tipo: 'box_banho', nome: 'Box (vidro fixo)', variante: 'fixo', x: 349, z: 658, rot: 180, l: 78, p: 84, a: 200,
    cores: { principal: '#d9d6d0', secundaria: '#2b2b2b' } },
];

// ---------------------------------------------------------------------
// PLANTA FINAL (BePê · estudo preliminar) — medida na planta final
// (2,55 px/cm) e decorada com o moodboard: freijó, azul-acinzentado,
// terracota, mostarda, vinho, granilite e azulejo 10×10 com rejunte escuro.
// ---------------------------------------------------------------------
const FREIJO = '#a8784f', FREIJO_ESCURO = '#7a5236', AZUL = '#5d6c84', TERRACOTA = '#8f4325';
const CREME = '#ece3d1', MOSTARDA = '#b8892c', VINHO = '#5e1a2a', GRAFITE = '#2f3036';

const MOVEIS_FINAL = [
  // ---- home office (na janela de 115)
  { tipo: 'mesa_computador', nome: 'Bancada de trabalho', variante: 'notebook', x: 71, z: 35, rot: 0, l: 110, p: 70, a: 75,
    cores: { principal: AZUL, secundaria: '#1f1f21' } },
  { tipo: 'cadeira', nome: 'Cadeira do escritório', variante: 'concha', x: 57, z: 97, rot: 180, l: 50, p: 55, a: 82,
    cores: { principal: '#f2efe8', secundaria: FREIJO } },
  { tipo: 'quadro', nome: 'Moldura ondulada com fotos', variante: 'ondulada', x: 71, z: 1.5, rot: 0, y: 118, l: 50, p: 3, a: 60,
    cores: { principal: AZUL, secundaria: '#6b3a24' } },
  // ---- jantar
  { tipo: 'banco', nome: 'Banco de jantar', x: 184.5, z: 17.5, rot: 0, l: 117, p: 35, a: 45, acab: 'tweed',
    cores: { principal: '#ffffff', secundaria: FREIJO } },
  { tipo: 'mesa_jantar', nome: 'Mesa de jantar', variante: 'retangular', x: 199.5, z: 79.5, rot: 0, l: 88, p: 88, a: 76,
    cores: { principal: FREIJO, secundaria: '#2b2622' } },
  { tipo: 'cadeira', nome: 'Cadeira de jantar', variante: 'curva', x: 133.5, z: 93, rot: 270, l: 45, p: 50, a: 82, acab: 'palha',
    cores: { principal: '#dcc79d', secundaria: FREIJO_ESCURO } },
  { tipo: 'cadeira', nome: 'Cadeira de jantar', variante: 'curva', x: 206.5, z: 145, rot: 180, l: 45, p: 50, a: 82, acab: 'palha',
    cores: { principal: '#dcc79d', secundaria: FREIJO_ESCURO } },
  { tipo: 'luminaria', nome: 'Pendente de papel de arroz', variante: 'papel', x: 199.5, z: 79.5, rot: 0, y: 160, l: 55, p: 55, a: 100,
    cores: { principal: '#f6e7c8', secundaria: '#2b2b2b' } },
  // ---- cozinha
  { tipo: 'peninsula', nome: 'Península', x: 266.5, z: 76.5, rot: 270, l: 153, p: 45, a: 90, acab: 'madeira',
    cores: { principal: FREIJO, secundaria: '#ffffff' } },
  { tipo: 'modulo_cozinha', nome: 'Módulo ao lado do shaft', x: 374, z: 23, rot: 90, l: 46, p: 28, a: 90, acab: 'madeira',
    cores: { principal: FREIJO, secundaria: '#ffffff' } },
  { tipo: 'bancada_cozinha', nome: 'Bancada (cooktop + cuba)', x: 390, z: 153.5, rot: 90, espelhado: true, l: 215, p: 60, a: 90, acab: 'madeira',
    cores: { principal: FREIJO, secundaria: '#ffffff' } },
  { tipo: 'armario_aereo', nome: 'Armário aéreo azul', x: 402.5, z: 153.5, rot: 90, y: 150, l: 215, p: 35, a: 70, acab: 'laca',
    cores: { principal: AZUL, secundaria: '#e6e3dd' } },
  { tipo: 'geladeira', nome: 'Geladeira', variante: 'inverse', x: 383, z: 303, rot: 90, l: 70, p: 70, a: 185,
    cores: { principal: '#c9ccd0', secundaria: '#7d8186' } },
  // ---- estar
  { tipo: 'estante_giratoria', nome: 'Estante divisória com TV giratória', x: 109, z: 230, rot: 0, l: 218, p: 40, a: 220,
    cores: { principal: FREIJO, secundaria: '#1f1f21' } },
  { tipo: 'planta', nome: 'Costela-de-adão', variante: 'costela', x: 34, z: 181, rot: 0, l: 48, p: 48, a: 130,
    cores: { principal: '#4c7044', secundaria: '#b9ad99' } },
  { tipo: 'sofa', nome: 'Sofá retrátil de veludo', variante: 'retratil', x: 115.5, z: 405, rot: 180, l: 200, p: 90, a: 88, acab: 'veludo',
    cores: { principal: TERRACOTA, secundaria: '#3a2a20' } },
  { tipo: 'luminaria', nome: 'Arandela articulada', variante: 'arandela', x: 60, z: 443, rot: 180, y: 145, l: 110, p: 14, a: 60,
    cores: { principal: '#141414', secundaria: '#141414' } },
  { tipo: 'quadro', nome: 'Quadro azul e verde', variante: 'tela', x: 160, z: 448.5, rot: 180, y: 118, l: 55, p: 3, a: 70,
    cores: { principal: '#2d4a6e', secundaria: '#2b2b2b' } },
  // ---- cortinas de linho nas três janelas
  { tipo: 'cortina', nome: 'Cortina (janela 115)', x: 7, z: 103, rot: 270, l: 196, p: 10, a: 250, acab: 'voil', aberto: 0.55,
    cores: { principal: '#e9e3d8', secundaria: '#3a3a3c' } },
  { tipo: 'cortina', nome: 'Cortina (janela 155)', x: 7, z: 349, rot: 270, l: 196, p: 10, a: 250, acab: 'voil', aberto: 0.55,
    cores: { principal: '#e9e3d8', secundaria: '#3a3a3c' } },
  { tipo: 'cortina', nome: 'Cortina (janela 136)', x: 7, z: 578, rot: 270, l: 232, p: 10, a: 250, acab: 'linho', aberto: 0.55,
    cores: { principal: '#d9cdb8', secundaria: '#3a3a3c' } },
  // ---- quarto
  { tipo: 'cama_box', nome: 'Cama box viúva', variante: 'canelada', x: 123, z: 558, rot: 0, l: 128, p: 196, a: 60, acab: 'xadrez',
    cores: { principal: '#e8e0cf', secundaria: '#e6dccb' } },
  { tipo: 'criado_mudo', nome: 'Criado-mudo de carvalho', variante: 'nicho', x: 34.5, z: 485, rot: 0, l: 45, p: 40, a: 55,
    cores: { principal: '#c49a6c', secundaria: '#a77f55' } },
  { tipo: 'luminaria', nome: 'Abajur cogumelo', variante: 'cogumelo', x: 34.5, z: 480, rot: 0, y: 55, l: 22, p: 22, a: 38,
    cores: { principal: '#1f2a23', secundaria: '#1f2a23' } },
  { tipo: 'mesa_lateral', nome: 'Mesa carretel vinho', variante: 'carretel', x: 204, z: 484, rot: 0, l: 32, p: 32, a: 46,
    cores: { principal: VINHO, secundaria: FREIJO } },
  { tipo: 'tapete', nome: 'Tapete mostarda', variante: 'borda', x: 124, z: 581, rot: 0, l: 200, p: 200, a: 1,
    cores: { principal: MOSTARDA, secundaria: CREME } },
  { tipo: 'quadro', nome: 'Tapeçaria sobre a cama', variante: 'tapecaria', x: 123, z: 461.5, rot: 0, y: 125, l: 100, p: 2, a: 75 },
  { tipo: 'tv_parede', nome: 'TV do quarto', x: 122.5, z: 697, rot: 180, y: 85, l: 123, p: 6, a: 71 },
  { tipo: 'guarda_roupa', nome: 'Guarda-roupa de abrir', variante: 'abrir', x: 271.5, z: 617, rot: 90, l: 160, p: 55, a: 220, acab: 'madeira',
    cores: { principal: FREIJO, secundaria: '#8f6440' } },
  // ---- banheiro: espelho ondulado e revestimento 10×10 com rejunte azul
  ...BANHEIRO,
  { tipo: 'espelho', nome: 'Espelho ondulado', variante: 'ondulado', x: 418.5, z: 505, rot: 90, y: 100, l: 60, p: 3, a: 80,
    cores: { principal: '#dfe7ea', secundaria: '#6b3a24' } },
  { tipo: 'revestimento', nome: 'Azulejo — parede do lavatório', x: 419.5, z: 538, rot: 90, l: 156, p: 1, a: 210 },
  { tipo: 'revestimento', nome: 'Azulejo — shaft (frente)', x: 387.5, z: 658, rot: 90, l: 84, p: 1, a: 210 },
  { tipo: 'revestimento', nome: 'Azulejo — shaft (lado)', x: 404, z: 615.5, rot: 180, l: 32, p: 1, a: 210 },
  { tipo: 'revestimento', nome: 'Azulejo — fundo do box', x: 349, z: 699.5, rot: 180, l: 78, p: 1, a: 210 },
  { tipo: 'revestimento', nome: 'Azulejo — parede do quarto', x: 310.5, z: 580, rot: 270, l: 240, p: 1, a: 210 },
  { tipo: 'revestimento', nome: 'Azulejo — ao lado da porta', x: 401.5, z: 460.5, rot: 0, l: 37, p: 1, a: 210 },
];

const CENARIO_FINAL = {
  id: 'planta-final',
  nome: 'Planta final',
  moveis: MOVEIS_FINAL,
  zonas: [
    { funcao: 'office',  x: 63,  z: 57.5, l: 126, p: 115 },
    { funcao: 'jantar',  x: 175, z: 100,  l: 140, p: 130 },
    { funcao: 'estar',   x: 110, z: 350,  l: 220, p: 200 },
    { funcao: 'cozinha', x: 355, z: 175,  l: 130, p: 350 },
    { funcao: 'dormir',  x: 150, z: 580,  l: 300, p: 240 },
    { funcao: 'banho',   x: 365, z: 580,  l: 110, p: 240 },
    { funcao: 'circulacao', nome: 'Entrada', x: 380, z: 395, l: 80, p: 90 },
  ],
};

// ---------------------------------------------------------------------
// TRÊS OPÇÕES PARA O JANTAR — a planta final com só a mesa e as cadeiras
// mudando, para comparar no modo Conferir.
// ---------------------------------------------------------------------
// Mora uma pessoa: quem janta não está no escritório (e vice-versa). Pares
// que nunca são usados ao mesmo tempo não contam como conflito de uso.
const USO_ALTERNADO = [['Cadeira do escritório', 'Cadeira de jantar']];

const ITENS_JANTAR = ['Mesa de jantar', 'Cadeira de jantar', 'Pendente de papel de arroz'];
const semJantar = MOVEIS_FINAL.filter((m) => !ITENS_JANTAR.includes(m.nome));
const cadeiraJantar = (x, z, rot) => ({ tipo: 'cadeira', nome: 'Cadeira de jantar', variante: 'curva', x, z, rot, l: 45, p: 50, a: 82, acab: 'palha',
  cores: { principal: '#dcc79d', secundaria: FREIJO_ESCURO } });
const pendenteJantar = (x, z) => ({ tipo: 'luminaria', nome: 'Pendente de papel de arroz', variante: 'papel', x, z, rot: 0, y: 160, l: 55, p: 55, a: 100,
  cores: { principal: '#f6e7c8', secundaria: '#2b2b2b' } });

const CENARIOS_JANTAR = [
  {
    id: 'jantar-1', nome: 'Jantar 1 · mesa 80 afastada',
    moveis: [
      ...semJantar,
      { tipo: 'mesa_jantar', nome: 'Mesa de jantar', variante: 'retangular', x: 197, z: 87, rot: 0, l: 80, p: 80, a: 76,
        cores: { principal: FREIJO, secundaria: '#2b2622' } },
      cadeiraJantar(134.5, 93, 270), cadeiraJantar(197, 149.5, 180), pendenteJantar(197, 87),
    ],
    zonas: CENARIO_FINAL.zonas,
  },
  {
    id: 'jantar-2', nome: 'Jantar 2 · sem cadeira oeste',
    moveis: MOVEIS_FINAL.filter((m) => !(m.nome === 'Cadeira de jantar' && m.rot === 270)),
    zonas: CENARIO_FINAL.zonas,
  },
  {
    id: 'jantar-3', nome: 'Jantar 3 · mesa redonda 80',
    moveis: [
      ...semJantar,
      { tipo: 'mesa_redonda', nome: 'Mesa de jantar', variante: 'pe_central', x: 197, z: 88, rot: 0, l: 80, p: 80, a: 76,
        cores: { principal: FREIJO, secundaria: '#2b2622' }, acab: 'madeira' },
      // as duas cadeiras lado a lado no lado sul: o canto do banco fica livre para entrar
      cadeiraJantar(174, 144, 180), cadeiraJantar(220, 144, 180), pendenteJantar(197, 88),
    ],
    zonas: CENARIO_FINAL.zonas,
  },
];

// Atalhos do modo Visitar: onde ficar e para onde olhar em cada cômodo
// (yaw: 0 = olhando para cima na planta; π/2 = para a esquerda).
const VISTAS_VISITA = [
  { nome: 'Sala', x: 335, z: 330, yaw: 1.3, pitch: -0.16 },
  { nome: 'Jantar e office', x: 250, z: 205, yaw: 0.85, pitch: -0.22 },
  { nome: 'Cozinha', x: 300, z: 330, yaw: -0.25, pitch: -0.2 },
  { nome: 'Quarto', x: 225, z: 680, yaw: 0.45, pitch: -0.2 },
  { nome: 'Banheiro', x: 330, z: 470, yaw: -2.5, pitch: -0.35 },
];

// Office na janela e Sofá em cima foram descartados (planta final + 3 jantares).
const CENARIOS_ORIGINAIS = [
  CENARIO_FINAL,
  ...CENARIOS_JANTAR,
];
