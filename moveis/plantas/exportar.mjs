// Exporta a geometria das opções do app (moveis/index.html) para planta.json. Rodar: node moveis/plantas/exportar.mjs
import { abrir } from '../testes/harness.mjs';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
import fs from 'node:fs';
const t = await abrir();
const d = await t.noApp(() => ({
  W, H, E, PAREDES, JANELAS, ENTRADA, PORTAS: PORTAS.map(p => ({ nome: p.nome, h: p.h, c: p.c, o: p.o })),
  FIXOS: FIXOS.map(f => ({ ...f })), cooktop: { ...COZINHA.cooktop }, cuba: { ...CUBA },
  AMBIENTES: AMBIENTES.map(a => ({ nome: a.nome, x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, tx: a.tx, ty: a.ty })),
  opcoes: IDEIAS.map(i => ({ id: i.id, titulo: i.titulo, itens: i.itens().map(it => ({ nome: it.nome, tipo: it.tipo, w: it.w, h: it.h, x: it.x, y: it.y, rot: it.rot,
    redondo: redondo(it), poly: itemPoly(it), painel: it.tipo === 'tv' && it.estilo === 'divisoria' ? (() => { const r = dirTV(it) * Math.PI / 180, l = (it.tela || 100) / 2; return [[it.x - Math.cos(r) * l, it.y - Math.sin(r) * l], [it.x + Math.cos(r) * l, it.y + Math.sin(r) * l]]; })() : null })) }))
}));
fs.writeFileSync(path.join(AQUI, 'planta.json'), JSON.stringify(d, null, 1));
console.log(d.opcoes.map(o => o.id + ':' + o.itens.length), d.PAREDES.length, t.erros);
await t.fechar();
