import "server-only";
import { ApiError, GoogleGenAI, type Content, type Part } from "@google/genai";
import { bd } from "./bd";
import { FUSO, agoraPorExtenso } from "./datas";
import { ErroDeFerramenta, FERRAMENTAS, executar } from "./ferramentas";

/**
 * O laço da conversa: manda o histórico ao Gemini, roda as ferramentas que ele
 * pedir, devolve o resultado e repete até ele ter a resposta.
 *
 * Gemini, e não outro, porque tem plano gratuito que basta para uma pessoa —
 * com leitura de fotos e PDFs e pesquisa no Google. O preço disso: no plano
 * gratuito, o Google pode usar e revisar o que passa por aqui (ver o README).
 */

/**
 * O modelo da conversa. O "flash-lite" é o que tem a cota gratuita diária mais
 * folgada; o apelido "-latest" acompanha a versão estável mais nova.
 */
const MODELO = process.env.GEMINI_MODELO || "gemini-flash-lite-latest";

/**
 * O modelo da pesquisa no Google. É outro porque, no plano gratuito, a pesquisa
 * só vem incluída em alguns modelos — e porque, numa chamada separada, ela não
 * disputa espaço com as outras ferramentas.
 */
const MODELO_PESQUISA = process.env.GEMINI_MODELO_PESQUISA || "gemini-2.5-flash-lite";

/** Quantas falas anteriores voltam a cada mensagem. */
const HISTORICO = 30;

/** Um teto de voltas, para uma ferramenta que falha sempre não virar um laço sem fim. */
const VOLTAS = 10;

let _ia: GoogleGenAI | undefined;
const ia = () => (_ia ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

const INSTRUCOES = `Você é o assistente pessoal do ${process.env.DONO_NOME || "usuário"}, e conversa com ele pelo WhatsApp.

Como escrever:
- Em português do Brasil, com naturalidade, como alguém próximo e competente — nem robótico, nem bajulador.
- Mensagens curtas: é WhatsApp. Vá direto ao ponto; detalhe só quando pedirem ou quando fizer diferença.
- Use a formatação do WhatsApp, não markdown: *negrito*, _itálico_, ~riscado~, listas com "•" ou números. Nada de títulos com #, tabelas ou **dois asteriscos**.
- Emojis com moderação.

O que você sabe fazer:
- Guardar e usar memórias sobre ele (guardar_memoria / apagar_memoria). Quando ele contar algo que valha lembrar depois, guarde sem precisar perguntar, e diga numa frase curta que guardou.
- Lembretes que você mesmo manda na hora certa (criar_lembrete e afins). Sempre confirme o dia e a hora por extenso ("amanhã, domingo 28/09, às 9h").
- Listas (compras, filmes, tarefas…).
- Pesquisar na internet (pesquisar_na_internet) quando a pergunta depender de algo atual: notícias, preços, horários, clima, resultados. Cite a fonte principal.
- Ler fotos e PDFs que ele mandar.

Cuidados:
- As datas que ele disser ("amanhã", "sexta", "daqui a 2 horas") são relativas ao "agora" informado abaixo, no fuso dele.
- Se um pedido for ambíguo a ponto de você poder errar algo que importa (um horário de remédio, um valor), pergunte. Senão, decida e diga o que decidiu.
- Você roda num serviço gratuito cujas conversas podem ser lidas pelo provedor. Se ele pedir para guardar senha, número de cartão, CPF ou documento, não guarde e explique o motivo em uma frase.
- Você não consegue mandar mensagem para outras pessoas, fazer ligações, nem mexer na agenda ou no e-mail dele. Diga isso com franqueza quando pedirem.
- Não invente: se não souber e não der para pesquisar, diga.`;

async function contexto(): Promise<string> {
  const memorias = await bd.memoria.findMany({ orderBy: { criadoEm: "asc" } });
  const lista = memorias.length
    ? memorias.map((m) => `- (id ${m.id}) ${m.texto}`).join("\n")
    : "(nenhuma ainda)";
  return `${INSTRUCOES}\n\nAgora: ${agoraPorExtenso()} (fuso ${FUSO}).\n\nO que você guardou sobre ele:\n${lista}`;
}

/** As últimas falas, em ordem, começando sempre por uma do usuário. */
async function historico(): Promise<Content[]> {
  const falas = await bd.mensagem.findMany({ orderBy: { criadoEm: "desc" }, take: HISTORICO });
  falas.reverse();
  while (falas.length && falas[0].papel !== "user") falas.shift();
  return falas.map((f) => ({ role: f.papel === "user" ? "user" : "model", parts: [{ text: f.texto }] }));
}

/** Uma pesquisa no Google, numa chamada à parte, devolvida como texto com as fontes. */
async function pesquisar(pergunta: string): Promise<string> {
  const r = await ia().models.generateContent({
    model: MODELO_PESQUISA,
    contents: `Hoje é ${agoraPorExtenso()} (fuso ${FUSO}). Pesquise e responda de forma objetiva, em português: ${pergunta}`,
    config: { tools: [{ googleSearch: {} }] },
  });
  const fontes = (r.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [])
    .map((c) => c.web)
    .filter((w) => w?.uri)
    .slice(0, 4)
    .map((w) => `- ${w!.title ?? w!.domain ?? "fonte"}: ${w!.uri}`);
  return `${r.text?.trim() || "(a pesquisa não trouxe resultado)"}${fontes.length ? `\n\nFontes:\n${fontes.join("\n")}` : ""}`;
}

async function rodarFerramenta(nome: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    if (nome === "pesquisar_na_internet") {
      const pergunta = typeof args.pergunta === "string" ? args.pergunta.trim() : "";
      if (!pergunta) throw new ErroDeFerramenta("'pergunta' precisa ser um texto.");
      return { resultado: await pesquisar(pergunta) };
    }
    return { resultado: await executar(nome, args) };
  } catch (e) {
    if (e instanceof ErroDeFerramenta) return { erro: e.message };
    console.error(`[ferramenta ${nome}]`, e);
    return { erro: "Erro interno ao executar a ferramenta." };
  }
}

/** A cota gratuita do dia acabou (ou o limite por minuto estourou). */
export class CotaEsgotada extends Error {}

/**
 * Responde a uma mensagem sua. `partes` é o que vai ao Gemini (pode ter foto ou
 * PDF); `resumo` é como ela fica no histórico, só texto — a foto não é
 * reenviada nas mensagens seguintes, o que gastaria a cota à toa.
 */
export async function responder(partes: Part[], resumo: string): Promise<string> {
  const conversa: Content[] = [...(await historico()), { role: "user", parts: partes }];
  const systemInstruction = await contexto();

  let resposta = "";
  for (let volta = 0; volta < VOLTAS; volta++) {
    let r;
    try {
      r = await ia().models.generateContent({
        model: MODELO,
        contents: conversa,
        config: {
          systemInstruction,
          tools: [
            {
              functionDeclarations: FERRAMENTAS.map((f) => ({
                name: f.name,
                description: f.description,
                parametersJsonSchema: f.parameters,
              })),
            },
          ],
        },
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) throw new CotaEsgotada(e.message);
      throw e;
    }

    const candidato = r.candidates?.[0];
    if (!candidato?.content?.parts?.length) {
      resposta = "Desculpa, essa eu não consigo responder. 🙏";
      break;
    }
    // A resposta volta inteira, com as "assinaturas de pensamento" que o Gemini
    // exige de volta para continuar o raciocínio depois de uma ferramenta.
    conversa.push(candidato.content);

    const chamadas = r.functionCalls ?? [];
    if (chamadas.length) {
      // Todas as respostas numa mensagem só, na mesma ordem dos pedidos.
      const respostas: Part[] = await Promise.all(
        chamadas.map(async (c) => ({
          functionResponse: {
            id: c.id,
            name: c.name,
            response: await rodarFerramenta(c.name ?? "", c.args ?? {}),
          },
        })),
      );
      conversa.push({ role: "user", parts: respostas });
      continue;
    }

    resposta = (r.text ?? "").trim();
    break;
  }

  if (!resposta) resposta = "Me enrolei aqui e não cheguei a uma resposta. Pode repetir de outro jeito?";

  // Horários explícitos: as duas gravações cairiam no mesmo milissegundo, e o
  // histórico não saberia qual veio primeiro.
  const agora = Date.now();
  await bd.mensagem.createMany({
    data: [
      { papel: "user", texto: resumo, criadoEm: new Date(agora) },
      { papel: "assistant", texto: resposta, criadoEm: new Date(agora + 1) },
    ],
  });
  return resposta;
}

/** Apaga a conversa guardada (não as memórias, lembretes ou listas). */
export async function esquecerConversa(): Promise<void> {
  await bd.mensagem.deleteMany({});
}
