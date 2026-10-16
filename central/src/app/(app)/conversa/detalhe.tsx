import { bd } from "@/lib/bd";
import { linkDoGmail, mensagensReais } from "@/lib/conversas";
import { corDaConta } from "@/lib/cores";
import { prazoPorExtenso } from "@/lib/datas";
import { anexos as anexosDe, cabecalho, corpoEmTexto, semCitacao, separarEndereco } from "@/lib/gmail";
import { lerThread, type ThreadGmail } from "@/lib/google";
import { Conta, Etiqueta, Prazo } from "@/componentes/pecas";
import { Acoes } from "./acoes-da-conversa";
import { Anexos } from "./anexos";
import { PainelDeRascunho } from "./rascunho";

/**
 * Uma conversa aberta: o que a triagem concluiu, as ações, o rascunho da
 * resposta, os anexos e, embaixo, as mensagens — lidas do Gmail na hora,
 * porque a Central não guarda corpo de e-mail.
 */
export async function DetalheConversa({ id }: { id: string }) {
  const c = await bd.conversa.findUnique({
    where: { id },
    include: { conta: true, rascunhos: { orderBy: { criadoEm: "desc" }, take: 1 } },
  });
  if (!c) return <p className="py-10 text-sm text-fosco">Conversa não encontrada.</p>;
  const contas = await bd.conta.findMany({ orderBy: { criadoEm: "asc" } });
  const cor = corDaConta(contas, c.contaId);

  let thread: ThreadGmail | null = null;
  let erro = "";
  try {
    thread = await lerThread(c.conta, c.threadId, "full");
  } catch (e) {
    erro = (e as Error).message;
  }
  const mensagens = mensagensReais(thread?.messages);
  const anexos = mensagens.flatMap(anexosDe);
  const prazo = c.prazo ? prazoPorExtenso(c.prazo) : null;

  return (
    <article>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Conta rotulo={c.conta.rotulo} cor={cor} />
        <Etiqueta id={c.categoria} />
        {c.corrigida && <span className="text-mini text-fosco">corrigida por você</span>}
        {c.prioridade === 1 && <span className="text-mini font-semibold text-atencao">urgente</span>}
      </div>
      <h1 className="mt-2 text-[22px] font-semibold leading-snug tracking-tight">{c.assunto}</h1>

      {(c.resumo || c.proximaAcao || prazo) && (
        <div className="mt-4 border-l-[3px] pl-4" style={{ borderColor: cor }}>
          {c.resumo && <p className="text-[15px] leading-relaxed">{c.resumo}</p>}
          {c.proximaAcao && <p className="mt-1.5 text-[15px] font-semibold">→ {c.proximaAcao}</p>}
          {prazo && (
            <p className="mt-1">
              <Prazo {...prazo} />
            </p>
          )}
        </div>
      )}

      <Acoes
        id={c.id}
        categoria={c.categoria}
        resolvida={c.resolvida}
        temPrazo={Boolean(c.prazo)}
        linkGmail={linkDoGmail(c.conta.email, c.threadId)}
      />

      <PainelDeRascunho
        id={c.id}
        ultimo={c.rascunhos[0] ? { texto: c.rascunhos[0].texto, contexto: c.rascunhos[0].contexto } : null}
        semEstilo={!c.conta.estilo}
      />

      {anexos.length > 0 && <Anexos id={c.id} anexos={anexos} />}

      <h2 className="mb-2 mt-10 border-b border-linha pb-1.5 text-mini font-semibold uppercase tracking-[0.08em] text-fosco">
        A conversa · {mensagens.length} {mensagens.length === 1 ? "mensagem" : "mensagens"}
      </h2>
      {erro && <p className="mt-2 text-sm text-atencao">Não deu para ler do Gmail: {erro}</p>}
      <div>
        {mensagens.map((m) => {
          const de = separarEndereco(cabecalho(m, "From"));
          const minha = de.email === c.conta.email.toLowerCase();
          const texto = semCitacao(corpoEmTexto(m));
          return (
            <div key={m.id} className="border-b border-linha py-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-semibold">{minha ? "Você" : de.nome}</span>
                <span className="numeros shrink-0 text-mini text-fosco">
                  {new Date(Number(m.internalDate)).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className={`mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed lg:text-sm ${minha ? "text-grafite" : ""}`}>
                {texto || "(sem texto)"}
              </p>
            </div>
          );
        })}
      </div>
    </article>
  );
}
