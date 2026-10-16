import "server-only";
import { bd } from "./bd";
import { linkDoGmail, mensagensEmTexto } from "./conversas";
import { cabecalho } from "./gmail";
import { lerThread, listarThreads } from "./google";
import { buscaParaPergunta, responderPergunta, type Fonte } from "./ia";

export interface Resposta {
  texto: string;
  busca: string;
  fontes: (Fonte & { link: string })[];
}

/**
 * Pergunte à Central: a pergunta vira uma busca do Gmail, a busca roda em
 * todas as contas, as conversas achadas vão para o modelo, e a resposta volta
 * citando de onde tirou cada coisa.
 */
export async function perguntar(pergunta: string): Promise<Resposta> {
  const busca = await buscaParaPergunta(pergunta);
  const contas = (await bd.conta.findMany({ orderBy: { criadoEm: "asc" } })).filter((c) => !c.erro);

  const achados = (
    await Promise.all(
      contas.map(async (conta) => {
        const ids = await listarThreads(conta, busca, 4).catch(() => []);
        return Promise.all(
          ids.map(async (id) => {
            const t = await lerThread(conta, id, "full").catch(() => null);
            if (!t?.messages?.length) return null;
            const ms = mensagensEmTexto(t.messages, 4, 2000);
            return {
              conta: conta.rotulo,
              assunto: cabecalho(t.messages[0], "Subject") || "(sem assunto)",
              texto: ms.map((m) => `[${m.data}] De: ${m.de}\n${m.texto}`).join("\n---\n"),
              link: linkDoGmail(conta.email, id),
            };
          }),
        );
      }),
    )
  )
    .flat()
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 10)
    .map((x, i) => ({ ...x, n: i + 1 }));

  const texto = await responderPergunta(pergunta, achados);
  return { texto, busca, fontes: achados };
}
