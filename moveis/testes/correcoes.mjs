// Cenários das correções vindas da auditoria (geometria e toque).
// Rodar: node moveis/testes/correcoes.mjs
import { abrir, verificar } from './harness.mjs';

{
  const t = await abrir();
  const { page, noApp } = t;
  const limpar = () => noApp(() => { layout().itens = []; sel = null; confirmar(); render(); });

  // 1. fundo do assento redesenha o L
  await limpar();
  await page.click('#fab'); await page.click('text=Canto alemão 1,20 × 1,20');
  const d0 = await noApp(() => nosMoveis.get(sel).g.querySelector('.corpo').getAttribute('d'));
  await page.fill('#pP', '70'); await page.dispatchEvent('#pP', 'input'); await page.dispatchEvent('#pP', 'change');
  const d1 = await noApp(() => nosMoveis.get(sel).g.querySelector('.corpo').getAttribute('d'));
  verificar(d0 !== d1 && d1.includes('V10H10'), 'mudar o fundo do assento redesenha o L: ' + d1);

  // 2. cotas do L medem do braço, não da caixa
  await noApp(() => { layout().itens = [mk('cantoL', 'L', 150, 120, 0, 0, 0, { p: 50 }), mk('banco', 'Banco', 100, 35, 55, 125)]; sel = itens()[0].id; confirmar(); render(); });
  let cotas = await noApp(() => calcularCotas(pegar(sel)).map(c => [c.lado, Math.round(c.gap), Math.round(c.x1), Math.round(c.y1)]));
  console.log('cotas L:', JSON.stringify(cotas));
  verificar(cotas.some(c => c[0] === 'b' && c[1] === 75), 'cota de baixo do L até o banco é 75 (do braço 1)');
  verificar(!cotas.some(c => c[0] === 'b' && c[1] === 5), 'não há cota fantasma de 5 cm no vão do L');

  // 3. cotas de móvel a 45°
  await noApp(() => { const m = mk('mesa', 'Mesa', 100, 60, 0, 0); m.x = 200; m.y = 200; m.rot = 45; layout().itens = [m, mk('cadeira', 'Cadeira', 45, 50, 260, 140)]; sel = m.id; confirmar(); render(); });
  cotas = await noApp(() => calcularCotas(pegar(sel)).map(c => [c.lado, Math.round(c.gap * 10) / 10]));
  console.log('cotas 45°:', JSON.stringify(cotas));
  verificar(cotas.some(c => c[0] === 'd' && c[1] > 27 && c[1] < 30), 'cota da mesa a 45° até a cadeira é ~28 cm, não 3');

  // 4. alça de redim do L na ponta do braço 1
  await noApp(() => { layout().itens = [mk('cantoL', 'L', 120, 120, 100, 100, 0, { p: 50 })]; sel = itens()[0].id; confirmar(); render(); });
  const pr = await noApp(() => cantoRedim(pegar(sel)));
  verificar(pr[0] === 220 && pr[1] === 100, 'alça de redim do L fica na ponta do braço 1: ' + pr);
  // redimensionar pela alça mantém a ponta do braço 2 fixa
  {
    const k = await noApp(() => view.k);
    const a = await page.locator('[data-handle=redim] .bola').boundingBox();
    await t.arrastar(a.x + a.width / 2, a.y + a.height / 2, a.x + a.width / 2 + 30 / k, a.y + a.height / 2 - 20 / k);
    const it = await noApp(() => { const i = pegar(sel); return [i.w, i.h, caixa(itemPoly(i))]; });
    console.log('redim L:', JSON.stringify(it));
    verificar(it[0] === 150 && it[1] === 140 && it[2].x1 === 100 && it[2].y2 === 220, 'redim do L: braço 1 cresce para a direita, braço 2 para cima, ponta do braço 2 fixa');
  }

  // 5. alça de girar gira o conjunto inteiro
  await limpar();
  await page.click('#fab'); await page.click('text=Canto 1,20 × 1,20 + mesa 80 × 70');
  {
    const rots0 = await noApp(() => membros(pegar(sel)).map(m => m.rot));
    const a = await page.locator('[data-handle=girar] .bola').boundingBox();
    const c = await t.centroMovel(await noApp(() => sel));
    await t.arrastar(a.x + a.width / 2, a.y + a.height / 2, c.x + 200, c.y);
    const rots1 = await noApp(() => membros(pegar(sel)).map(m => m.rot));
    const deltas = rots1.map((r, i) => ((r - rots0[i]) % 360 + 360) % 360);
    console.log('girar conjunto:', rots0, '->', rots1);
    verificar(deltas.every(d => d === deltas[0]) && deltas[0] === 90, 'girar pela alça gira todas as peças do conjunto por 90°');
    const entreSi = await noApp(() => { const ms = membros(pegar(sel)); return ms.some(m => conflitos.get(m.id).duro.some(n => ms.some(o => o.nome === n))); });
    verificar(!entreSi, 'peças do conjunto girado não batem entre si');
  }

  // 6. ímã do conjunto olha todas as peças
  {
    const r = await noApp(() => {
      const mesa = membros(pegar(sel)).find(m => m.tipo === 'mesa'), L = membros(pegar(sel)).find(m => m.tipo === 'cantoL');
      view.k = 1;
      const bL = caixa(itemPoly(L));
      const alvoX = mesa.x + (-3 - bL.x1); // leva o braço esquerdo do L a x=-3
      const [nx, ny] = encaixar(mesa, alvoX, mesa.y);
      moverJunto(mesa, nx - mesa.x, ny - mesa.y); render();
      return caixa(itemPoly(L)).x1;
    });
    verificar(Math.abs(r) < 0.01, 'ímã ao arrastar pela mesa gruda o L na parede (x1=0): ' + r);
  }

  // 7. círculos: sobreposição de 2 cm é detectada
  await noApp(() => { const a = mk('redondo', 'Mesa Ø120', 120, 120, 100, 100); const b = mk('redondo', 'Mesa Ø120', 120, 120, 100, 100); b.x = a.x + 118.06 * Math.cos(9 * Math.PI / 180); b.y = a.y + 118.06 * Math.sin(9 * Math.PI / 180); layout().itens = [a, b]; sel = null; confirmar(); render(); });
  verificar((await t.status()).includes('batendo'), 'duas mesas redondas sobrepostas 2 cm acusam batida');
  await noApp(() => { const a = mk('redondo', 'Mesa Ø120', 120, 120, 100, 100); const b = mk('redondo', 'Mesa Ø120', 120, 120, 220, 100); layout().itens = [a, b]; confirmar(); render(); });
  verificar((await t.status()).includes('tudo cabe'), 'duas mesas redondas encostadas não acusam batida');

  // 8. móvel no vão da porta
  await noApp(() => { layout().itens = [mk('generico', 'Régua', 60, 10, 230, 450)]; sel = null; confirmar(); render(); });
  verificar((await t.status()).includes('na porta'), 'móvel dentro do vão da porta do dormitório é avisado');

  // 9. adicionar com a vista longe da planta
  await noApp(() => { layout().itens = []; view.x = -3000; aplicarVista(); });
  await page.click('#fab'); await page.click('#catalogo >> text=Sofá 3 lugares');
  const bs = await noApp(() => caixa(itemPoly(pegar(sel))));
  verificar(bs.x1 >= 0 && bs.x2 <= 420, 'sofá adicionado com a vista fora da planta nasce dentro: ' + JSON.stringify(bs));
  await noApp(() => ajustar());

  // 10. girar 90 a partir de 45
  await noApp(() => { pegar(sel).rot = 45; render(); });
  await page.click('#pGirarD'); verificar((await noApp(() => pegar(sel).rot)) === 90, 'de 45°, ↻ vai para 90°');
  await noApp(() => { pegar(sel).rot = 45; render(); });
  await page.click('#pGirarE'); verificar((await noApp(() => pegar(sel).rot)) === 0, 'de 45°, ↺ vai para 0°');

  // 11. L não aceita braço menor que 30 nem fundo maior que o braço
  await noApp(() => { layout().itens = [mk('cantoL', 'L', 120, 120, 100, 100, 0, { p: 50 })]; sel = itens()[0].id; confirmar(); render(); });
  await page.fill('#pW', '15'); await page.dispatchEvent('#pW', 'input'); await page.dispatchEvent('#pW', 'change');
  const lw = await noApp(() => [pegar(sel).w, profL(pegar(sel))]);
  verificar(lw[0] === 30 && lw[1] <= 20, 'braço mínimo 30 e fundo limitado ao braço: ' + lw);

  // 13. mapa de passagens recalcula ao soltar o arrasto
  await noApp(() => { layout().itens = [mk('armario', 'Armário', 340, 55, 0, 300)]; sel = null; estado.op.ima = false; confirmar(); render(); ajustar(); });
  {
    const antes = await noApp(() => gPassagens.innerHTML);
    const id = await noApp(() => itens()[0].id);
    const c = await t.centroMovel(id);
    const k = await noApp(() => view.k);
    await t.arrastar(c.x, c.y, c.x + 30 / k, c.y);
    const depois = await noApp(() => gPassagens.innerHTML);
    verificar(antes === '' && depois !== '', 'listras aparecem logo ao soltar o móvel que estreitou a passagem');
    await noApp(() => { estado.op.ima = true; });
  }
  verificar(t.erros.length === 0, 'sem erros (computador): ' + t.erros.join(' | '));
  await t.fechar();
}

// ---------- iPhone ----------
{
  const t = await abrir({ iphone: true });
  const { page, noApp } = t;
  // 12. arrastar um móvel pequeno já selecionado move em vez de redimensionar
  const vasoId = await noApp(() => itens().find(i => i.nome === 'Criado-mudo estreito').id);
  let c = await t.centroMovel(vasoId);
  await t.toque(c.x, c.y);
  c = await t.centroMovel(vasoId);
  const antes = await noApp(id => { const i = pegar(id); return [i.x, i.y, i.w]; }, vasoId);
  await t.arrastar(c.x, c.y, c.x + 40, c.y + 10);
  const depois = await noApp(id => { const i = pegar(id); return [i.x, i.y, i.w]; }, vasoId);
  verificar(depois[2] === antes[2] && (depois[0] !== antes[0] || depois[1] !== antes[1]), 'criado-mudo pequeno selecionado, arrastado pelo centro, se move e não muda de tamanho: ' + antes + ' -> ' + depois);

  // 14. painel só abre ao soltar
  await page.tap('#pFechar');
  const camaId = await noApp(() => itens().find(i => i.tipo === 'cama').id);
  c = await t.centroMovel(camaId);
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
  await page.waitForTimeout(50);
  const vazioDurante = await noApp(() => $('#painel').classList.contains('vazio'));
  const selDurante = await noApp(() => sel);
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(50);
  const vazioDepois = await noApp(() => $('#painel').classList.contains('vazio'));
  verificar(vazioDurante && selDurante === camaId && !vazioDepois, 'toque na cama: seleciona na hora, painel abre só ao soltar');

  // 15. pinça que começa em cima de um móvel não seleciona nem move
  await page.tap('#pFechar');
  const sofaId = await noApp(() => itens().find(i => i.tipo === 'sofa' || i.tipo === 'chaise').id);
  c = await t.centroMovel(sofaId);
  const pos0 = await noApp(id => { const i = pegar(id); return [i.x, i.y]; }, sofaId);
  const nDesfazer = await noApp(() => desfazer.length);
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y, id: 1 }] });
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x + 14, y: c.y + 6, id: 1 }] });
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x + 14, y: c.y + 6, id: 1 }, { x: c.x + 80, y: c.y + 60, id: 2 }] });
  for (let i = 1; i <= 6; i++) await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x + 14 - i * 5, y: c.y + 6 - i * 5, id: 1 }, { x: c.x + 80 + i * 5, y: c.y + 60 + i * 5, id: 2 }] });
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(50);
  const pos1 = await noApp(id => { const i = pegar(id); return [i.x, i.y]; }, sofaId);
  verificar(pos1[0] === pos0[0] && pos1[1] === pos0[1], 'pinça sobre o sofá não move o sofá');
  verificar((await noApp(() => sel)) === null, 'pinça sobre o sofá não o seleciona');
  verificar((await noApp(() => desfazer.length)) === nDesfazer, 'pinça não grava no desfazer');
  verificar(t.erros.length === 0, 'sem erros (iPhone): ' + t.erros.join(' | '));
  await t.fechar();
}
