import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Um teste esquisito, e ele existe por um motivo.
 *
 * A etiqueta `apple-mobile-web-app-capable` é a única coisa que faz o ícone da
 * tela de início abrir sem a barra do Safari. Ela não aparece em tela nenhuma,
 * não quebra build nenhum, e a falta dela só se sente num iPhone de verdade —
 * onde já custou duas rodadas de conserto no escuro.
 *
 * O Next emitia essa etiqueta sozinho a partir de `appleWebApp.capable`, e da
 * versão 15 em diante passou a emitir só a versão sem prefixo, que o iOS não
 * conhece. Foi assim que ela sumiu sem ninguém mexer em nada. Pode acontecer de
 * novo, e por isso a declaração é explícita e este teste a segura.
 */
describe("o que faz o app abrir como app no iPhone", () => {
  const layout = readFileSync(join(__dirname, "layout.tsx"), "utf8");

  it("declara apple-mobile-web-app-capable à mão, sem depender do Next", () => {
    expect(layout).toContain('"apple-mobile-web-app-capable": "yes"');
  });

  it("continua pedindo o modo app pelo caminho do Next também", () => {
    expect(layout).toContain("capable: true");
  });
});
