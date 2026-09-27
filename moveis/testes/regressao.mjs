// Regressão do simulador: percorre o essencial no computador e no iPhone emulado.
// Rodar: node moveis/testes/regressao.mjs
import { abrir, verificar } from './harness.mjs';

// ---------- computador ----------
{
  const t = await abrir();
  const { page, noApp } = t;
  verificar((await t.status()).includes('tudo cabe'), 'exemplo abre sem conflitos');

  // arrastar o sofá pelo mouse
  const sofaId = await noApp(() => itens().find(i => i.tipo === 'sofa').id);
  const x0 = await noApp(id => pegar(id).x, sofaId);
  const c = await t.centroMovel(sofaId);
  await t.arrastar(c.x, c.y, c.x + 40, c.y + 10);
  const dep = await noApp(id => { const i = pegar(id); return [i.x, i.y]; }, sofaId);
  verificar(dep[0] !== x0, 'arrastar move o sofá');
  await page.keyboard.press('Control+z');
  verificar((await noApp(id => pegar(id).x, sofaId)) === x0, 'desfazer volta o sofá');

  // catálogo
  await page.click('#fab'); await page.click('text=Poltrona');
  verificar((await t.status()).includes('Poltrona'), 'adicionar do catálogo seleciona a peça');
  // conjuntos
  const antes = await noApp(() => itens().length);
  await page.click('#fab'); await page.click('text=Canto 1,20 × 1,20 + mesa 80 × 70');
  verificar((await noApp(() => itens().length)) === antes + 4, 'conjunto entra com 4 peças');
  await page.click('#pGirarD');
  verificar((await noApp(() => { const g = pegar(sel).grupo; return itens().filter(i => i.grupo === g).every(i => i.rot % 90 === 0); })), 'girar o conjunto mantém múltiplos de 90°');
  // exclusão do conjunto com a janela de confirmação da página
  await page.click('#pExcluirGrupo'); await page.click('#qSim');
  verificar((await noApp(() => itens().length)) === antes, 'excluir conjunto remove as 4 peças');

  // painel numérico
  await page.click('#fab'); await page.click('text=Mesa de centro');
  await page.fill('#pX', '10'); await page.dispatchEvent('#pX', 'change');
  verificar(Math.abs((await noApp(() => caixa(itemPoly(pegar(sel))).x1)) - 10) < 0.01, 'campo "da parede esquerda" reposiciona');

  // imagem
  await page.click('#btMenu'); await page.click('#mPng'); await page.waitForTimeout(800);
  verificar(await page.isVisible('#sImg'), 'salvar imagem mostra a prévia');
  verificar(t.erros.length === 0, 'sem erros no console (computador): ' + t.erros.join(' | '));
  await t.fechar();
}

// ---------- iPhone ----------
{
  const t = await abrir({ iphone: true });
  const { page, noApp } = t;
  const camaId = await noApp(() => itens().find(i => i.tipo === 'cama').id);
  const c = await t.centroMovel(camaId);
  await t.toque(c.x, c.y);
  verificar((await t.status()).includes('Cama'), 'toque seleciona a cama');
  await t.arrastar(c.x, c.y, c.x - 20, c.y - 40);
  verificar((await noApp(id => pegar(id).y, camaId)) < 655, 'arrastar com o dedo move a cama');
  const vb0 = await page.getAttribute('#planta', 'viewBox');
  await t.pinca(200, 400, 2);
  verificar(vb0 !== await page.getAttribute('#planta', 'viewBox'), 'pinça muda o zoom');
  await page.tap('#pFechar');
  verificar(!(await page.isVisible('#pConteudo')), 'fechar o painel esconde a ficha');
  verificar(t.erros.length === 0, 'sem erros no console (iPhone): ' + t.erros.join(' | '));
  await t.fechar();
}
