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
  revisao: 11,
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
    { id: 'cozinha',  nome: 'Cozinha',  piso: 'madeira',
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
  { tipo: 'lavatorio', nome: 'Lavatório (gabinete 90)', variante: 'recorte', x: 396.5, z: 505, rot: 90, l: 90, p: 43, a: 85,
    cores: { principal: '#a8784f', secundaria: '#f7f7f5' } },
  { tipo: 'vaso',      nome: 'Vaso sanitário', x: 385.5, z: 576, rot: 90, l: 38, p: 65, a: 75 },
  { tipo: 'chuveiro', nome: 'Chuveiro', x: 349, z: 680, rot: 180, l: 24, p: 40, a: 215 },
  { tipo: 'box_banho', nome: 'Box (vidro fixo)', variante: 'fixo', x: 349, z: 658, rot: 180, l: 78, p: 84, a: 200,
    cores: { principal: '#d9d6d0', secundaria: '#2b2b2b' } },
];

// ---------------------------------------------------------------------
// PLANTA FINAL (BePê · estudo preliminar) — medida na planta final
// (2,55 px/cm) e decorada com o moodboard: freijó, azul-acinzentado,
// terracota, mostarda, vinho, granilite e azulejo 10×10 com rejunte escuro.
// ---------------------------------------------------------------------
const FREIJO = '#a8784f', AZUL = '#5d6c84', TERRACOTA = '#8f4325';
const CREME = '#ece3d1', MOSTARDA = '#b8892c', VINHO = '#5e1a2a', GRAFITE = '#2f3036';

const MOVEIS_FINAL = [
  // ---- home office: encostada na parede das janelas, terminando onde a janela de 115 começa (z 61)
  { tipo: 'mesa_computador', nome: 'Bancada de trabalho', variante: 'notebook', x: 55, z: 30.5, rot: 0, l: 110, p: 61, a: 75,
    cores: { principal: AZUL, secundaria: '#1f1f21' } },
  { tipo: 'cadeira', nome: 'Cadeira do escritório', variante: 'concha', x: 55, z: 88, rot: 180, l: 50, p: 55, a: 82,
    cores: { principal: '#f2efe8', secundaria: FREIJO } },
  { tipo: 'quadro', nome: 'Moldura ondulada com fotos', variante: 'ondulada', x: 55, z: 1.5, rot: 0, y: 118, l: 50, p: 3, a: 60,
    cores: { principal: AZUL, secundaria: '#6b3a24' } },
  // ---- jantar
  { tipo: 'banco', nome: 'Banco de jantar', x: 184.5, z: 17.5, rot: 0, l: 117, p: 35, a: 45, acab: 'tweed',
    cores: { principal: '#ffffff', secundaria: FREIJO } },
  { tipo: 'mesa_jantar', nome: 'Mesa de jantar', variante: 'retangular', x: 199.5, z: 79.5, rot: 0, l: 88, p: 88, a: 76,
    cores: { principal: FREIJO, secundaria: '#2b2622' } },
  // ---- cozinha
  { tipo: 'peninsula', nome: 'Península', x: 260, z: 76.5, rot: 270, l: 153, p: 32, a: 90, acab: 'madeira',
    cores: { principal: FREIJO, secundaria: '#ffffff' } },
  { tipo: 'modulo_cozinha', nome: 'Módulo ao lado do shaft', x: 374, z: 23, rot: 90, l: 46, p: 28, a: 90, acab: 'madeira',
    cores: { principal: FREIJO, secundaria: '#ffffff' } },
  { tipo: 'bancada_cozinha', nome: 'Bancada (cooktop + cuba)', variante: 'projeto', x: 390, z: 153.5, rot: 90, espelhado: true, l: 215, p: 60, a: 90, acab: 'madeira',
    cores: { principal: FREIJO, secundaria: '#ffffff' } },
  { tipo: 'armario_aereo', nome: 'Armário aéreo azul', variante: 'projeto', x: 395, z: 153.5, rot: 90, espelhado: true, y: 150, l: 215, p: 50, a: 60, acab: 'laca',
    cores: { principal: AZUL, secundaria: '#e6e3dd' } },
  // depurador DE6RB no módulo do aéreo, sobre o cooktop (de 166 a 187,6; vazio de 150 a 166)
  { tipo: 'depurador', nome: 'Depurador', x: 402.5, z: 86, rot: 90, y: 166, l: 59.8, p: 35, a: 21.6,
    cores: { principal: '#1d1e20', secundaria: '#0e0e10' } },
  // geladeira IF41S duplex 60,4 × 71,2 × 176,9: 4 cm da bancada e 5 cm da parede; abre para o lado da porta
  { tipo: 'geladeira', nome: 'Geladeira', variante: 'duplex', x: 379.4, z: 295.2, rot: 90, l: 60.4, p: 71.2, a: 176.9,
    cores: { principal: '#c9ccd0', secundaria: '#7d8186' } },
  // ---- ar-condicionado: sala na parede do fundo (sopra ao longo do apartamento), quarto na parede do pé da cama
  { tipo: 'ar_split', nome: 'Ar-condicionado da sala', x: 184.5, z: 10, rot: 0, y: 222, l: 80, p: 20, a: 28 },
  { tipo: 'ar_split', nome: 'Ar-condicionado do quarto', x: 170, z: 690, rot: 180, y: 222, l: 80, p: 20, a: 28 },
  // ---- estar
  { tipo: 'estante_giratoria', nome: 'Estante divisória com TV giratória', x: 109, z: 230, rot: 0, l: 218, p: 40, a: 220,
    cores: { principal: FREIJO, secundaria: '#1f1f21' } },
  { tipo: 'sofa', nome: 'Sofá retrátil de veludo', variante: 'retratil', x: 115.5, z: 405, rot: 180, l: 200, p: 90, a: 88, acab: 'veludo',
    cores: { principal: TERRACOTA, secundaria: '#3a2a20' } },
  { tipo: 'luminaria', nome: 'Arandela articulada', variante: 'arandela', x: 60, z: 443, rot: 180, y: 145, l: 110, p: 14, a: 60,
    cores: { principal: '#141414', secundaria: '#141414' } },
  { tipo: 'quadro', nome: 'Quadro azul e verde', variante: 'tela', x: 160, z: 448.5, rot: 180, y: 118, l: 55, p: 3, a: 70,
    cores: { principal: '#2d4a6e', secundaria: '#2b2b2b' } },
  // ---- cortinas nas três janelas: largura da janela + 15 cm de cada lado, centradas nela
  { tipo: 'cortina', nome: 'Cortina (janela 115)', x: 7, z: 118.5, rot: 270, l: 145, p: 10, a: 250, acab: 'voil', aberto: 0.8,
    cores: { principal: '#e9e3d8', secundaria: '#3a3a3c' } },
  { tipo: 'cortina', nome: 'Cortina (janela 155)', x: 7, z: 328.5, rot: 270, l: 185, p: 10, a: 250, acab: 'voil', aberto: 0.8,
    cores: { principal: '#e9e3d8', secundaria: '#3a3a3c' } },
  { tipo: 'cortina', nome: 'Cortina (janela 136)', x: 7, z: 589, rot: 270, l: 166, p: 10, a: 250, acab: 'linho', aberto: 0.8,
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
  nome: 'Mesa quadrada 88',
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

// Duas opções de jantar, as duas só com o banco (sem cadeiras) e com a
// península reduzida: a mesa quadrada da planta final e uma redonda.
const mesaRedonda = (d, x, z) => ({ tipo: 'mesa_redonda', nome: 'Mesa de jantar', variante: 'pe_central', x, z, rot: 0, l: d, p: d, a: 76,
  cores: { principal: FREIJO, secundaria: '#2b2622' }, acab: 'madeira' });
const comMesa = (id, nome, mesa) => ({
  id, nome, zonas: CENARIO_FINAL.zonas,
  moveis: [...MOVEIS_FINAL.filter((m) => m.nome !== 'Mesa de jantar'), mesa],
});
const CENARIOS_JANTAR = [
  comMesa('mesa-redonda', 'Mesa redonda 80', mesaRedonda(80, 197, 88)),
  // Ø70 encostada na península: ~42 cm na quina da bancada de trabalho e mesa a 13 cm do banco
  comMesa('redonda-70', 'Redonda 70', mesaRedonda(70, 202, 83)),
];

// ---------------------------------------------------------------------
// ESTUDO PRELIMINAR 02 · le.vá arquitetura (opção 01) — medido na planta de
// layout (1/50) e nos renders: nogueira, azul-marinho, granilite claro,
// mesa redonda com cadeiras dobráveis, coifa de parede, torre da geladeira,
// rack com prateleiras (até o teto ou suspensas do teto) e banheiro vinho.
// ---------------------------------------------------------------------
const NOGUEIRA = '#6b4430', AZUL_LEVA = '#46557a', GRANILITE = '#ece6dc';
const caixaLeva = (nome, x, z, rot, y, l, p, a, cor) => ({ tipo: 'caixa', nome, x, z, rot, y, l, p, a, cores: { principal: cor, secundaria: cor } });
const montante = (nome, x, z, y, a) => ({ tipo: 'cilindro', nome, x, z, rot: 0, y, l: 3.5, p: 3.5, a, cores: { principal: '#a7a9ab', secundaria: '#a7a9ab' } });
const prateleiraLeva = (nome, x, y, l) => ({ tipo: 'prateleira', nome, x, z: 230, rot: 0, y, l, p: 32, a: 26, cores: { principal: NOGUEIRA, secundaria: '#a7a9ab' } });
const ESTANTE_TETO = [
  prateleiraLeva('Prateleira alta', 109, 195, 218), prateleiraLeva('Prateleira do meio', 109, 155, 218),
  prateleiraLeva('Prateleira lateral', 192, 112, 48),
  // montantes metálicos do rack até o teto
  ...[52, 167, 215].map((x, i) => montante(`Montante ${i + 1}`, x, 230, 50, 210)),
];
const ESTANTE_SUSPENSA = [
  prateleiraLeva('Prateleira suspensa alta', 109, 215, 218), prateleiraLeva('Prateleira suspensa baixa', 109, 175, 218),
  // tirantes presos no teto
  ...[[25, 218], [25, 242], [193, 218], [193, 242]].map(([x, z], i) => montante(`Tirante ${i + 1}`, x, z, 175, 85)),
];
const moveisLeva = (estante) => [
  // ---- office e jantar: mesa de 100 × 45, banco de 130 e mesa redonda Ø80 com 2 cadeiras dobráveis
  { tipo: 'revestimento', nome: 'Barrado pintado (bege)', x: 165, z: 0.5, rot: 0, l: 330, p: 1, a: 90, acab: 'laca',
    cores: { principal: '#d8ceb3', secundaria: '#d8ceb3' } },
  { tipo: 'mesa_computador', nome: 'Bancada de trabalho', variante: 'escrivaninha', x: 64, z: 22.5, rot: 0, l: 100, p: 45, a: 75,
    cores: { principal: NOGUEIRA, secundaria: NOGUEIRA } },
  { tipo: 'cadeira_escritorio', nome: 'Cadeira do escritório', x: 55, z: 75, rot: 180, l: 60, p: 60, a: 100, acab: 'couro',
    cores: { principal: '#c9a24a', secundaria: '#b9bcc0' } },
  { tipo: 'quadro', nome: 'Quadros sobre a mesa', variante: 'trio', x: 80, z: 1.5, rot: 0, y: 115, l: 70, p: 3, a: 45 },
  { tipo: 'banco', nome: 'Banco de jantar', x: 179, z: 20, rot: 0, l: 130, p: 40, a: 45, acab: 'linho',
    cores: { principal: '#b5532f', secundaria: NOGUEIRA } },
  { tipo: 'mesa_redonda', nome: 'Mesa de jantar', variante: 'pe_central', x: 199, z: 75, rot: 0, l: 80, p: 80, a: 76,
    cores: { principal: GRANILITE, secundaria: GRANILITE } },
  { tipo: 'cadeira', nome: 'Cadeira de jantar', variante: 'madeira', x: 136, z: 80, rot: 270, l: 42, p: 48, a: 82,
    cores: { principal: '#7d8794', secundaria: '#7d8794' } },
  { tipo: 'cadeira', nome: 'Cadeira de jantar', variante: 'madeira', x: 205, z: 133, rot: 180, l: 42, p: 48, a: 82,
    cores: { principal: '#7d8794', secundaria: '#7d8794' } },
  { tipo: 'luminaria', nome: 'Pendente de papel', variante: 'papel', x: 199, z: 75, rot: 0, y: 160, l: 50, p: 50, a: 100 },
  // ---- cozinha: península 152 × 45, bancada com forno sob o cooktop, aéreo azul só do lado da
  // geladeira (com nicho do micro), coifa de parede, torre azul em volta da geladeira
  { tipo: 'peninsula', nome: 'Península', x: 267, z: 76, rot: 270, l: 152, p: 45, a: 90, acab: 'madeira',
    cores: { principal: NOGUEIRA, secundaria: GRANILITE } },
  { tipo: 'modulo_cozinha', nome: 'Módulo ao lado do shaft', x: 374, z: 23, rot: 90, l: 46, p: 28, a: 90, acab: 'madeira',
    cores: { principal: NOGUEIRA, secundaria: GRANILITE } },
  { tipo: 'bancada_cozinha', nome: 'Bancada (cooktop + cuba)', variante: 'eletros', x: 390, z: 153.5, rot: 90, espelhado: true, l: 215, p: 60, a: 90, acab: 'madeira',
    cores: { principal: NOGUEIRA, secundaria: GRANILITE } },
  { tipo: 'armario_aereo', nome: 'Armário aéreo azul', variante: 'micro', x: 402.5, z: 205.5, rot: 90, y: 140, l: 111, p: 35, a: 70, acab: 'laca',
    cores: { principal: AZUL_LEVA, secundaria: '#e6e3dd' } },
  caixaLeva('Coifa de parede (inox)', 395, 86, 90, 155, 60, 50, 8, '#b9bdc2'),
  caixaLeva('Chaminé da coifa', 409, 86, 90, 163, 26, 22, 97, '#b9bdc2'),
  caixaLeva('Purificador de água', 399, 213, 90, 103, 16, 42, 35, '#8d9196'),
  { tipo: 'geladeira', nome: 'Geladeira', variante: 'duplex', x: 383, z: 303, rot: 90, l: 60.4, p: 71.2, a: 176.9,
    cores: { principal: '#c9ccd0', secundaria: '#7d8186' } },
  caixaLeva('Torre da geladeira — lateral', 383, 263, 90, 0, 2, 74, 210, AZUL_LEVA),
  caixaLeva('Torre da geladeira — lateral da porta', 383, 343, 90, 0, 2, 74, 210, AZUL_LEVA),
  caixaLeva('Torre da geladeira — armário de cima', 383, 303, 90, 180, 78, 74, 30, AZUL_LEVA),
  ...MOVEIS_FINAL.filter((m) => m.tipo === 'ar_split' || m.tipo === 'cortina'),
  // ---- estar: rack de 218 com TV apoiada e prateleiras; sofá retrátil, tapete redondo xadrez
  { tipo: 'rack_tv', nome: 'Rack', variante: 'basculante', x: 109, z: 230, rot: 0, l: 218, p: 40, a: 50,
    cores: { principal: NOGUEIRA, secundaria: NOGUEIRA } },
  { tipo: 'tv_parede', nome: 'TV da sala', x: 105, z: 232, rot: 0, y: 50, l: 110, p: 6, a: 64 },
  { tipo: 'luminaria', nome: 'Abajur do rack', variante: 'abajur', x: 180, z: 232, rot: 0, y: 50, l: 25, p: 25, a: 45,
    cores: { principal: '#efe2c8', secundaria: '#b5652f' } },
  ...estante,
  { tipo: 'planta', nome: 'Fícus', variante: 'ficus', x: 32, z: 181, rot: 0, l: 50, p: 50, a: 140 },
  ...MOVEIS_FINAL.filter((m) => ['Sofá retrátil de veludo', 'Quadro azul e verde'].includes(m.nome)),
  { tipo: 'luminaria', nome: 'Arandela articulada', variante: 'arandela', x: 60, z: 443, rot: 180, y: 145, l: 110, p: 14, a: 60,
    cores: { principal: '#8f1f24', secundaria: '#8f1f24' } },
  { tipo: 'tapete', nome: 'Tapete redondo xadrez', variante: 'redondo', x: 108, z: 300, rot: 0, l: 160, p: 160, a: 1,
    cores: { principal: '#4e6b55', secundaria: CREME } },
  // ---- quarto: cama 120 com cabeceira estofada, criado-mudo, banqueta vinho, tapete de sisal
  { tipo: 'cama_box', nome: 'Cama box', variante: 'cabeceira', x: 121.5, z: 557.5, rot: 0, l: 120, p: 195, a: 60, acab: 'xadrez',
    cores: { principal: '#5a5d5a', secundaria: '#e3dccd' } },
  { tipo: 'criado_mudo', nome: 'Criado-mudo', variante: 'gaveta', x: 33, z: 485, rot: 0, l: 43, p: 40, a: 55,
    cores: { principal: NOGUEIRA, secundaria: NOGUEIRA } },
  { tipo: 'luminaria', nome: 'Abajur vinho', variante: 'abajur', x: 33, z: 480, rot: 0, y: 55, l: 24, p: 24, a: 40,
    cores: { principal: '#efe2c8', secundaria: VINHO } },
  { tipo: 'mesa_lateral', nome: 'Banqueta vinho', variante: 'carretel', x: 200.5, z: 483, rot: 0, l: 30, p: 30, a: 46,
    cores: { principal: VINHO, secundaria: VINHO } },
  { tipo: 'tapete', nome: 'Tapete de sisal', variante: 'listrado', x: 122, z: 582, rot: 0, l: 200, p: 200, a: 1,
    cores: { principal: '#c9a76a', secundaria: '#b8945a' } },
  { tipo: 'quadro', nome: 'Quadro sobre a cama', variante: 'tela', x: 121.5, z: 461.5, rot: 0, y: 130, l: 100, p: 3, a: 70,
    cores: { principal: '#e8dfcf', secundaria: '#8a6a45' } },
  ...MOVEIS_FINAL.filter((m) => m.nome === 'TV do quarto'),
  { tipo: 'guarda_roupa', nome: 'Guarda-roupa de abrir', variante: 'abrir', x: 271.5, z: 617, rot: 90, l: 160, p: 55, a: 220, acab: 'madeira',
    cores: { principal: NOGUEIRA, secundaria: '#8f6440' } },
  // ---- banheiro: gabinete vinho, espelho com nicho de madeira e porcelanato claro
  ...BANHEIRO.map((m) => (m.tipo === 'lavatorio' ? { ...m, cores: { principal: VINHO, secundaria: '#e9dcc4' } } : m)),
  { tipo: 'espelho', nome: 'Espelho com nicho', variante: 'retangular', x: 418.5, z: 505, rot: 90, y: 105, l: 85, p: 3, a: 55,
    cores: { principal: '#dfe7ea', secundaria: NOGUEIRA } },
  ...MOVEIS_FINAL.filter((m) => m.tipo === 'revestimento').map((m) => ({ ...m, nome: m.nome.replace('Azulejo', 'Porcelanato'), acab: 'azulejo',
    cores: { principal: '#efe6d8', secundaria: '#efe6d8' } })),
];
const CENARIOS_LEVA = [
  { id: 'leva-02-teto', nome: 'Estudo le.vá', zonas: CENARIO_FINAL.zonas, moveis: moveisLeva(ESTANTE_TETO) },
  { id: 'leva-02-suspensa', nome: 'Estudo le.vá (suspensa)', zonas: CENARIO_FINAL.zonas, moveis: moveisLeva(ESTANTE_SUSPENSA) },
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
  ...CENARIOS_LEVA,
];
