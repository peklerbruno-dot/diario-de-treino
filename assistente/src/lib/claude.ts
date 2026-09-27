import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { bd } from "./bd";
import { FUSO, agoraPorExtenso } from "./datas";
import { ErroDeFerramenta, FERRAMENTAS, executar } from "./ferramentas";

/**
 * O laço da conversa: manda o histórico ao Claude, roda as ferramentas que ele
 * pedir, devolve o resultado e repete até ele ter a resposta.
 */

const MODELO = process.env.ANTHROPIC_MODELO || "claude-opus-5";

/**
 * Quanto ele pensa antes de responder. "medium" é o meio-termo para conversa de
 * WhatsApp: rápido o bastante para parecer uma pessoa digitando, e ainda
 * cuidadoso com datas e contas. "high" pensa mais e demora mais.
 */
const ESFORCO = (process.env.ANTHROPIC_ESFORCO || "medium") as "low" | "medium" | "high";

/** Quantas falas anteriores voltam a cada mensagem. */
const HISTORICO = 30;

/** Um teto de voltas, para uma ferramenta que falha sempre não virar um laço sem fim. */
const VOLTAS = 10;

const cliente = new Anthropic();

/** A parte do prompt que não muda — fica em cache, e cada mensagem sai mais barata. */
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
- Pesquisar na internet (web_search) quando a pergunta depender de algo atual: notícias, preços, horários, clima, resultados.
- Ler fotos e PDFs que ele mandar.

Cuidados:
- As datas que ele disser ("amanhã", "sexta", "daqui a 2 horas") são relativas ao "agora" informado abaixo, no fuso dele.
- Se um pedido for ambíguo a ponto de você poder errar algo que importa (um horário de remédio, um valor), pergunte. Senão, decida e diga o que decidiu.
- Você não consegue mandar mensagem para outras pessoas, fazer ligações, nem mexer na agenda ou no e-mail dele. Diga isso com franqueza quando pedirem.
- Não invente: se não souber e não der para pesquisar, diga.`;

async function contexto(): Promise<string> {
  const memorias = await bd.memoria.findMany({ orderBy: { criadoEm: "asc" } });
  const lista = memorias.length
    ? memorias.map((m) => `- (id ${m.id}) ${m.texto}`).join("\n")
    : "(nenhuma ainda)";
  return `Agora: ${agoraPorExtenso()} (fuso ${FUSO}).\n\nO que você guardou sobre ele:\n${lista}`;
}

/** As últimas falas, em ordem, começando sempre por uma do usuário (a API exige). */
async function historico(): Promise<Anthropic.Beta.BetaMessageParam[]> {
  const falas = await bd.mensagem.findMany({ orderBy: { criadoEm: "desc" }, take: HISTORICO });
  falas.reverse();
  while (falas.length && falas[0].papel !== "user") falas.shift();
  return falas.map((f) => ({ role: f.papel as "user" | "assistant", content: f.texto }));
}

async function rodarFerramentas(
  blocos: Anthropic.Beta.BetaContentBlock[],
): Promise<Anthropic.Beta.BetaToolResultBlockParam[]> {
  const pedidos = blocos.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
  // Todas as respostas numa mensagem só: separá-las ensina o modelo a parar de
  // pedir várias ferramentas de uma vez.
  return Promise.all(
    pedidos.map(async (p) => {
      try {
        const saida = await executar(p.name, (p.input ?? {}) as Record<string, unknown>);
        return { type: "tool_result" as const, tool_use_id: p.id, content: saida };
      } catch (e) {
        const msg = e instanceof ErroDeFerramenta ? e.message : "Erro interno ao executar a ferramenta.";
        if (!(e instanceof ErroDeFerramenta)) console.error(`[ferramenta ${p.name}]`, e);
        return { type: "tool_result" as const, tool_use_id: p.id, content: msg, is_error: true };
      }
    }),
  );
}

/**
 * Responde a uma mensagem sua. `conteudo` é o que vai ao Claude (pode ter foto
 * ou PDF); `resumo` é como ela fica no histórico, só texto — a foto não é
 * reenviada nas mensagens seguintes, o que as deixaria lentas e caras.
 */
export async function responder(
  conteudo: Anthropic.Beta.BetaContentBlockParam[],
  resumo: string,
): Promise<string> {
  const mensagens: Anthropic.Beta.BetaMessageParam[] = [
    ...(await historico()),
    { role: "user", content: conteudo },
  ];
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: INSTRUCOES, cache_control: { type: "ephemeral" } },
    { type: "text", text: await contexto() },
  ];
  const ferramentas: Anthropic.Beta.BetaToolUnion[] = [
    ...FERRAMENTAS,
    {
      type: "web_search_20260209",
      name: "web_search",
      max_uses: 3,
      user_location: { type: "approximate", country: "BR", timezone: FUSO },
    },
  ];

  let resposta = "";
  for (let volta = 0; volta < VOLTAS; volta++) {
    const r = await cliente.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      output_config: { effort: ESFORCO },
      // Se o modelo principal recusar, a própria API tenta outro na mesma chamada.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      tools: ferramentas,
      messages: mensagens,
    });

    if (r.stop_reason === "refusal") {
      resposta = "Desculpa, essa eu não consigo responder. 🙏";
      break;
    }

    mensagens.push({ role: "assistant", content: r.content });

    if (r.stop_reason === "tool_use") {
      mensagens.push({ role: "user", content: await rodarFerramentas(r.content) });
      continue;
    }
    // A pesquisa na internet roda nos servidores da Anthropic e pode pedir para
    // continuar: basta mandar de volta o que já veio.
    if (r.stop_reason === "pause_turn") continue;

    resposta = r.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
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
