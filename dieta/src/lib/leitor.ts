import "server-only";
import { ApiError, GoogleGenAI, Type, type Part } from "@google/genai";
import { ErroDeLeitura, interpretarResposta, type PlanoLido } from "./plano-lido";

export { ErroDeLeitura };

/**
 * O leitor do plano: o PDF (ou a foto, ou o texto) da nutricionista entra, e
 * sai a lista de refeições com horário, o que comer e as substituições.
 *
 * Quem lê é o Gemini, pelo mesmo motivo do assistente e da viagem deste
 * repositório: tem plano gratuito, lê PDF e imagem, e devolve JSON no formato
 * que se pede. Nada do que ele lê vai direto para o plano: a tela mostra tudo
 * para conferir e corrigir antes de salvar.
 */

const MODELO = process.env.GEMINI_MODELO || "gemini-flash-latest";

let cliente: GoogleGenAI | null = null;
function ia(): GoogleGenAI | null {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) return null;
  return (cliente ??= new GoogleGenAI({ apiKey: chave }));
}
export const temGemini = () => Boolean(process.env.GEMINI_API_KEY);

const ESQUEMA = {
  type: Type.OBJECT,
  properties: {
    nome: { type: Type.STRING, description: "Nome curto do plano, ex.: 'Plano de outubro' ou 'Plano — Dra. Ana'. Use o mês da consulta se aparecer." },
    orientacoes: {
      type: Type.STRING,
      description: "Orientações gerais do plano (o que evitar, temperos, suplementos, observações), uma por linha, curtas. Vazio se não houver.",
    },
    aguaMl: { type: Type.INTEGER, description: "Meta diária de água em ml, se o plano disser (2,5 L = 2500). 0 se não disser." },
    refeicoes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          nome: { type: Type.STRING, description: "Ex.: 'Café da manhã', 'Lanche da manhã', 'Almoço', 'Ceia'." },
          horario: { type: Type.STRING, description: "Horário no formato HH:MM. Se o plano não disser, sugira um horário típico." },
          dias: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
            description: "Dias da semana em que esta refeição vale (0 = domingo … 6 = sábado). Vazio se vale todo dia.",
          },
          nota: { type: Type.STRING, description: "Observação só desta refeição. Vazio se nada." },
          opcoes: {
            type: Type.ARRAY,
            description: "As opções da refeição. Se o plano não oferece opções alternativas, uma só, com título vazio.",
            items: {
              type: Type.OBJECT,
              properties: {
                titulo: { type: Type.STRING, description: "Ex.: 'Opção 1'. Vazio quando só há uma opção." },
                itens: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      texto: { type: Type.STRING, description: "Alimento e quantidade, ex.: 'Pão integral — 2 fatias (50 g)'." },
                      subs: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Substituições deste item, cada uma com quantidade, ex.: 'Tapioca — 3 col. de sopa de goma'.",
                      },
                    },
                    required: ["texto", "subs"],
                    propertyOrdering: ["texto", "subs"],
                  },
                },
              },
              required: ["titulo", "itens"],
              propertyOrdering: ["titulo", "itens"],
            },
          },
        },
        required: ["nome", "horario", "dias", "nota", "opcoes"],
        propertyOrdering: ["nome", "horario", "dias", "nota", "opcoes"],
      },
    },
  },
  required: ["nome", "orientacoes", "aguaMl", "refeicoes"],
  propertyOrdering: ["nome", "orientacoes", "aguaMl", "refeicoes"],
};

const INSTRUCOES = `Você transcreve planos alimentares de nutricionistas brasileiras para um app pessoal.
Recebe o plano (PDF, fotos ou texto) e devolve as refeições do dia, na ordem, com tudo que o paciente precisa para segui-lo.

Regras:
- Transcreva fielmente. Não invente alimento, quantidade nem substituição que não esteja no plano, e não "melhore" a dieta.
- Mantenha as quantidades como o plano escreve (medida caseira e gramas, se houver as duas): "Arroz integral — 4 col. de sopa (100 g)".
- Lista de substituições/equivalentes de um item vai em "subs" daquele item. Uma tabela de substituições geral no fim do plano deve ser distribuída pelos itens a que se refere.
- Quando a refeição tem alternativas inteiras ("Opção 1 / Opção 2"), cada uma é uma opção. Senão, uma opção só, com título vazio.
- Se houver planos diferentes para dias de treino e de descanso, ou para fim de semana, use o campo "dias" e repita a refeição com o nome indicando a diferença (ex.: "Lanche (dia de treino)").
- Horário: use o do plano em HH:MM. Se não houver, sugira um horário típico para aquela refeição.
- Escreva em português do Brasil, frases curtas. Ignore cabeçalho, dados da clínica, CRN e assinatura.
- Se não houver plano alimentar nenhum no material, devolva a lista de refeições vazia.`;

/** Lê o plano e devolve as refeições. `arquivos` vêm em base64 (PDF ou imagem). */
export async function lerPlano(entrada: { texto?: string; arquivos?: { tipo: string; base64: string }[] }): Promise<PlanoLido> {
  const c = ia();
  if (!c) {
    throw new ErroDeLeitura(
      "A leitura automática está desligada: falta a chave GEMINI_API_KEY na Vercel (é grátis — veja docs/COLOCAR-NO-AR.md). Enquanto isso, dá para cadastrar as refeições à mão em Plano.",
    );
  }
  const partes: Part[] = [];
  for (const a of entrada.arquivos ?? []) partes.push({ inlineData: { mimeType: a.tipo, data: a.base64 } });
  if (entrada.texto?.trim()) partes.push({ text: `Plano em texto:\n${entrada.texto.trim().slice(0, 30000)}` });
  if (partes.length === 0) throw new ErroDeLeitura("Não chegou nada para ler. Escolha o PDF ou as fotos do plano.");
  partes.unshift({ text: "Este é o plano alimentar que a nutricionista passou:" });

  let r;
  try {
    r = await c.models.generateContent({
      model: MODELO,
      contents: [{ role: "user", parts: partes }],
      config: {
        systemInstruction: INSTRUCOES,
        responseMimeType: "application/json",
        responseSchema: ESQUEMA,
        temperature: 0.1,
      },
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 429) {
      throw new ErroDeLeitura("A cota gratuita do Gemini acabou por agora. Tente de novo daqui a alguns minutos.");
    }
    if (e instanceof ApiError && (e.status === 400 || e.status === 413)) {
      throw new ErroDeLeitura("O Gemini não aceitou o arquivo. Tente mandar fotos das páginas em vez do PDF.");
    }
    console.error("[leitor]", e);
    throw new ErroDeLeitura("Não consegui ler o plano agora. Tente de novo em instantes.");
  }

  const plano = interpretarResposta(r.text ?? "");
  if (plano.refeicoes.length === 0) {
    throw new ErroDeLeitura("Não achei refeições nesse material. Confira se é o plano alimentar, ou mande fotos mais nítidas.");
  }
  return plano;
}
