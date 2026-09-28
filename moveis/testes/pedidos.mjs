// O que o morador pediu para as ideias de layout (rodada 3). Rodar: node moveis/testes/pedidos.mjs
import { abrir, verificar } from './harness.mjs';
const t = await abrir();
const { noApp } = t;
const r = await noApp(() => IDEIAS.map(ideia => {
  const l = ideia.itens(), acha = f => l.filter(f);
  const b = it => caixa(itemPoly(it));
  const fog = acha(i => i.tipo === 'fogao')[0], gel = acha(i => i.tipo === 'geladeira')[0];
  const cama = acha(i => i.tipo === 'cama')[0], bc = b(cama);
  const lados = [bc.x1, (() => { let m = Infinity; for (const o of l) { if (o === cama || ambienteDe(o) !== 'DORMITÓRIO 01') continue; const c = b(o); if (c.y2 > bc.y1 + 45 && c.y1 < bc.y2 && c.x1 >= bc.x2 - 0.5) m = Math.min(m, c.x1 - bc.x2); } return Math.min(m, 300 - bc.x2); })()];
  return {
    id: ideia.id,
    planta: acha(i => i.tipo === 'planta').length,
    pc: acha(i => i.tipo === 'escritorio').length, cadEsc: acha(i => /escritório/.test(i.nome)).length,
    esticar: acha(i => i.tipo === 'chaise' || i.retratil || i.tipo === 'puff').length,
    sofa: acha(i => i.tipo === 'sofa' || i.tipo === 'chaise').map(i => i.nome),
    tv: acha(i => i.tipo === 'tv').map(i => [i.estilo, i.w, i.h, i.tela]),
    fogao: fog ? b(fog) : FIXOS.find(f => f.nome === 'Fogão'), geladeira: gel ? b(gel) : FIXOS.find(f => f.nome === 'Geladeira'), cozinhaSolta: !!(fog || gel),
    correr: acha(i => i.tipo === 'armario').every(i => i.correr),
    lados, cama: cama.nome
  };
}));
for (const x of r) {
  verificar(x.planta === 0, `${x.id}: sem vaso de planta`);
  verificar(x.pc === 1 && x.cadEsc === 1, `${x.id}: mesa de computador e cadeira de escritório`);
  verificar(x.esticar >= 1, `${x.id}: sofá com chaise, retrátil ou puff (${x.sofa})`);
  verificar(x.tv.length === 1 && x.tv[0][1] >= 40 && x.tv[0][2] >= 40, `${x.id}: TV em cima de um móvel de verdade ${JSON.stringify(x.tv)}`);
  verificar(x.fogao.y2 === 145 && x.fogao.x2 === 420, `${x.id}: fogão encostado em cima da bancada ${JSON.stringify(x.fogao)}`);
  verificar(x.geladeira.y1 === 265 && x.geladeira.x2 === 420, `${x.id}: geladeira encostada embaixo da bancada ${JSON.stringify(x.geladeira)}`);
  verificar(!x.cozinhaSolta, `${x.id}: geladeira e fogão são fixos (não repetidos como móveis)`);
  verificar(x.correr, `${x.id}: guarda-roupa de portas de correr`);
  verificar(x.cama === 'Cama box viúvo 128 × 188' && x.lados.every(v => v >= 55), `${x.id}: cama de viúvo com os dois lados livres (${x.lados.map(Math.round).join(' e ')} cm)`);
}
const lugares = r.map(x => x.sofa.join(' ')).join(' | ');
verificar(/2 lugares/.test(lugares) && /3 lugares/.test(lugares), 'há opções com sofá de 2 e de 3 lugares: ' + lugares);
// banheiro
const banho = await noApp(() => ({ bancada: OBST_FIXOS.some(o => o.nome === 'bancada do banheiro'), livre: pisoLivreBanho(), rotulo: [...document.querySelectorAll('#planta text')].map(e => e.textContent).filter(tx => /BOX|livre|vidro|65 × 42/.test(tx)) }));
verificar(banho.bancada, 'bancada do banheiro entra na colisão');
verificar(banho.livre > 0.8 && banho.livre < 1.6, 'piso livre do banheiro calculado: ' + banho.livre + ' m²');
verificar(banho.rotulo.length >= 4, 'planta mostra box, vidro, bancada e piso livre: ' + banho.rotulo.join(' | '));
// cadeiras começam guardadas debaixo da mesa e isso não conta como batida
const guardadas = await noApp(() => IDEIAS.map(i => { const l = i.itens(); return l.filter(c => c.tipo === 'cadeira').every(c => l.some(m => MESAS.has(m.tipo) && itemPartes(c).some(pc => itemPartes(m).some(pm => colide(pc, pm))))); }));
verificar(guardadas.every(Boolean), 'em todas as opções as cadeiras começam guardadas debaixo da mesa: ' + guardadas);
// abas: uma por opção, um toque troca
const abas = await t.page.locator('#abas .aba').count();
verificar(abas >= 4, 'abas no topo com as opções: ' + abas);
await t.page.click('#abas .aba >> nth=2');
verificar((await noApp(() => layout().ideia)) === 'office-grande' && (await t.page.textContent('#legenda')).includes('140 × 70'), 'tocar na 3ª aba abre a opção 3 com o resumo');
// opção salva numa versão anterior não é reaproveitada: vira "versão antiga" e a atual é recriada
const sinc = await noApp(() => { const s = { layouts: [{ id: 'x', nome: 'Canto alemão na janela e sofá de 3', ideia: 'alemao', itens: [] }, { id: 'y', nome: 'TV no meio', ideia: 'meio', itens: [] }] }; sincronizarIdeias(s); return s.layouts.map(l => [l.nome, l.ideia || '', l.itens.length]); });
verificar(sinc.filter(l => l[1]).length === 4 && sinc.some(l => /versão antiga/.test(l[0]) && !l[1]) && sinc.find(l => l[1] === 'alemao')[2] > 5, 'opções antigas viram "versão antiga" e as atuais são recriadas: ' + JSON.stringify(sinc));
// geladeira/fogão soltos de versões anteriores saem dos layouts salvos
const mig2 = await noApp(() => { localStorage.setItem(CHAVE, JSON.stringify({ layouts: [{ id: 'z', nome: 'Antigo', itens: [{ tipo: 'geladeira', nome: 'Geladeira', w: 70, h: 75, x: 100, y: 100 }, { tipo: 'sofa', nome: 'Sofá', w: 160, h: 90, x: 100, y: 300 }] }], atual: 'z' })); carregar(); const l = estado.layouts.find(l => l.id === 'z'); return l.itens.map(i => i.tipo); });
verificar(mig2.join() === 'sofa', 'geladeira solta de layout antigo é removida (a fixa fica na planta): ' + mig2);
// TV antiga (só a tela) vira móvel ao carregar
const mig = await noApp(() => { const it = limparItem({ tipo: 'tv', nome: 'TV antiga', w: 123, h: 8, x: 100, y: 100, base: 20 }); return [it.tela, it.estilo, !!it._migrar]; });
verificar(mig[0] === 123 && mig[1] === 'giratorio' && mig[2], 'TV da versão anterior é convertida para móvel giratório');
verificar(t.erros.length === 0, 'sem erros: ' + t.erros.join(' | '));
await t.fechar();
