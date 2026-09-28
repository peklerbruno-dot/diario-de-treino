// Área de uso, simulação, TV giratória, régua, ideias de layout, lista de compras e dicas.
// Rodar: node moveis/testes/novidades.mjs
import { abrir, verificar } from './harness.mjs';

{
  const t = await abrir();
  const { page, noApp } = t;

  // ideias: todas passam na conferência do próprio app
  const conf = await noApp(() => IDEIAS.map(i => { const v = conferir(i.itens()); return [i.id, v.batendo, v.naPorta, v.passagens, v.usoRuim.length, v.folga.length]; }));
  for (const [id, ...n] of conf) verificar(n.every(x => x === 0), `ideia "${id}": nada bate, sem passagem apertada, tudo abre (${n})`);

  // área de uso: cadeira encostada na parede não tem como sair
  await noApp(() => { layout().itens = [mk('mesa', 'Mesa', 120, 80, 100, 50), mk('cadeira', 'Cadeira', 45, 50, 120, 0)]; sel = itens()[1].id; confirmar(); render(); });
  verificar((await page.textContent('#pUso')).includes('Cadeira puxada: bate em parede'), 'cadeira contra a parede: painel avisa que não sai');
  // porta da geladeira contra um móvel colocado no caminho dela
  await noApp(() => { layout().itens = [mk('geladeira', 'Geladeira', 70, 75, 345, 270, 90), mk('mesa', 'Mesinha', 50, 50, 290, 285)]; sel = itens()[0].id; confirmar(); render(); });
  const txtGel = await page.textContent('#pUso');
  console.log('geladeira abaixo da pia:', txtGel);
  verificar(/Porta da geladeira: bate em/.test(txtGel), 'porta da geladeira que abre contra algo é avisada');
  // guarda-roupa com a frente para a parede: portas não abrem
  await noApp(() => { layout().itens = [mk('armario', 'Guarda-roupa 3 portas', 150, 55, 0, 645, 0)]; sel = itens()[0].id; confirmar(); render(); });
  verificar((await page.textContent('#pUso')).includes('Portas abertas: bate em parede'), 'guarda-roupa virado para a parede é avisado');

  // simulação: a cadeira anda na tela e volta
  await noApp(() => { layout().itens = [mk('mesa', 'Mesa', 120, 80, 100, 150), mk('cadeira', 'Cadeira', 45, 50, 120, 100)]; sel = null; confirmar(); render(); });
  await page.click('#btSim');
  await page.waitForTimeout(1500); // no meio do "segurar aberto"
  const tr = await noApp(() => nosMoveis.get(itens()[1].id).g.getAttribute('transform'));
  const y0 = await noApp(() => itens()[1].y);
  const ySim = Number(/translate\([^ ]+ ([^)]+)\)/.exec(tr)[1]);
  verificar(Math.abs(ySim - (y0 - 55)) < 0.5, `simular: cadeira sai 55 cm de debaixo da mesa (${y0} → ${ySim})`);
  verificar(await page.isVisible('#simInfo'), 'simular mostra o quadro de resultado');
  await page.click('#btSim');
  const tr2 = await noApp(() => nosMoveis.get(itens()[1].id).g.getAttribute('transform'));
  verificar(tr2.includes(`${y0})`), 'parar a simulação devolve a cadeira ao lugar');
  verificar((await noApp(() => itens()[1].y)) === y0, 'simular não altera a posição salva');

  // TV giratória: alvos no mesmo ambiente e botão virar
  await noApp(() => { layout().itens = IDEIAS[0].itens(); sel = itens().find(i => i.tipo === 'tv').id; confirmar(); render(); });
  const alvos = await noApp(() => alvosTV(pegar(sel)).map(a => a.nome));
  verificar(!alvos.some(n => /Cama/.test(n)), 'TV da sala não mira na cama do quarto: ' + alvos);
  // o primeiro alvo que exige girar o painel (o que já está de frente não muda nada)
  const atual = await noApp(() => dirTV(pegar(sel)));
  const botoes = await page.$$eval('#pTV [data-virar]', bs => bs.map(b => Number(b.dataset.virar)));
  const alvo = botoes.find(v => v !== atual);
  await page.click(`#pTV [data-virar="${alvo}"]`);
  const rot = await noApp(() => dirTV(pegar(sel)));
  verificar(rot === alvo && alvo !== atual, `botão "virar para" gira o painel da TV para ${alvo}°: ${rot}`);
  verificar((await page.textContent('#pTV')).match(/TV de 5[05]"/), 'painel da TV mostra a polegada');

  // régua: de parede a parede da sala (420 cm)
  await noApp(() => { layout().itens = []; sel = null; confirmar(); render(); ajustar(); });
  await page.click('#btRegua');
  const [a, b] = await noApp(() => { const r = svg.getBoundingClientRect(); const tela = (x, y) => [r.left + (x - view.x) / view.k, r.top + (y - view.y) / view.k]; return [tela(3, 400), tela(417, 400)]; });
  await t.arrastar(a[0], a[1], b[0], b[1]);
  const med = await noApp(() => medida && Math.round(Math.hypot(medida.b.x - medida.a.x, medida.b.y - medida.a.y)));
  verificar(med === 420, 'régua gruda nas paredes e mede 420 cm: ' + med);
  verificar((await noApp(() => gRegua.textContent)) === '4,2 m', 'régua escreve 4,2 m');
  await page.click('#btRegua');
  verificar((await noApp(() => gRegua.childElementCount)) === 0, 'desligar a régua apaga a medida');

  // ideias: abrir cria o layout com o botão ⓘ
  await page.click('#btIdeias');
  verificar((await page.locator('.ideia').count()) === 4, '4 ideias na lista');
  await page.click('[data-ideia=invertida]');
  verificar((await noApp(() => layout().ideia)) === 'invertida' && await page.isVisible('#btInfo'), 'abrir ideia cria layout com botão ⓘ');
  await page.click('#btInfo');
  verificar((await page.textContent('#iiCorpo')).includes('Contras'), 'ⓘ mostra prós e contras');
  await page.keyboard.press('Escape');

  // lista de compras
  await page.click('#btMenu'); await page.click('#mCompras');
  const lista = await page.inputValue('#sTexto');
  verificar(lista.includes('2× Cadeira — 45 × 50 cm') && lista.includes('Cadeira de escritório') && lista.includes('DORMITÓRIO 01') && lista.includes('80 cm'), 'lista de compras agrupa por ambiente e conta cadeiras');
  verificar(t.erros.length === 0, 'sem erros: ' + t.erros.join(' | '));
  await t.fechar();
}

// dicas: aparecem na primeira abertura e não na segunda
{
  const t = await abrir({ iphone: true, dicas: true });
  await t.page.waitForTimeout(700);
  verificar(await t.page.isVisible('#fDicas'), 'dicas aparecem na primeira abertura');
  for (let i = 0; i < 4; i++) await t.page.tap('#dProx');
  verificar(!(await t.page.isVisible('#fDicas')), 'Começar fecha as dicas');
  await t.page.reload(); await t.page.waitForTimeout(700);
  verificar(!(await t.page.isVisible('#fDicas')), 'dicas não voltam na segunda abertura');
  await t.fechar();
}
