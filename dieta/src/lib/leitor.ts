import "server-only";
import { ApiError, GoogleGenAI, Type, type Part } from "@google/genai";
import { lerRespostaDaFoto } from "./analise";
import { lerJson, normalizarPlanejamento, normalizarTroca, type Planejamento, type RespostaDeTroca } from "./semana";
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
/**
 * O modelo de reserva. No plano gratuito cada modelo tem a sua cota por minuto
 * e por dia, e a do "lite" é bem maior — é o que o assistente deste
 * repositório usa. Quando o principal responde "cota acabou" (429) ou
 * "sobrecarregado" (503), a mesma pergunta vai para o reserva: lê um pouco
 * pior, mas responde em vez de falhar.
 */
const MODELO_RESERVA = process.env.GEMINI_MODELO_RESERVA || "gemini-flash-lite-latest";

/** A cota acabou nos dois modelos — dá para tentar de novo mais tarde. */
export const ehFaltaDeCota = (e: unknown) => e instanceof ApiError && e.status === 429;

const COTA =
  "A cota gratuita do Gemini acabou por agora (ela é contada por minuto e por dia). Tente de novo daqui a alguns minutos — ou amanhã, se foram muitas leituras hoje.";

type Pedido = Omit<Parameters<GoogleGenAI["models"]["generateContent"]>[0], "model">;

/** Chama o Gemini no modelo principal e, se ele estiver sem cota, no reserva. */
async function gerar(c: GoogleGenAI, pedido: Pedido) {
  try {
    return await c.models.generateContent({ ...pedido, model: MODELO });
  } catch (e) {
    if (!(e instanceof ApiError) || (e.status !== 429 && e.status !== 503) || MODELO_RESERVA === MODELO) throw e;
    console.warn(`[gemini] ${MODELO} respondeu ${e.status}; tentando ${MODELO_RESERVA}`);
    return await c.models.generateContent({ ...pedido, model: MODELO_RESERVA });
  }
}

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
    r = await gerar(c, {
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
      throw new ErroDeLeitura(COTA);
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
Seja realista nas estimativas e escreva em português do Brasil. Quando não houver foto, só a descrição em texto, faça o mesmo a partir dela. Se a foto não for de comida, devolva itens vazios e explique na descrição.`;

/**
 * Lê a foto do prato — ou, sem foto, o que a pessoa escreveu que comeu.
 * `plano` é o que a refeição pedia, em texto, quando é uma refeição do plano.
 * `correcao` é o que a pessoa corrigiu ("era peito de peru", "foram 2
 * hambúrgueres"), que vale mais que o olho do Gemini; `anterior` é a leitura
 * que está sendo corrigida.
 *
 * `analise` vem null quando não deu para ler — a foto é salva mesmo assim, e
 * `semCota` diz se o motivo foi a cota (aí vale tentar de novo mais tarde,
 * pelo botão "Analisar agora").
 */
export async function analisarPrato(
  entrada: { imagem?: { tipo: string; base64: string } | null; texto?: string; correcao?: string; anterior?: unknown },
  plano?: { nome: string; texto: string; nota?: string },
) {
  const c = ia();
  if (!c) return { analise: null, semCota: false };
  const partes: Part[] = [];
  if (entrada.imagem) partes.push({ inlineData: { mimeType: entrada.imagem.tipo, data: entrada.imagem.base64 } });
  else partes.push({ text: `Não há foto. A pessoa escreveu o que comeu:\n"${(entrada.texto ?? "").slice(0, 600)}"\nEstime a partir do texto, com porções típicas quando a quantidade não for dita.` });
  partes.push({
    text: plano
      ? `Refeição do plano: ${plano.nome}\nO que o plano pede (linhas com "ou" são substituições):\n${plano.texto}${plano.nota ? `\nObservação da nutricionista: ${plano.nota}` : ""}`
      : "Não há refeição do plano para comparar: use noPlano = 'sem-plano'.",
  });
  if (entrada.correcao) {
    partes.push({
      text: `${entrada.anterior ? `Leitura anterior: ${JSON.stringify(entrada.anterior)}\n` : ""}A pessoa corrigiu: "${entrada.correcao.slice(0, 400)}"
A correção é verdade e vale mais que a foto: troque os alimentos, as quantidades e as contas conforme ela (se disser "foram 2", dobre aquele item), mantenha o resto e refaça calorias, macros e a comparação com o plano.`,
    });
  }
  try {
    const r = await gerar(c, {
      contents: [{ role: "user", parts: partes }],
      config: { systemInstruction: INSTRUCOES_DA_FOTO, responseMimeType: "application/json", responseSchema: ESQUEMA_DA_FOTO, temperature: 0.2 },
    });
    return { analise: lerRespostaDaFoto(r.text ?? ""), semCota: false };
  } catch (e) {
    if (!ehFaltaDeCota(e)) console.error("[foto]", e);
    return { analise: null, semCota: ehFaltaDeCota(e) };
  }
}

// ---------------------------------------------------------------------------
// O plano inteiro em texto — o contexto do "posso trocar?" e da semana
// ---------------------------------------------------------------------------

export type PlanoEmTexto = { orientacoes: string; refeicoes: { nome: string; horario: string; texto: string; nota: string }[] };

const planoComoTexto = (p: PlanoEmTexto) =>
  [
    p.orientacoes && `Orientações gerais da nutricionista:\n${p.orientacoes}`,
    ...p.refeicoes.map((r) => `${r.nome} (${r.horario}):\n${r.texto}${r.nota ? `\nObservação: ${r.nota}` : ""}`),
  ]
    .filter(Boolean)
    .join("\n\n");

async function gerarJson(instrucoes: string, pedido: string, esquema: object, temperatura = 0.3): Promise<unknown> {
  const c = ia();
  if (!c) throw new ErroDeLeitura("A inteligência do app está desligada: falta a chave GEMINI_API_KEY na Vercel.");
  try {
    const r = await gerar(c, {
      contents: [{ role: "user", parts: [{ text: pedido }] }],
      config: { systemInstruction: instrucoes, responseMimeType: "application/json", responseSchema: esquema, temperature: temperatura },
    });
    return lerJson(r.text ?? "");
  } catch (e) {
    if (ehFaltaDeCota(e)) throw new ErroDeLeitura(COTA);
    console.error("[gemini]", e);
    throw new ErroDeLeitura("Não consegui pensar nisso agora. Tente de novo em instantes.");
  }
}

// ---------------------------------------------------------------------------
// "Posso trocar isso?"
// ---------------------------------------------------------------------------

const ESQUEMA_DA_TROCA = {
  type: Type.OBJECT,
  properties: {
    veredito: { type: Type.STRING, enum: ["pode", "com-ajuste", "melhor-nao"] },
    resposta: { type: Type.STRING, description: "2 a 4 frases curtas, diretas, em tom de apoio." },
    sugestao: { type: Type.STRING, description: "A troca mais próxima do plano ou como ajustar o pedido (porção, acompanhamento). Vazio se não precisar." },
  },
  required: ["veredito", "resposta", "sugestao"],
  propertyOrdering: ["veredito", "resposta", "sugestao"],
};

const INSTRUCOES_DA_TROCA = `Você ajuda uma pessoa a seguir o plano alimentar que a nutricionista dela passou. Ela pergunta se pode trocar uma refeição ou um alimento por outro.
Responda com base no plano e nas orientações dela — não em regras genéricas suas. Valem as substituições que o próprio plano lista.
- "pode": a troca respeita o plano (ou é uma substituição prevista).
- "com-ajuste": dá, desde que ajuste algo (porção, acompanhamento, preparo) — diga exatamente o quê.
- "melhor-nao": foge do plano; sugira a alternativa mais parecida que caiba nele.
Seja prático e gentil, sem sermão nem terrorismo nutricional. Se for algo para uma ocasião (aniversário, restaurante), ajude a escolher a melhor opção do cardápio. Não dê diagnóstico médico. Português do Brasil.`;

export async function perguntarTroca(pergunta: string, plano: PlanoEmTexto, refeicao?: string): Promise<RespostaDeTroca> {
  const pedido = `${planoComoTexto(plano)}\n\n${refeicao ? `Refeição em questão: ${refeicao}\n` : ""}Pergunta: ${pergunta.slice(0, 600)}`;
  const r = normalizarTroca(await gerarJson(INSTRUCOES_DA_TROCA, pedido, ESQUEMA_DA_TROCA));
  if (!r) throw new ErroDeLeitura("A resposta veio num formato estranho. Tente perguntar de novo.");
  return r;
}

// ---------------------------------------------------------------------------
// A semana: cardápio de marmitas, preparo e lista de compras
// ---------------------------------------------------------------------------

const ESQUEMA_DA_SEMANA = {
  type: Type.OBJECT,
  properties: {
    cardapio: {
      type: Type.ARRAY,
      description: "Os 7 dias, de segunda a domingo.",
      items: {
        type: Type.OBJECT,
        properties: {
          dia: { type: Type.STRING, description: "Ex.: 'Segunda'." },
          refeicoes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                nome: { type: Type.STRING, description: "O nome da refeição como está no plano." },
                prato: { type: Type.STRING, description: "O que comer, concreto e com porção aproximada." },
              },
              required: ["nome", "prato"],
              propertyOrdering: ["nome", "prato"],
            },
          },
        },
        required: ["dia", "refeicoes"],
        propertyOrdering: ["dia", "refeicoes"],
      },
    },
    preparo: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Passo a passo do preparo das marmitas no dia de cozinhar, em ordem, aproveitando forno e fogão ao mesmo tempo." },
    compras: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          secao: { type: Type.STRING, description: "Hortifruti, Açougue e peixaria, Mercearia, Laticínios e ovos, Padaria, Congelados, Outros." },
          itens: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { item: { type: Type.STRING }, quantidade: { type: Type.STRING, description: "Quantidade para a semana inteira, em unidade de mercado (kg, g, maço, dúzia, pacote)." } },
              required: ["item", "quantidade"],
              propertyOrdering: ["item", "quantidade"],
            },
          },
        },
        required: ["secao", "itens"],
        propertyOrdering: ["secao", "itens"],
      },
    },
    dicas: { type: Type.STRING, description: "1 a 3 dicas curtas: conservação, congelar, variar." },
  },
  required: ["cardapio", "preparo", "compras", "dicas"],
  propertyOrdering: ["cardapio", "preparo", "compras", "dicas"],
};

const INSTRUCOES_DA_SEMANA = `Você monta o planejamento da semana de uma pessoa brasileira que segue o plano alimentar da nutricionista.
- Cardápio: para cada dia (segunda a domingo) e cada refeição do plano, diga o que comer, concreto. Onde o plano for exato, repita-o (variando entre as substituições previstas). Onde o plano for uma referência ("marmita", "PF", "lanche leve"), crie pratos que sigam as orientações dela e as regras de montagem, com comida brasileira do dia a dia, simples e barata, variando ao longo da semana.
- Refeições que vão de marmita: cozinhe em lote (2 ou 3 bases de proteína e carboidrato combinadas de jeitos diferentes), para caber num preparo de 1h30 a 2h no dia de cozinhar.
- Preparo: passo a passo prático, em ordem, do dia de cozinhar.
- Compras: tudo o que a semana pede, somado, agrupado por seção do mercado.
- Respeite as preferências e restrições informadas. Não invente regras nutricionais que o plano não tem. Português do Brasil.`;

export async function planejarSemana(plano: PlanoEmTexto, preferencias: string): Promise<Planejamento> {
  const pedido = `${planoComoTexto(plano)}\n\n${preferencias.trim() ? `Preferências e restrições: ${preferencias.trim().slice(0, 600)}` : "Sem preferências informadas."}`;
  const p = normalizarPlanejamento(await gerarJson(INSTRUCOES_DA_SEMANA, pedido, ESQUEMA_DA_SEMANA, 0.6));
  if (!p) throw new ErroDeLeitura("O planejamento veio vazio. Tente de novo.");
  return p;
}
