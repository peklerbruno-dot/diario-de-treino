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
// ⚠ DISPOSIÇÃO PROVISÓRIA: as plantas em imagem não chegaram. As medidas
// são as informadas; as posições foram deduzidas e devem ser conferidas.
// =====================================================================

const PLANTA_ORIGINAL = {
  aviso: 'Planta provisória: posições deduzidas das medidas, aguardando os prints para conferir.',
  alturaParede: 260,
  areaConstrutora: 32, // m², informado pela construtora

  paredes: [
    { id: 'ext-topo',  nome: 'Externa — fundo do quarto',        x1: -6,  z1: -6,  x2: 426, z2: -6,  esp: 12 },
    { id: 'ext-dir',   nome: 'Externa — direita (cozinha/entrada)', x1: 426, z1: -6,  x2: 426, z2: 706, esp: 12 },
    { id: 'ext-baixo', nome: 'Externa — sala',                   x1: -6,  z1: 706, x2: 426, z2: 706, esp: 12 },
    { id: 'ext-esq',   nome: 'Externa — esquerda (janelas)',     x1: -6,  z1: -6,  x2: -6,  z2: 706, esp: 12 },
    { id: 'quarto-sala',  nome: 'Quarto / sala',     x1: -6,  z1: 305, x2: 275, z2: 305, esp: 10, derrubavel: true },
    { id: 'quarto-banho', nome: 'Quarto / banheiro', x1: 275, z1: -6,  x2: 275, z2: 305, esp: 10 },
    { id: 'banho-hall',   nome: 'Banheiro / hall',   x1: 275, z1: 194, x2: 426, z2: 194, esp: 10 },
  ],

  aberturas: [
    // Parede esquerda: 3 janelas (115, 155, 136)
    { id: 'jan-quarto', tipo: 'janela', parede: 'ext-esq', pos: 96,  largura: 115, altura: 120, peitoril: 100 },
    { id: 'jan-sala-1', tipo: 'janela', parede: 'ext-esq', pos: 351, largura: 155, altura: 120, peitoril: 100 },
    { id: 'jan-sala-2', tipo: 'janela', parede: 'ext-esq', pos: 546, largura: 136, altura: 120, peitoril: 100 },
    // Entrada (80) na parede direita, abrindo para dentro
    { id: 'porta-entrada', tipo: 'porta', parede: 'ext-dir', pos: 606, largura: 80, altura: 210, dobradica: 'fim', lado: 1 },
    // Porta de correr de 2 folhas, 2,00 m, na sala
    { id: 'porta-correr', tipo: 'correr', parede: 'ext-baixo', pos: 176, largura: 200, altura: 210 },
    // Quarto (vão 78), abrindo para dentro do quarto
    { id: 'porta-quarto', tipo: 'porta', parede: 'quarto-banho', pos: 211, largura: 78, altura: 210, dobradica: 'fim', lado: 1 },
    // Banheiro (vão 70), abrindo para o hall
    { id: 'porta-banho', tipo: 'porta', parede: 'banho-hall', pos: 7, largura: 70, altura: 210, dobradica: 'inicio', lado: 1 },
  ],

  ambientes: [
    { id: 'quarto',   nome: 'Quarto',   piso: 'madeira',     pontos: [[-6, -6], [275, -6], [275, 305], [-6, 305]] },
    { id: 'banheiro', nome: 'Banheiro', piso: 'ceramica',    pontos: [[275, -6], [426, -6], [426, 194], [275, 194]] },
    { id: 'cozinha',  nome: 'Cozinha',  piso: 'porcelanato', pontos: [[330, 194], [426, 194], [426, 510], [330, 510]] },
    { id: 'sala',     nome: 'Sala',     piso: 'madeira',
      pontos: [[-6, 305], [275, 305], [275, 194], [330, 194], [330, 510], [426, 510], [426, 706], [-6, 706]] },
  ],

  // Contorno externo (linha de centro das paredes externas): área construída
  contorno: [[-6, -6], [426, -6], [426, 706], [-6, 706]],

  // FUTURO: alturas de tomadas e pontos de luz — { id, tipo, parede, pos, altura }
  pontosEletricos: [],
};

// ---------------------------------------------------------------------
// MÓVEIS — x,z = centro do móvel; rot = 0/90/180/270
// rot 0: frente para baixo (+z) · 90: para a esquerda · 180: para cima · 270: para a direita
// l = largura, p = profundidade, a = altura (cm)
// ---------------------------------------------------------------------
const MOVEIS_COMUNS = [
  // Quarto
  { tipo: 'cama_box',     nome: 'Cama box viúva', x: 124,   z: 94,    rot: 0,   l: 128, p: 188, a: 60 },
  { tipo: 'criado_mudo',  nome: 'Criado-mudo',    x: 32.5,  z: 20,    rot: 0,   l: 45,  p: 40,  a: 55 },
  { tipo: 'guarda_roupa', nome: 'Guarda-roupa',   x: 100,   z: 272.5, rot: 180, l: 160, p: 55,  a: 220 },
  // Cozinha
  { tipo: 'bancada_cozinha', nome: 'Bancada (cuba + cooktop)', x: 390, z: 317, rot: 90, l: 224, p: 60, a: 90 },
  { tipo: 'geladeira',    nome: 'Geladeira',      x: 385,   z: 469,   rot: 90,  l: 70,  p: 70,  a: 185 },
  // Banheiro
  { tipo: 'box_banho',    nome: 'Box',            x: 365,   z: 42,    rot: 0,   l: 110, p: 84,  a: 200 },
  { tipo: 'vaso',         nome: 'Vaso sanitário', x: 312.5, z: 119,   rot: 270, l: 38,  p: 65,  a: 75 },
  { tipo: 'lavatorio',    nome: 'Lavatório',      x: 400,   z: 135,   rot: 90,  l: 50,  p: 40,  a: 85 },
];

const CENARIOS_ORIGINAIS = [
  {
    id: 'office-janela',
    nome: 'Office na janela',
    moveis: [
      ...MOVEIS_COMUNS,
      { tipo: 'mesa_computador',    nome: 'Mesa de computador', x: 35,    z: 425,   rot: 270, l: 140, p: 70, a: 75 },
      { tipo: 'cadeira_escritorio', nome: 'Cadeira',            x: 105,   z: 425,   rot: 90,  l: 60,  p: 60, a: 100 },
      { tipo: 'sofa_chaise',        nome: 'Sofá 3 lugares com chaise', x: 80, z: 597.5, rot: 270, l: 205, p: 160, a: 85 },
      { tipo: 'estante_tv',         nome: 'Estante divisória com TV',  x: 317.5, z: 535, rot: 90, l: 180, p: 35, a: 180 },
      { tipo: 'mesa_jantar',        nome: 'Mesa de jantar',     x: 237.5, z: 385,   rot: 90,  l: 110, p: 75, a: 76 },
      { tipo: 'cadeira',            nome: 'Cadeira de jantar',  x: 175,   z: 362.5, rot: 270, l: 45,  p: 50, a: 90 },
      { tipo: 'cadeira',            nome: 'Cadeira de jantar',  x: 175,   z: 412.5, rot: 270, l: 45,  p: 50, a: 90 },
      { tipo: 'cadeira',            nome: 'Cadeira de jantar',  x: 300,   z: 362.5, rot: 90,  l: 45,  p: 50, a: 90 },
      { tipo: 'cadeira',            nome: 'Cadeira de jantar',  x: 300,   z: 412.5, rot: 90,  l: 45,  p: 50, a: 90 },
    ],
  },
  {
    id: 'sofa-em-cima',
    nome: 'Sofá em cima',
    moveis: [
      ...MOVEIS_COMUNS,
      { tipo: 'sofa_chaise',        nome: 'Sofá 2 lugares com chaise', x: 140, z: 385, rot: 0, l: 200, p: 150, a: 85 },
      { tipo: 'estante_tv',         nome: 'Estante divisória com TV',  x: 160, z: 577.5, rot: 180, l: 200, p: 35, a: 180 },
      { tipo: 'mesa_computador',    nome: 'Mesa',               x: 27.5, z: 640,   rot: 270, l: 100, p: 55, a: 75 },
      { tipo: 'cadeira_escritorio', nome: 'Cadeira',            x: 90,   z: 640,   rot: 90,  l: 60,  p: 60, a: 100 },
      { tipo: 'mesa_jantar',        nome: 'Mesa de jantar',     x: 290,  z: 415,   rot: 0,   l: 80,  p: 70, a: 76 },
      { tipo: 'cadeira',            nome: 'Cadeira de jantar',  x: 290,  z: 355,   rot: 0,   l: 45,  p: 50, a: 90 },
      { tipo: 'cadeira',            nome: 'Cadeira de jantar',  x: 290,  z: 475,   rot: 180, l: 45,  p: 50, a: 90 },
    ],
  },
];
