import type { Campo, Dados } from "./esquema";
import { LISTA_CORES } from "./esquema";
import { ehData, ehHora } from "./datas";
import { normalizarLink } from "./links";

const LIMITE: Record<Campo["tipo"], number> = {
  texto: 300,
  textoLongo: 20000,
  imagem: 40,
  arquivo: 40,
  data: 10,
  hora: 5,
  link: 2000,
  cor: 20,
};

export type Resultado = { ok: true; dados: Dados } | { ok: false; erro: string };

/**
 * Confere e arruma o que veio do formulário. Só passam os campos que o esquema
 * conhece; o resto é descartado. As mensagens falam com quem está editando, não
 * com quem programa.
 */
export function limparDados(campos: readonly Campo[], entrada: unknown): Resultado {
  const bruto = (entrada && typeof entrada === "object" ? entrada : {}) as Record<string, unknown>;
  const dados: Dados = {};

  for (const c of campos) {
    const v = bruto[c.nome];
    let s = typeof v === "string" ? v.trim() : "";

    if (s.length > LIMITE[c.tipo]) {
      return { ok: false, erro: `"${c.rotulo}" está comprido demais (máximo de ${LIMITE[c.tipo]} caracteres).` };
    }

    if (s) {
      switch (c.tipo) {
        case "data":
          if (!ehData(s)) return { ok: false, erro: `"${c.rotulo}" não é uma data válida.` };
          break;
        case "hora":
          if (!ehHora(s)) return { ok: false, erro: `"${c.rotulo}" não é um horário válido.` };
          break;
        case "cor":
          if (!(LISTA_CORES as string[]).includes(s)) s = "";
          break;
        case "imagem":
        case "arquivo":
          if (!/^[a-z0-9]{10,40}$/.test(s)) return { ok: false, erro: `"${c.rotulo}": o arquivo não foi reconhecido. Envie de novo.` };
          break;
        case "link": {
          const n = normalizarLink(s);
          if (!n) {
            return {
              ok: false,
              erro: `"${c.rotulo}" não parece um link. Cole o endereço inteiro, como https://exemplo.com.br.`,
            };
          }
          s = n;
          break;
        }
      }
    }

    if (c.obrigatorio && !s) return { ok: false, erro: `Preencha "${c.rotulo}".` };
    dados[c.nome] = s;
  }
  return { ok: true, dados };
}
