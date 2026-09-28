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
    bancada: FIXOS.find(f => f.nome === 'Bancada da pia'), cooktop: COZINHA.cooktop, geladeira: FIXOS.find(f => f.nome === 'Geladeira'), cozinhaSolta: !!(fog || gel),
    canto: acha(i => i.tipo === 'cantoL' || i.tipo === 'bancoEnc' || i.tipo === 'banco').length > 0,
    divisoria: acha(i => i.tipo === 'tv' && i.estilo === 'divisoria').length === 1,
    correr: acha(i => i.tipo === 'armario').every(i => i.correr),
    lados, cama: cama.nome
  };
}));
for (const x of r) {
  verificar(x.planta === 0, `${x.id}: sem vaso de planta`);
  verificar(x.pc === 1 && x.cadEsc === 1, `${x.id}: mesa de computador e cadeira de escritório`);
  verificar(x.esticar >= 1, `${x.id}: sofá com chaise, retrátil ou puff (${x.sofa})`);
  verificar(x.tv.length === 1 && x.tv[0][1] >= 40 && x.tv[0][2] >= 40, `${x.id}: TV em cima de um móvel de verdade ${JSON.stringify(x.tv)}`);
  verificar(x.bancada.y1 === 46 && x.cooktop.y2 < 130 && x.cooktop.y1 >= x.bancada.y1, `${x.id}: bancada comprida desde a shaft, com cooktop embutido na ponta de cima ${JSON.stringify([x.bancada, x.cooktop])}`);
  verificar(x.geladeira.y1 - x.bancada.y2 >= 3 && 420 - x.geladeira.x2 >= 3 && x.geladeira.y2 < 352, `${x.id}: geladeira perto da entrada com folga da bancada e da parede ${JSON.stringify(x.geladeira)}`);
  verificar(!x.canto, `${x.id}: sem canto alemão, só cadeiras soltas`);
  verificar(x.divisoria, `${x.id}: estante divisória com TV que gira 360°`);
  verificar(!x.cozinhaSolta, `${x.id}: geladeira e fogão são fixos (não repetidos como móveis)`);
  verificar(x.correr, `${x.id}: guarda-roupa de portas de correr`);
  verificar(x.cama === 'Cama box viúvo 128 × 188' && x.lados.every(v => v >= 55), `${x.id}: cama de viúvo com os dois lados livres (${x.lados.map(Math.round).join(' e ')} cm)`);
}
// rodada 4: tudo em uso ao mesmo tempo (TV girando, cadeiras puxadas, portas abertas) sem nada se encontrar
const emUso = await noApp(() => IDEIAS.map(ideia => { const l = ideia.itens(), u = calcularUso(l);
  return [ideia.id, l.flatMap(i => (u.get(i.id) || []).map(p => `${i.nome}: ${p.zona} × ${p.com.join('/')}`)).concat(u.fixos.map(p => p.zona || String(p)))]; }));
for (const [id, probs] of emUso) verificar(probs.length === 0, `${id}: TV girando, cadeiras puxadas e portas abertas não se encontram ${probs.join(' | ')}`);
// a cadeira puxada que alcança outra mesa (não a própria) conta
const outraMesa = await noApp(() => { const m = mk('escritorio', 'Mesa de computador 120 × 60', 120, 60, 0, 100), g = uid();
  const mesa = mk('mesa', 'Mesa 80 × 70', 80, 70, 150, 100, 0, { grupo: g }), c = mk('cadeira', 'Cadeira', 45, 50, 125, 110, 270, { grupo: g });
  return (calcularUso([m, mesa, c]).get(c.id) || []).some(p => p.com.includes(m.nome)); });
verificar(outraMesa, 'cadeira puxada contra a mesa do computador é apontada');
// rodada 5: forno embaixo do cooktop e quem cozinha na frente da bancada
const forno = await noApp(() => { const g = uid(), mesa = mk('mesa', 'Mesa 80 × 70', 80, 70, 195, 50, 0, { grupo: g }), c = mk('cadeira', 'Cadeira', 45, 50, 250, 60, 90, { grupo: g });
  const u = calcularUso([mesa, c]); return { zonas: usoFixo(1).map(z => z.nome), cadeira: (u.get(c.id) || []).map(p => p.zona) }; });
verificar(forno.zonas.includes('porta do forno') && forno.zonas.includes('frente da bancada'), 'cozinha tem porta do forno e frente da bancada: ' + forno.zonas);
verificar(forno.cadeira.some(z => /forno/.test(z)), 'cadeira puxada na frente do forno é apontada: ' + forno.cadeira);
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
const fundo = await noApp(() => IDEIAS.flatMap(i => { const l = i.itens(); return l.filter(c => c.tipo === 'cadeira').map(c => { const m = l.find(m => MESAS.has(m.tipo) && itemPartes(c).some(pc => itemPartes(m).some(pm => colide(pc, pm)))); const a = caixa(itemPoly(c)), b = caixa(itemPoly(m)); return Math.round(Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1) < Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1) ? Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1) : Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1)); }); }));
verificar(fundo.every(v => v >= 10) && fundo.filter(v => v >= 20).length >= fundo.length - 2, 'cadeiras guardadas para dentro da mesa (as de cabeceira da mesa na janela, 10 cm): ' + fundo.join(','));
// abas: uma por opção, um toque troca
const abas = await t.page.locator('#abas .aba').count();
verificar(abas >= 4, 'abas no topo com as opções: ' + abas);
await t.page.click('#abas .aba >> nth=2');
verificar((await noApp(() => layout().ideia)) === 'office-grande' && (await t.page.textContent('#legenda')).includes('140 × 70'), 'tocar na 3ª aba abre a opção 3 com o resumo');
// opção salva numa versão anterior não é reaproveitada: vira "versão antiga" e a atual é recriada
const sinc = await noApp(() => { const s = { layouts: [{ id: 'x', nome: 'Canto alemão na janela e sofá de 3', ideia: 'alemao', itens: [] }, { id: 'y', nome: 'TV no meio', ideia: 'meio', itens: [] }] }; sincronizarIdeias(s); return s.layouts.map(l => [l.nome, l.ideia || '', l.itens.length]); });
verificar(sinc.filter(l => l[1]).length === 4 && sinc.some(l => /versão antiga/.test(l[0]) && !l[1]) && sinc.find(l => l[1] === 'office-janela')[2] > 5, 'opções antigas viram "versão antiga" e as atuais são recriadas: ' + JSON.stringify(sinc));
// geladeira/fogão soltos de versões anteriores saem dos layouts salvos
const mig2 = await noApp(() => { localStorage.setItem(CHAVE, JSON.stringify({ layouts: [{ id: 'z', nome: 'Antigo', itens: [{ tipo: 'geladeira', nome: 'Geladeira', w: 70, h: 75, x: 100, y: 100 }, { tipo: 'sofa', nome: 'Sofá', w: 160, h: 90, x: 100, y: 300 }] }], atual: 'z' })); carregar(); const l = estado.layouts.find(l => l.id === 'z'); return l.itens.map(i => i.tipo); });
verificar(mig2.join() === 'sofa', 'geladeira solta de layout antigo é removida (a fixa fica na planta): ' + mig2);
// quem estava no "Layout 1" antigo abre na Opção 1, e os antigos não aparecem nas abas
const velho = await noApp(() => { localStorage.setItem(CHAVE, JSON.stringify({ layouts: [{ id: 'v', nome: 'Layout 1', itens: [{ tipo: 'planta', nome: 'Vaso de planta', w: 45, h: 45, x: 350, y: 30 }] }], atual: 'v' })); carregar(); preencherLayouts(); return { atual: layout().ideia, abas: [...document.querySelectorAll('#abas .aba')].map(b => b.textContent) }; });
verificar(velho.atual === 'office-janela' && !velho.abas.some(a => /Layout 1/.test(a)), 'layout antigo sai das abas e o app abre na Opção 1: ' + JSON.stringify(velho));
// trocar geladeira e fogão pelo menu
const troca = await noApp(() => { aplicarCozinha('gel-cima'); const r = [FIXOS.find(f => f.nome === 'Geladeira').y1, COZINHA.cooktop.y1]; aplicarCozinha('fogao-cima'); return r; });
verificar(troca[0] < 60 && troca[1] > 270, 'botão do menu inverte geladeira e cooktop: ' + troca);
// TV antiga (só a tela) vira móvel ao carregar
const mig = await noApp(() => { const it = limparItem({ tipo: 'tv', nome: 'TV antiga', w: 123, h: 8, x: 100, y: 100, base: 20 }); return [it.tela, it.estilo, !!it._migrar]; });
verificar(mig[0] === 123 && mig[1] === 'giratorio' && mig[2], 'TV da versão anterior é convertida para móvel giratório');
verificar(t.erros.length === 0, 'sem erros: ' + t.erros.join(' | '));
await t.fechar();
