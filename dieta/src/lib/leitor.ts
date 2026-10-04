import "server-only";
import { ApiError, GoogleGenAI, Type, type Part } from "@google/genai";
import { lerRespostaDaFoto } from "./analise";
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
                      texto: { type: Type.STRING, description: "Alimento e quantidade, ex.: 'Pão integral — 2 fatias (50 g)'; ou a referência como o plano escreve, ex.: 'Marmita', 'PF (prato feito)'." },
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
- Muitos planos são de referência, sem cardápio exato: "comer marmita", "PF (prato feito)", "lanche leve", "fruta", "refeição livre". Transcreva assim mesmo, como itens, SEM inventar alimentos nem quantidades. Regras de montagem que acompanham a referência ("metade do prato de salada, 1/4 de proteína, 1/4 de carboidrato", "evitar fritura nessa refeição") vão na "nota" da refeição.
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

// ---------------------------------------------------------------------------
// A foto do prato
// ---------------------------------------------------------------------------

const ESQUEMA_DA_FOTO = {
  type: Type.OBJECT,
  properties: {
    descricao: { type: Type.STRING, description: "Uma frase dizendo o que há no prato." },
    itens: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          alimento: { type: Type.STRING },
          quantidade: { type: Type.STRING, description: "Estimativa em medida caseira e gramas, ex.: '4 col. de sopa (~100 g)'." },
        },
        required: ["alimento", "quantidade"],
        propertyOrdering: ["alimento", "quantidade"],
      },
    },
    calorias: { type: Type.INTEGER, description: "Estimativa total em kcal." },
    proteinas: { type: Type.INTEGER, description: "Gramas." },
    carboidratos: { type: Type.INTEGER, description: "Gramas." },
    gorduras: { type: Type.INTEGER, description: "Gramas." },
    noPlano: {
      type: Type.STRING,
      enum: ["sim", "parcial", "nao", "sem-plano"],
      description: "O prato corresponde à refeição do plano (considerando as substituições)? 'sem-plano' se nenhuma refeição do plano foi dada.",
    },
    comentario: {
      type: Type.STRING,
      description: "Uma ou duas frases curtas comparando com o plano: o que bateu, o que faltou ou sobrou. Tom de apoio, sem sermão.",
    },
  },
  required: ["descricao", "itens", "calorias", "proteinas", "carboidratos", "gorduras", "noPlano", "comentario"],
  propertyOrdering: ["descricao", "itens", "calorias", "proteinas", "carboidratos", "gorduras", "noPlano", "comentario"],
};

const INSTRUCOES_DA_FOTO = `Você olha a foto de um prato de comida de uma pessoa brasileira que segue um plano de nutricionista.
Identifique os alimentos, estime as quantidades pelo tamanho no prato e estime calorias e macronutrientes.
Se receber a refeição do plano, compare: "sim" se o prato segue o plano (valem as substituições listadas e pequenas variações de quantidade), "parcial" se segue em parte, "nao" se é outra coisa.
Quando o plano for uma referência genérica ("marmita", "PF", "lanche leve", "refeição livre"), julgue pelo espírito dela e pelas regras da observação, se houver: um PF equilibrado (salada ou legumes, uma proteína, um carboidrato, sem excesso de fritura) é "sim"; um PF só de fritura e massa é "parcial" ou "nao". No comentário, diga em uma frase o que deixaria o prato mais próximo do ideal, se algo.
Seja realista nas estimativas e escreva em português do Brasil. Se a foto não for de comida, devolva itens vazios e explique na descrição.`;

/**
 * Lê a foto do prato. `plano` é o que a refeição pedia, em texto, quando a
 * foto é de uma refeição do plano. Devolve null quando não deu para ler — a
 * foto é salva mesmo assim.
 */
export async function analisarPrato(imagem: { tipo: string; base64: string }, plano?: { nome: string; texto: string; nota?: string }) {
  const c = ia();
  if (!c) return null;
  const partes: Part[] = [{ inlineData: { mimeType: imagem.tipo, data: imagem.base64 } }];
  partes.push({
    text: plano
      ? `Refeição do plano: ${plano.nome}\nO que o plano pede (linhas com "ou" são substituições):\n${plano.texto}${plano.nota ? `\nObservação da nutricionista: ${plano.nota}` : ""}`
      : "Não há refeição do plano para comparar: use noPlano = 'sem-plano'.",
  });
  try {
    const r = await c.models.generateContent({
      model: MODELO,
      contents: [{ role: "user", parts: partes }],
      config: { systemInstruction: INSTRUCOES_DA_FOTO, responseMimeType: "application/json", responseSchema: ESQUEMA_DA_FOTO, temperature: 0.2 },
    });
    return lerRespostaDaFoto(r.text ?? "");
  } catch (e) {
    console.error("[foto]", e);
    return null;
  }
}
