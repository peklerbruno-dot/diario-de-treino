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
// Disposição medida nos prints "Office na janela" e "Sofá em cima"
// (escala de 1,43 px/cm sobre o interior de 420 × 700).
// 'revisao' muda quando a planta original muda: um layout salvo com revisão
// antiga é guardado como cópia e o simulador abre a planta nova.
// =====================================================================

const PLANTA_ORIGINAL = {
  revisao: 2,
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
    { id: 'shaft', nome: 'Shaft', x1: 404, z1: 4, x2: 404, z2: 31, esp: 32 },
  ],

  aberturas: [
    // Parede esquerda: 3 janelas (115 na sala, 155 na sala, 136 no quarto)
    { id: 'jan-115', tipo: 'janela', parede: 'ext-esq', pos: 67,  largura: 115, altura: 120, peitoril: 100 },
    { id: 'jan-155', tipo: 'janela', parede: 'ext-esq', pos: 257, largura: 155, altura: 120, peitoril: 100 },
    { id: 'jan-136', tipo: 'janela', parede: 'ext-esq', pos: 527, largura: 136, altura: 120, peitoril: 100 },
    // Entrada (80) na parede direita, logo abaixo da geladeira, abrindo para dentro
    { id: 'porta-entrada', tipo: 'porta', parede: 'ext-dir', pos: 357, largura: 80, altura: 210, dobradica: 'fim', lado: 1 },
    // Quarto (vão 78), encostado na parede do banheiro, abrindo para o quarto
    { id: 'porta-quarto', tipo: 'porta', parede: 'sala-quarto', pos: 228, largura: 78, altura: 210, dobradica: 'fim', lado: 1 },
    // Banheiro (vão 70), abrindo para dentro
    { id: 'porta-banho', tipo: 'porta', parede: 'sala-banho', pos: 5, largura: 70, altura: 210, dobradica: 'inicio', lado: 1 },
  ],

  ambientes: [
    { id: 'sala',     nome: 'Estar / jantar', piso: 'madeira',
      pontos: [[-6, -6], [330, -6], [330, 360], [426, 360], [426, 455], [-6, 455]] },
    { id: 'cozinha',  nome: 'Cozinha',  piso: 'porcelanato',
      pontos: [[330, -6], [388, -6], [388, 47], [426, 47], [426, 360], [330, 360]] },
    { id: 'quarto',   nome: 'Quarto',   piso: 'madeira',  pontos: [[-6, 455], [305, 455], [305, 706], [-6, 706]] },
    { id: 'banheiro', nome: 'Banheiro', piso: 'ceramica', pontos: [[305, 455], [426, 455], [426, 706], [305, 706]] },
  ],

  // Contorno externo (linha de centro das paredes externas): área construída
  contorno: [[-6, -6], [426, -6], [426, 706], [-6, 706]],

  // FUTURO: alturas de tomadas e pontos de luz — { id, tipo, parede, pos, altura }
  pontosEletricos: [],
};

// ---------------------------------------------------------------------
// MÓVEIS — x,z = centro do móvel; rot = 0/90/180/270
// rot 0: frente para baixo (+z) · 90: para a esquerda · 180: para cima · 270: para a direita
// l = largura, p = profundidade, a = altura (cm) · espelhado = lado invertido (chaise, cuba)
// ---------------------------------------------------------------------
const MOVEIS_COMUNS = [
  // Quarto: cama com a cabeceira na parede da sala, guarda-roupa de correr na parede do banheiro
  { tipo: 'cama_box',     nome: 'Cama box viúva', x: 121,   z: 554,   rot: 0,  l: 128, p: 188, a: 60 },
  { tipo: 'criado_mudo',  nome: 'Criado-mudo',    x: 28,    z: 480,   rot: 0,  l: 45,  p: 40,  a: 55 },
  { tipo: 'guarda_roupa', nome: 'Guarda-roupa de correr', x: 272.5, z: 620, rot: 90, l: 160, p: 55, a: 220 },
  // Cozinha: bancada com o cooktop no alto, cuba abaixo; geladeira com folga de 10 cm
  { tipo: 'bancada_cozinha', nome: 'Bancada (cuba + cooktop)', x: 390, z: 159, rot: 90, espelhado: true, l: 224, p: 60, a: 90 },
  { tipo: 'geladeira',    nome: 'Geladeira',      x: 375,   z: 316,   rot: 90, l: 70,  p: 70,  a: 185 },
  // Banheiro
  { tipo: 'lavatorio',    nome: 'Lavatório',      x: 399,   z: 511,   rot: 90, l: 65,  p: 42,  a: 85 },
  { tipo: 'vaso',         nome: 'Vaso sanitário', x: 390,   z: 577,   rot: 90, l: 38,  p: 60,  a: 75 },
  { tipo: 'box_banho',    nome: 'Box (vidro de correr)', x: 365, z: 658, rot: 180, l: 110, p: 84, a: 200 },
];

const CENARIOS_ORIGINAIS = [
  {
    id: 'office-janela',
    nome: 'Office na janela',
    moveis: [
      ...MOVEIS_COMUNS,
      { tipo: 'mesa_computador',    nome: 'Mesa de computador', x: 70,    z: 35,    rot: 0,   l: 140, p: 70, a: 75 },
      { tipo: 'cadeira_escritorio', nome: 'Cadeira',            x: 70,    z: 60,    rot: 180, l: 60,  p: 60, a: 100 },
      { tipo: 'mesa_jantar',        nome: 'Mesa de jantar',     x: 211,   z: 120,   rot: 0,   l: 110, p: 75, a: 76 },
      { tipo: 'cadeira',            nome: 'Cadeira de jantar',  x: 185,   z: 83,    rot: 0,   l: 45,  p: 50, a: 90 },
      { tipo: 'cadeira',            nome: 'Cadeira de jantar',  x: 237,   z: 83,    rot: 0,   l: 45,  p: 50, a: 90 },
      { tipo: 'estante_tv',         nome: 'Estante divisória com TV', x: 80.5, z: 227.5, rot: 0, l: 160, p: 45, a: 180 },
      { tipo: 'painel_fixo',        nome: 'Painel fixo',        x: 186,   z: 228,   rot: 0,   l: 50,  p: 5,  a: 210 },
      { tipo: 'porta_correr',       nome: 'Porta de correr 2 folhas', x: 218, z: 334, rot: 90, l: 200, p: 8, a: 210 },
      { tipo: 'sofa_chaise',        nome: 'Sofá 3 lugares com chaise', x: 102.5, z: 370, rot: 180, espelhado: true, l: 205, p: 160, a: 85 },
    ],
  },
  {
    id: 'sofa-em-cima',
    nome: 'Sofá em cima',
    moveis: [
      ...MOVEIS_COMUNS,
      { tipo: 'sofa_chaise',        nome: 'Sofá 2 lugares com chaise', x: 100, z: 75, rot: 0, l: 200, p: 150, a: 85 },
      { tipo: 'porta_correr',       nome: 'Porta de correr 2 folhas', x: 222, z: 100, rot: 90, l: 200, p: 8, a: 210 },
      { tipo: 'estante_tv',         nome: 'Estante divisória com TV', x: 100, z: 201.5, rot: 180, l: 200, p: 45, a: 180 },
      { tipo: 'mesa_jantar',        nome: 'Mesa de jantar',     x: 56,    z: 343.5, rot: 0,   l: 80,  p: 70, a: 76 },
      { tipo: 'cadeira',            nome: 'Cadeira de jantar',  x: 56,    z: 309,   rot: 0,   l: 45,  p: 50, a: 90 },
      { tipo: 'cadeira',            nome: 'Cadeira de jantar',  x: 56,    z: 379,   rot: 180, l: 45,  p: 50, a: 90 },
      { tipo: 'mesa_computador',    nome: 'Mesa',               x: 172,   z: 422.5, rot: 180, l: 100, p: 55, a: 75 },
      { tipo: 'cadeira_escritorio', nome: 'Cadeira',            x: 172,   z: 390,   rot: 0,   l: 60,  p: 60, a: 100 },
    ],
  },
];
