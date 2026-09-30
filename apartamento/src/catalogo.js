// =====================================================================
// CATÁLOGO DE MÓVEIS — só dados
// =====================================================================
// Cada móvel é um conjunto de formas. As medidas das formas podem ser
// números (cm) ou expressões com L, P e A — a largura, a profundidade e a
// altura do móvel —, além de min() e max(). É isso que deixa o móvel ser
// redimensionado sem distorcer puxadores, pés etc.
//
// Eixos locais do móvel: x de -L/2 a L/2 (esquerda → direita),
// z de -P/2 (fundo/costas) a P/2 (frente), y a partir do piso.
//
// Formas:
//   caixa:  { f:'caixa', x, z, y, l, p, a, r }   x,z = centro; y = base; r = cantos arredondados
//   cil:    { f:'cil', x, z, y, raio, raio2, a, eixo }
//           eixo 'y' (padrão): y = base; raio2 = raio do topo (cone/abajur)
//           eixo 'x' ou 'z': deitado; y = altura do centro
//   esfera: { f:'esfera', x, z, y, raio }        y = base
// Cor da forma: 'principal' (padrão), 'secundaria' ou um código '#rrggbb'.
// Acabamento: tecido, madeira, laca, metal, vidro, tela, pedra (padrão: fosco).
//
// Colisão: 'colide:false' não gera aviso (tapetes). 'grupo' + 'ignora'
// deixam cadeiras entrarem embaixo de mesas sem aviso.
// =====================================================================

const CATALOGO = [
  // ------------------------------------------------------------ QUARTO
  {
    tipo: 'cama_box', nome: 'Cama box', cat: 'Quarto',
    dim: { l: 128, p: 188, a: 60 }, cores: { principal: '#e9e5dd', secundaria: '#7d6b5a' },
    partes: [
      { f: 'caixa', l: 'L', p: 'P', a: 'A*0.5', y: 4, cor: 'secundaria', acab: 'tecido', r: 1.5 },
      { f: 'caixa', l: 'L-6', p: 'P-6', a: 4, y: 0, cor: '#2b2622' },
      { f: 'caixa', l: 'L-1', p: 'P-1', a: 'A*0.5-4', y: 'A*0.5+4', acab: 'tecido', r: 5 },
      { f: 'caixa', l: 'L+1', p: 'P*0.48', a: 4, y: 'A-3', z: 'P*0.26', cor: '#8a9aa6', acab: 'tecido', r: 2 },
      { f: 'caixa', l: 'L*0.42', p: 34, a: 12, x: '-L*0.23', z: '-P/2+22', y: 'A-2', cor: '#f7f5f0', acab: 'tecido', r: 5 },
      { f: 'caixa', l: 'L*0.42', p: 34, a: 12, x: 'L*0.23',  z: '-P/2+22', y: 'A-2', cor: '#f7f5f0', acab: 'tecido', r: 5 },
    ],
  },
  {
    tipo: 'guarda_roupa', nome: 'Guarda-roupa', cat: 'Quarto',
    dim: { l: 160, p: 55, a: 220 }, cores: { principal: '#d8c6ae', secundaria: '#efe9df' },
    partes: [
      { f: 'caixa', l: 'L', p: 'P-2', a: 'A', z: -1, acab: 'madeira' },
      { f: 'caixa', l: 'L/2-1', p: 2, a: 'A-6', x: '-L/4', z: 'P/2-1', y: 3, cor: 'secundaria', acab: 'laca' },
      { f: 'caixa', l: 'L/2-1', p: 2, a: 'A-6', x: 'L/4',  z: 'P/2-1', y: 3, cor: 'secundaria', acab: 'laca' },
      { f: 'cil', raio: 0.8, a: 40, x: -5, z: 'P/2+1', y: 'A*0.42', cor: '#8c8c8c', acab: 'metal' },
      { f: 'cil', raio: 0.8, a: 40, x: 5,  z: 'P/2+1', y: 'A*0.42', cor: '#8c8c8c', acab: 'metal' },
    ],
  },
  {
    tipo: 'criado_mudo', nome: 'Criado-mudo', cat: 'Quarto',
    dim: { l: 45, p: 40, a: 55 }, cores: { principal: '#c9a57c', secundaria: '#efe9df' },
    partes: [
      { f: 'caixa', l: 'L', p: 'P', a: 'A-10', y: 10, acab: 'madeira' },
      { f: 'caixa', l: 'L-4', p: 1, a: 'A*0.32', y: 'A*0.55', z: 'P/2', cor: 'secundaria', acab: 'laca' },
      { f: 'caixa', l: 'L-4', p: 1, a: 'A*0.32', y: 'A*0.2', z: 'P/2', cor: 'secundaria', acab: 'laca' },
      { f: 'cil', raio: 1.5, a: 10, x: '-L/2+4', z: '-P/2+4', cor: '#3a3a3a', acab: 'metal' },
      { f: 'cil', raio: 1.5, a: 10, x: 'L/2-4',  z: '-P/2+4', cor: '#3a3a3a', acab: 'metal' },
      { f: 'cil', raio: 1.5, a: 10, x: '-L/2+4', z: 'P/2-4',  cor: '#3a3a3a', acab: 'metal' },
      { f: 'cil', raio: 1.5, a: 10, x: 'L/2-4',  z: 'P/2-4',  cor: '#3a3a3a', acab: 'metal' },
      { f: 'cil', raio: 7, raio2: 9, a: 22, y: 'A', x: 'L*0.15', z: '-P*0.1', cor: '#f1e6cf', acab: 'tecido' },
    ],
  },

  // ------------------------------------------------------------ SALA
  {
    tipo: 'sofa_chaise', nome: 'Sofá com chaise', cat: 'Sala',
    dim: { l: 205, p: 160, a: 85 }, cores: { principal: '#8e9196', secundaria: '#2b2b2b' },
    partes: [
      // base e pés
      { f: 'caixa', l: 'L-6', p: 84, a: 8, z: '-P/2+45', cor: 'secundaria' },
      { f: 'caixa', l: 'L*0.36-6', p: 'P-96', a: 8, x: '-L/2+L*0.18', z: 45, cor: 'secundaria' },
      { f: 'caixa', l: 'L', p: 90, a: 20, y: 8, z: '-P/2+45', acab: 'tecido', r: 3 },
      { f: 'caixa', l: 'L*0.36', p: 'P-90', a: 20, y: 8, x: '-L/2+L*0.18', z: 45, acab: 'tecido', r: 3 },
      // encosto e braço
      { f: 'caixa', l: 'L', p: 20, a: 'A-8', y: 8, z: '-P/2+10', acab: 'tecido', r: 4 },
      { f: 'caixa', l: 18, p: 90, a: 'A*0.72-8', y: 8, x: 'L/2-9', z: '-P/2+45', acab: 'tecido', r: 5 },
      // assentos
      { f: 'caixa', l: 'L*0.36-2', p: 'P-22', a: 15, y: 28, x: '-L/2+L*0.18', z: 10, acab: 'tecido', r: 5 },
      { f: 'caixa', l: 'L*0.32-10', p: 68, a: 15, y: 28, x: 'L*0.02-4.5', z: '-P/2+55', acab: 'tecido', r: 5 },
      { f: 'caixa', l: 'L*0.32-10', p: 68, a: 15, y: 28, x: 'L*0.34-13.5', z: '-P/2+55', acab: 'tecido', r: 5 },
      // almofadas do encosto
      { f: 'caixa', l: 'L*0.36-4', p: 15, a: 'A-46', y: 42, x: '-L/2+L*0.18', z: '-P/2+27', acab: 'tecido', r: 6 },
      { f: 'caixa', l: 'L*0.32-10', p: 15, a: 'A-46', y: 42, x: 'L*0.02-4.5', z: '-P/2+27', acab: 'tecido', r: 6 },
      { f: 'caixa', l: 'L*0.32-10', p: 15, a: 'A-46', y: 42, x: 'L*0.34-13.5', z: '-P/2+27', acab: 'tecido', r: 6 },
    ],
  },
  {
    tipo: 'sofa', nome: 'Sofá reto', cat: 'Sala',
    dim: { l: 180, p: 90, a: 85 }, cores: { principal: '#8e9196', secundaria: '#2b2b2b' },
    partes: [
      { f: 'caixa', l: 'L-6', p: 'P-6', a: 8, cor: 'secundaria' },
      { f: 'caixa', l: 'L', p: 'P', a: 20, y: 8, acab: 'tecido', r: 3 },
      { f: 'caixa', l: 'L', p: 20, a: 'A-8', y: 8, z: '-P/2+10', acab: 'tecido', r: 4 },
      { f: 'caixa', l: 18, p: 'P', a: 'A*0.72-8', y: 8, x: '-L/2+9', acab: 'tecido', r: 5 },
      { f: 'caixa', l: 18, p: 'P', a: 'A*0.72-8', y: 8, x: 'L/2-9', acab: 'tecido', r: 5 },
      { f: 'caixa', l: '(L-36)/2-1', p: 'P-22', a: 15, y: 28, x: '-(L-36)/4', z: 10, acab: 'tecido', r: 5 },
      { f: 'caixa', l: '(L-36)/2-1', p: 'P-22', a: 15, y: 28, x: '(L-36)/4', z: 10, acab: 'tecido', r: 5 },
    ],
  },
  {
    tipo: 'poltrona', nome: 'Poltrona', cat: 'Sala',
    dim: { l: 75, p: 80, a: 80 }, cores: { principal: '#b9895b', secundaria: '#3a2f27' },
    partes: [
      { f: 'cil', raio: 1.5, a: 14, x: '-L/2+6', z: '-P/2+6', cor: 'secundaria', acab: 'madeira' },
      { f: 'cil', raio: 1.5, a: 14, x: 'L/2-6',  z: '-P/2+6', cor: 'secundaria', acab: 'madeira' },
      { f: 'cil', raio: 1.5, a: 14, x: '-L/2+6', z: 'P/2-6',  cor: 'secundaria', acab: 'madeira' },
      { f: 'cil', raio: 1.5, a: 14, x: 'L/2-6',  z: 'P/2-6',  cor: 'secundaria', acab: 'madeira' },
      { f: 'caixa', l: 'L', p: 'P', a: 16, y: 14, acab: 'tecido', r: 4 },
      { f: 'caixa', l: 'L', p: 16, a: 'A-14', y: 14, z: '-P/2+8', acab: 'tecido', r: 5 },
      { f: 'caixa', l: 12, p: 'P', a: 28, y: 30, x: '-L/2+6', acab: 'tecido', r: 4 },
      { f: 'caixa', l: 12, p: 'P', a: 28, y: 30, x: 'L/2-6', acab: 'tecido', r: 4 },
    ],
  },
  {
    tipo: 'estante_tv', nome: 'Estante divisória com TV', cat: 'Sala',
    dim: { l: 180, p: 35, a: 180 }, cores: { principal: '#c9a57c', secundaria: '#3b3632' },
    partes: [
      { f: 'caixa', l: 'L', p: 'P', a: 8, acab: 'madeira' },
      { f: 'caixa', l: 3, p: 'P', a: 'A', x: '-L/2+1.5', acab: 'madeira' },
      { f: 'caixa', l: 3, p: 'P', a: 'A', x: 'L/2-1.5', acab: 'madeira' },
      { f: 'caixa', l: 'L', p: 'P', a: 3, y: 'A-3', acab: 'madeira' },
      { f: 'caixa', l: 'L-6', p: 'P', a: 3, y: 'A*0.28', acab: 'madeira' },
      { f: 'caixa', l: 'L-6', p: 'P', a: 3, y: 'A*0.78', acab: 'madeira' },
      // painel central que recebe a TV
      { f: 'caixa', l: 'L-6', p: 3, a: 'A*0.5-3', y: 'A*0.28+3', cor: 'secundaria', acab: 'madeira' },
      { f: 'caixa', l: 'min(L*0.68,123)', p: 3, a: 'min(L*0.68,123)*0.57', y: 'A*0.31', z: 3.5, cor: '#0d0d0f', acab: 'tela' },
      // objetos nas prateleiras
      { f: 'caixa', l: 22, p: 18, a: 22, x: '-L/2+20', y: 'A*0.78+3', cor: '#6b7f76', acab: 'tecido' },
      { f: 'caixa', l: 4, p: 20, a: 24, x: 'L/2-14', y: 'A*0.78+3', cor: '#b54a3c' },
      { f: 'caixa', l: 4, p: 20, a: 22, x: 'L/2-18.5', y: 'A*0.78+3', cor: '#2f4a6b' },
      { f: 'caixa', l: 4, p: 20, a: 25, x: 'L/2-23', y: 'A*0.78+3', cor: '#d8c079' },
    ],
  },
  {
    tipo: 'rack_tv', nome: 'Rack', cat: 'Sala',
    dim: { l: 160, p: 40, a: 50 }, cores: { principal: '#c9a57c', secundaria: '#efe9df' },
    partes: [
      { f: 'caixa', l: 'L', p: 'P', a: 'A-12', y: 12, acab: 'madeira' },
      { f: 'caixa', l: 'L/2-3', p: 1, a: 'A-18', y: 15, x: '-L/4', z: 'P/2', cor: 'secundaria', acab: 'laca' },
      { f: 'caixa', l: 'L/2-3', p: 1, a: 'A-18', y: 15, x: 'L/4', z: 'P/2', cor: 'secundaria', acab: 'laca' },
      { f: 'cil', raio: 1.5, a: 12, x: '-L/2+5', z: 0, cor: '#2b2b2b', acab: 'metal' },
      { f: 'cil', raio: 1.5, a: 12, x: 'L/2-5', z: 0, cor: '#2b2b2b', acab: 'metal' },
    ],
  },
  {
    tipo: 'mesa_centro', nome: 'Mesa de centro', cat: 'Sala',
    dim: { l: 90, p: 50, a: 40 }, cores: { principal: '#c9a57c', secundaria: '#2b2b2b' },
    partes: [
      { f: 'caixa', l: 'L', p: 'P', a: 3, y: 'A-3', acab: 'madeira', r: 1 },
      { f: 'caixa', l: 'L-8', p: 'P-8', a: 2, y: 8, acab: 'madeira' },
      { f: 'cil', raio: 1.5, a: 'A-3', x: '-L/2+4', z: '-P/2+4', cor: 'secundaria', acab: 'metal' },
      { f: 'cil', raio: 1.5, a: 'A-3', x: 'L/2-4',  z: '-P/2+4', cor: 'secundaria', acab: 'metal' },
      { f: 'cil', raio: 1.5, a: 'A-3', x: '-L/2+4', z: 'P/2-4',  cor: 'secundaria', acab: 'metal' },
      { f: 'cil', raio: 1.5, a: 'A-3', x: 'L/2-4',  z: 'P/2-4',  cor: 'secundaria', acab: 'metal' },
    ],
  },
  {
    tipo: 'tapete', nome: 'Tapete', cat: 'Sala', colide: false,
    dim: { l: 200, p: 140, a: 1 }, cores: { principal: '#d9d2c5', secundaria: '#b9ae9b' },
    partes: [
      { f: 'caixa', l: 'L', p: 'P', a: 'A', acab: 'tecido' },
      { f: 'caixa', l: 'L-16', p: 'P-16', a: 'A+0.2', cor: 'secundaria', acab: 'tecido' },
      { f: 'caixa', l: 'L-20', p: 'P-20', a: 'A+0.4', acab: 'tecido' },
    ],
  },

  // ------------------------------------------------------------ DIVISÓRIAS
  {
    tipo: 'porta_correr', nome: 'Porta de correr 2 folhas', cat: 'Divisórias',
    dim: { l: 200, p: 8, a: 210 }, cores: { principal: '#3f444a', secundaria: '#d6ecf2' },
    partes: [
      { f: 'caixa', l: 'L', p: 'P', a: 5, y: 'A-5', acab: 'metal' },
      { f: 'caixa', l: 'L', p: 'P', a: 1, acab: 'metal' },
      // folha de trás (esquerda) e folha da frente (direita), sobrepostas no meio
      { f: 'caixa', l: 'L/2+2', p: 1, a: 'A-8', x: '-L/4+1', z: '-P/4', y: 2, cor: 'secundaria', acab: 'vidro' },
      { f: 'caixa', l: 4, p: 3, a: 'A-8', x: '-L/2+2', z: '-P/4', y: 2, acab: 'metal' },
      { f: 'caixa', l: 4, p: 3, a: 'A-8', x: 3, z: '-P/4', y: 2, acab: 'metal' },
      { f: 'caixa', l: 'L/2+2', p: 3, a: 4, x: '-L/4+1', z: '-P/4', y: 2, acab: 'metal' },
      { f: 'caixa', l: 'L/2+2', p: 3, a: 4, x: '-L/4+1', z: '-P/4', y: 'A-10', acab: 'metal' },
      { f: 'caixa', l: 'L/2+2', p: 1, a: 'A-8', x: 'L/4-1', z: 'P/4', y: 2, cor: 'secundaria', acab: 'vidro' },
      { f: 'caixa', l: 4, p: 3, a: 'A-8', x: -3, z: 'P/4', y: 2, acab: 'metal' },
      { f: 'caixa', l: 4, p: 3, a: 'A-8', x: 'L/2-2', z: 'P/4', y: 2, acab: 'metal' },
      { f: 'caixa', l: 'L/2+2', p: 3, a: 4, x: 'L/4-1', z: 'P/4', y: 2, acab: 'metal' },
      { f: 'caixa', l: 'L/2+2', p: 3, a: 4, x: 'L/4-1', z: 'P/4', y: 'A-10', acab: 'metal' },
    ],
  },
  {
    tipo: 'painel_fixo', nome: 'Painel fixo', cat: 'Divisórias',
    dim: { l: 50, p: 5, a: 210 }, cores: { principal: '#3f444a', secundaria: '#d6ecf2' },
    partes: [
      { f: 'caixa', l: 'L-6', p: 1, a: 'A-6', y: 3, cor: 'secundaria', acab: 'vidro' },
      { f: 'caixa', l: 3, p: 'P', a: 'A', x: '-L/2+1.5', acab: 'metal' },
      { f: 'caixa', l: 3, p: 'P', a: 'A', x: 'L/2-1.5', acab: 'metal' },
      { f: 'caixa', l: 'L', p: 'P', a: 3, acab: 'metal' },
      { f: 'caixa', l: 'L', p: 'P', a: 3, y: 'A-3', acab: 'metal' },
    ],
  },

  // ------------------------------------------------------------ MESAS E CADEIRAS
  {
    tipo: 'mesa_jantar', nome: 'Mesa de jantar', cat: 'Mesas e cadeiras', grupo: 'mesa',
    dim: { l: 110, p: 75, a: 76 }, cores: { principal: '#c9a57c', secundaria: '#2b2b2b' },
    partes: [
      { f: 'caixa', l: 'L', p: 'P', a: 3, y: 'A-3', acab: 'madeira', r: 1 },
      { f: 'caixa', l: 5, p: 5, a: 'A-3', x: '-L/2+5', z: '-P/2+5', cor: 'secundaria', acab: 'metal' },
      { f: 'caixa', l: 5, p: 5, a: 'A-3', x: 'L/2-5',  z: '-P/2+5', cor: 'secundaria', acab: 'metal' },
      { f: 'caixa', l: 5, p: 5, a: 'A-3', x: '-L/2+5', z: 'P/2-5',  cor: 'secundaria', acab: 'metal' },
      { f: 'caixa', l: 5, p: 5, a: 'A-3', x: 'L/2-5',  z: 'P/2-5',  cor: 'secundaria', acab: 'metal' },
    ],
  },
  {
    tipo: 'mesa_redonda', nome: 'Mesa redonda', cat: 'Mesas e cadeiras', grupo: 'mesa',
    dim: { l: 90, p: 90, a: 76 }, cores: { principal: '#efe9df', secundaria: '#2b2b2b' },
    partes: [
      { f: 'cil', raio: 'min(L,P)/2', a: 3, y: 'A-3', acab: 'laca' },
      { f: 'cil', raio: 3, a: 'A-3', cor: 'secundaria', acab: 'metal' },
      { f: 'cil', raio: 'min(L,P)*0.25', a: 2, cor: 'secundaria', acab: 'metal' },
    ],
  },
  {
    tipo: 'cadeira', nome: 'Cadeira', cat: 'Mesas e cadeiras', grupo: 'cadeira', ignora: ['mesa'],
    dim: { l: 45, p: 50, a: 90 }, cores: { principal: '#c9a57c', secundaria: '#3a3a3a' },
    partes: [
      { f: 'caixa', l: 'L', p: 'P-4', a: 5, y: 42, z: 2, acab: 'madeira', r: 1.5 },
      { f: 'cil', raio: 1.5, a: 42, x: '-L/2+3', z: '-P/2+4', cor: 'secundaria', acab: 'metal' },
      { f: 'cil', raio: 1.5, a: 42, x: 'L/2-3',  z: '-P/2+4', cor: 'secundaria', acab: 'metal' },
      { f: 'cil', raio: 1.5, a: 42, x: '-L/2+3', z: 'P/2-3',  cor: 'secundaria', acab: 'metal' },
      { f: 'cil', raio: 1.5, a: 42, x: 'L/2-3',  z: 'P/2-3',  cor: 'secundaria', acab: 'metal' },
      { f: 'caixa', l: 3, p: 3, a: 'A-47', y: 47, x: '-L/2+3', z: '-P/2+2', cor: 'secundaria', acab: 'metal' },
      { f: 'caixa', l: 3, p: 3, a: 'A-47', y: 47, x: 'L/2-3',  z: '-P/2+2', cor: 'secundaria', acab: 'metal' },
      { f: 'caixa', l: 'L-2', p: 3, a: 22, y: 'A-24', z: '-P/2+2', acab: 'madeira', r: 1 },
    ],
  },
  {
    tipo: 'mesa_computador', nome: 'Mesa de computador', cat: 'Mesas e cadeiras', grupo: 'mesa',
    dim: { l: 140, p: 70, a: 75 }, cores: { principal: '#efe9df', secundaria: '#2b2b2b' },
    partes: [
      { f: 'caixa', l: 'L', p: 'P', a: 3, y: 'A-3', acab: 'laca', r: 0.8 },
      { f: 'caixa', l: 4, p: 'P-6', a: 'A-3', x: '-L/2+4', cor: 'secundaria', acab: 'metal' },
      { f: 'caixa', l: 4, p: 'P-6', a: 'A-3', x: 'L/2-4', cor: 'secundaria', acab: 'metal' },
      { f: 'caixa', l: 'L-12', p: 2, a: 20, y: 'A-25', z: '-P/2+6', cor: 'secundaria', acab: 'metal' },
      // monitor, suporte e teclado
      { f: 'caixa', l: 20, p: 16, a: 1, y: 'A', z: '-P/2+14', cor: '#1d1d1f', acab: 'metal' },
      { f: 'caixa', l: 5, p: 2, a: 14, y: 'A', z: '-P/2+10', cor: '#1d1d1f', acab: 'metal' },
      { f: 'caixa', l: 'min(62, L*0.6)', p: 2.5, a: 'min(62, L*0.6)*0.58', y: 'A+10', z: '-P/2+12', cor: '#0d0d0f', acab: 'tela' },
      { f: 'caixa', l: 42, p: 13, a: 1.5, y: 'A', z: 'P/2-22', cor: '#3a3a3c' },
      { f: 'caixa', l: 7, p: 11, a: 2, y: 'A', x: 30, z: 'P/2-22', cor: '#3a3a3c' },
    ],
  },
  {
    tipo: 'cadeira_escritorio', nome: 'Cadeira de escritório', cat: 'Mesas e cadeiras', grupo: 'cadeira', ignora: ['mesa'],
    dim: { l: 60, p: 60, a: 100 }, cores: { principal: '#2f3237', secundaria: '#1b1b1b' },
    partes: [
      { f: 'cil', raio: 'min(L,P)*0.45', raio2: 'min(L,P)*0.12', a: 6, y: 2, cor: 'secundaria', acab: 'metal' },
      { f: 'cil', raio: 2.5, a: 36, y: 8, cor: '#9a9a9a', acab: 'metal' },
      { f: 'caixa', l: 'L*0.82', p: 'P*0.8', a: 8, y: 44, z: 'P*0.05', acab: 'tecido', r: 3 },
      { f: 'caixa', l: 'L*0.74', p: 5, a: 'A-58', y: 56, z: '-P*0.36', acab: 'tecido', r: 2.5 },
      { f: 'caixa', l: 4, p: 'P*0.4', a: 3, y: 62, x: '-L*0.4', cor: 'secundaria' },
      { f: 'caixa', l: 4, p: 'P*0.4', a: 3, y: 62, x: 'L*0.4', cor: 'secundaria' },
    ],
  },

  // ------------------------------------------------------------ COZINHA
  {
    tipo: 'bancada_cozinha', nome: 'Bancada com cuba e cooktop', cat: 'Cozinha',
    dim: { l: 224, p: 60, a: 90 }, cores: { principal: '#f2f0ec', secundaria: '#35363a' },
    partes: [
      { f: 'caixa', l: 'L', p: 'P-6', a: 10, y: 0, z: -5, cor: '#2b2b2b' },
      { f: 'caixa', l: 'L', p: 'P-4', a: 'A-14', y: 10, z: -2, acab: 'laca' },
      { f: 'caixa', l: 0.6, p: 1, a: 'A-16', y: 11, x: '-L/4', z: 'P/2-3.5', cor: '#b9b6b0' },
      { f: 'caixa', l: 0.6, p: 1, a: 'A-16', y: 11, x: 0, z: 'P/2-3.5', cor: '#b9b6b0' },
      { f: 'caixa', l: 0.6, p: 1, a: 'A-16', y: 11, x: 'L/4', z: 'P/2-3.5', cor: '#b9b6b0' },
      { f: 'caixa', l: 'L', p: 'P', a: 4, y: 'A-4', cor: 'secundaria', acab: 'pedra' },
      // cuba 48x38 perto do início, cooktop 58x50 perto do fim
      { f: 'caixa', l: 48, p: 38, a: 0.6, y: 'A', x: '-L/2+45', z: -1, cor: '#b9bdc2', acab: 'metal' },
      { f: 'caixa', l: 43, p: 33, a: 0.8, y: 'A', x: '-L/2+45', z: -1, cor: '#6f7378', acab: 'metal' },
      { f: 'cil', raio: 1.3, a: 28, y: 'A', x: '-L/2+45', z: '-P/2+5', cor: '#c9cdd2', acab: 'metal' },
      { f: 'cil', raio: 1, a: 18, eixo: 'z', y: 'A+27', x: '-L/2+45', z: '-P/2+13', cor: '#c9cdd2', acab: 'metal' },
      { f: 'caixa', l: 58, p: 50, a: 0.8, y: 'A', x: 'L/2-48', cor: '#0e0e10', acab: 'vidro' },
      { f: 'cil', raio: 6, a: 1, y: 'A', x: 'L/2-62', z: -11, cor: '#2c2c2e', acab: 'metal' },
      { f: 'cil', raio: 6, a: 1, y: 'A', x: 'L/2-34', z: -11, cor: '#2c2c2e', acab: 'metal' },
      { f: 'cil', raio: 5, a: 1, y: 'A', x: 'L/2-62', z: 11, cor: '#2c2c2e', acab: 'metal' },
      { f: 'cil', raio: 5, a: 1, y: 'A', x: 'L/2-34', z: 11, cor: '#2c2c2e', acab: 'metal' },
    ],
  },
  {
    tipo: 'geladeira', nome: 'Geladeira', cat: 'Cozinha',
    dim: { l: 70, p: 70, a: 185 }, cores: { principal: '#d9dcdf', secundaria: '#8a8e93' },
    partes: [
      { f: 'caixa', l: 'L', p: 'P-4', a: 'A', z: -2, acab: 'metal', r: 1.5 },
      { f: 'caixa', l: 'L-1', p: 4, a: 'A*0.66-1', y: 1, z: 'P/2-2', acab: 'metal', r: 1 },
      { f: 'caixa', l: 'L-1', p: 4, a: 'A*0.34-1', y: 'A*0.66+0.5', z: 'P/2-2', acab: 'metal', r: 1 },
      { f: 'caixa', l: 2, p: 3, a: 40, y: 'A*0.66-50', x: 'L/2-6', z: 'P/2+1', cor: 'secundaria', acab: 'metal' },
      { f: 'caixa', l: 2, p: 3, a: 30, y: 'A*0.66+8', x: 'L/2-6', z: 'P/2+1', cor: 'secundaria', acab: 'metal' },
    ],
  },
  {
    tipo: 'armario_aereo', nome: 'Armário aéreo', cat: 'Cozinha', colide: false,
    dim: { l: 120, p: 35, a: 70 }, cores: { principal: '#f2f0ec', secundaria: '#b9b6b0' },
    partes: [
      { f: 'caixa', l: 'L', p: 'P', a: 'A', y: 150, acab: 'laca' },
      { f: 'caixa', l: 0.6, p: 1, a: 'A-2', y: 151, z: 'P/2', cor: 'secundaria' },
    ],
  },

  // ------------------------------------------------------------ BANHEIRO
  {
    tipo: 'box_banho', nome: 'Box', cat: 'Banheiro', colide: false,
    dim: { l: 110, p: 84, a: 200 }, cores: { principal: '#e8e6e1', secundaria: '#aeb3b8' },
    partes: [
      { f: 'caixa', l: 'L', p: 'P', a: 3, acab: 'pedra' },
      { f: 'caixa', l: 'L', p: 1, a: 'A-3', y: 3, z: 'P/2-0.5', cor: '#cfe6ee', acab: 'vidro' },
      { f: 'caixa', l: 'L', p: 2, a: 2, y: 'A-2', z: 'P/2-1', cor: 'secundaria', acab: 'metal' },
      { f: 'cil', raio: 10, raio2: 10, a: 1.5, y: 'A+10', z: '-P/2+22', cor: 'secundaria', acab: 'metal' },
      { f: 'cil', raio: 1, a: 22, eixo: 'z', y: 'A+12', z: '-P/2+11', cor: 'secundaria', acab: 'metal' },
    ],
  },
  {
    tipo: 'vaso', nome: 'Vaso sanitário', cat: 'Banheiro',
    dim: { l: 38, p: 65, a: 75 }, cores: { principal: '#f7f7f5', secundaria: '#dcdcd8' },
    partes: [
      { f: 'caixa', l: 'L*0.6', p: 'P*0.55', a: 30, z: 'P*0.1', acab: 'laca', r: 6 },
      { f: 'caixa', l: 'L', p: 'P*0.72', a: 10, y: 30, z: 'P*0.14', acab: 'laca', r: 9 },
      { f: 'caixa', l: 'L', p: 'P*0.26', a: 'A-30', y: 30, z: '-P/2+P*0.13', acab: 'laca', r: 3 },
    ],
  },
  {
    tipo: 'lavatorio', nome: 'Lavatório com gabinete', cat: 'Banheiro',
    dim: { l: 50, p: 40, a: 85 }, cores: { principal: '#c9a57c', secundaria: '#f7f7f5' },
    partes: [
      { f: 'caixa', l: 'L', p: 'P', a: 'A-15', y: 15, acab: 'madeira' },
      { f: 'caixa', l: 'L', p: 'P', a: 3, y: 'A-3', cor: 'secundaria', acab: 'laca' },
      { f: 'caixa', l: 'L*0.6', p: 'P*0.55', a: 0.8, y: 'A', cor: '#e2e2de', acab: 'laca' },
      { f: 'cil', raio: 1, a: 18, y: 'A', z: '-P/2+5', cor: '#c9cdd2', acab: 'metal' },
      { f: 'caixa', l: 'L', p: 2, a: 70, y: 'A+25', z: '-P/2+1', cor: '#dfe9ee', acab: 'vidro' },
    ],
  },

  // ------------------------------------------------------------ DIVERSOS
  {
    tipo: 'planta', nome: 'Vaso com planta', cat: 'Diversos',
    dim: { l: 40, p: 40, a: 120 }, cores: { principal: '#4f7a4a', secundaria: '#d9d2c5' },
    partes: [
      { f: 'cil', raio: 'min(L,P)*0.32', raio2: 'min(L,P)*0.4', a: 'A*0.3', cor: 'secundaria', acab: 'pedra' },
      { f: 'esfera', raio: 'min(L,P)*0.5', y: 'A*0.35', acab: 'tecido' },
      { f: 'esfera', raio: 'min(L,P)*0.38', y: 'A*0.62', x: 'L*0.08', acab: 'tecido' },
    ],
  },
  {
    tipo: 'luminaria', nome: 'Luminária de piso', cat: 'Diversos',
    dim: { l: 40, p: 40, a: 160 }, cores: { principal: '#f1e6cf', secundaria: '#2b2b2b' },
    partes: [
      { f: 'cil', raio: 'min(L,P)*0.4', a: 2, cor: 'secundaria', acab: 'metal' },
      { f: 'cil', raio: 1, a: 'A-30', y: 2, cor: 'secundaria', acab: 'metal' },
      { f: 'cil', raio: 'min(L,P)*0.5', raio2: 'min(L,P)*0.35', a: 30, y: 'A-30', acab: 'tecido' },
    ],
  },
  {
    tipo: 'caixa', nome: 'Caixa genérica', cat: 'Diversos',
    dim: { l: 60, p: 60, a: 60 }, cores: { principal: '#c8ccd2', secundaria: '#9aa0a8' },
    partes: [{ f: 'caixa', l: 'L', p: 'P', a: 'A' }],
  },
  {
    tipo: 'cilindro', nome: 'Cilindro genérico', cat: 'Diversos',
    dim: { l: 50, p: 50, a: 50 }, cores: { principal: '#c8ccd2', secundaria: '#9aa0a8' },
    partes: [{ f: 'cil', raio: 'min(L,P)/2', a: 'A' }],
  },
];
