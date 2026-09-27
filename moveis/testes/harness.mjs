// Harness de teste do simulador: abre moveis/index.html no Chromium (Playwright) e
// expõe ajudantes. Uso a partir de um cenário:
//
//   import { abrir } from './harness.mjs';
//   const { page, erros, fechar, toque, arrastarToque, pinca } = await abrir({ iphone: true });
//   ... asserções ...
//   await fechar();
//
// Rodar: node moveis/testes/<cenario>.mjs   (a partir da raiz do repositório)
// O Playwright é procurado no npm global (PLAYWRIGHT_PATH sobrescreve).

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
function acharPlaywright() {
  if (process.env.PLAYWRIGHT_PATH) return require(process.env.PLAYWRIGHT_PATH);
  try { return require('playwright'); } catch (e) { /* tenta o global */ }
  const raiz = execSync('npm root -g', { encoding: 'utf8' }).trim();
  return require(path.join(raiz, 'playwright'));
}
const { chromium, devices } = acharPlaywright();

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const URL_APP = 'file://' + path.resolve(AQUI, '..', 'index.html');

export async function abrir({ iphone = false, largura = 1280, altura = 800 } = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(iphone ? { ...devices['iPhone 13'] } : { viewport: { width: largura, height: altura } });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
  await page.goto(URL_APP);
  await page.waitForTimeout(250);
  const cdp = iphone ? await ctx.newCDPSession(page) : null;

  // Toque simples numa coordenada (iPhone) ou clique (desktop).
  async function toque(x, y) {
    if (!cdp) { await page.mouse.click(x, y); return; }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  // Arrasta com um dedo (iPhone) ou com o mouse (desktop), em passos.
  async function arrastar(x1, y1, x2, y2, passos = 10) {
    if (!cdp) {
      await page.mouse.move(x1, y1); await page.mouse.down();
      await page.mouse.move(x2, y2, { steps: passos }); await page.mouse.up();
      return;
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y: y1 }] });
    for (let i = 1; i <= passos; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + (x2 - x1) * i / passos, y: y1 + (y2 - y1) * i / passos }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  // Pinça de dois dedos (só iPhone): abre (fator>1) ou fecha em volta de (cx,cy).
  async function pinca(cx, cy, fator = 2, passos = 10) {
    if (!cdp) throw new Error('pinca só no modo iphone');
    const d0 = 60, d1 = d0 * fator;
    const pts = d => [{ x: cx - d / 2, y: cy, id: 1 }, { x: cx + d / 2, y: cy, id: 2 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(d0) });
    for (let i = 1; i <= passos; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(d0 + (d1 - d0) * i / passos) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  // Roda código dentro da página com acesso ao estado global do app.
  const noApp = (fn, arg) => page.evaluate(fn, arg);
  // Centro de um móvel na tela, pelo id.
  async function centroMovel(id) {
    const b = await page.locator(`g.movel[data-id="${id}"]`).boundingBox();
    if (!b) throw new Error('móvel não está na tela: ' + id);
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, box: b };
  }
  const status = () => page.textContent('#status');
  const fechar = () => browser.close();
  return { browser, ctx, page, erros, cdp, toque, arrastar, pinca, noApp, centroMovel, status, fechar };
}

// Falha barulhenta: para ser usada em cenários simples.
export function verificar(cond, msg) {
  if (!cond) { console.error('FALHOU: ' + msg); process.exitCode = 1; }
  else console.log('ok: ' + msg);
}
