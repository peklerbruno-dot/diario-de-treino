import { notFound } from "next/navigation";
import { bd } from "@/lib/bd";
import { categoria } from "@/lib/categorias";
import { linkDoGmail, mensagensReais } from "@/lib/conversas";
import { prazoPorExtenso } from "@/lib/datas";
import { anexos as anexosDe, cabecalho, corpoEmTexto, semCitacao, separarEndereco } from "@/lib/gmail";
import { lerThread, type ThreadGmail } from "@/lib/google";
import { Acoes } from "./acoes-da-conversa";
import { Anexos } from "./anexos";
import { PainelDeRascunho } from "./rascunho";

export const dynamic = "force-dynamic";

export default async function PaginaDaConversa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await bd.conversa.findUnique({
    where: { id },
    include: { conta: true, rascunhos: { orderBy: { criadoEm: "desc" }, take: 1 } },
  });
  if (!c) notFound();

  // O texto vem do Gmail na hora: a Central não guarda corpo de e-mail.
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
  const cat = categoria(c.categoria);

  return (
    <article className="mt-5">
      <div className="flex items-center gap-2 text-xs text-fosco">
        <span className="rounded-md bg-linha px-1.5 py-0.5 font-semibold text-grafite">{c.conta.rotulo}</span>
        <span>
          {cat.icone} {cat.nome}
          {c.corrigida ? " (corrigida por você)" : ""}
        </span>
        {c.prioridade === 1 && <span className="font-semibold text-atencao">prioridade alta</span>}
      </div>
      <h1 className="mt-2 font-titulo text-2xl leading-tight">{c.assunto}</h1>

      {(c.resumo || c.proximaAcao || prazo) && (
        <div className="mt-3 rounded-cartao bg-cartao p-4 shadow-cartao">
          {c.resumo && <p>{c.resumo}</p>}
          {c.proximaAcao && <p className="mt-2 font-semibold">→ {c.proximaAcao}</p>}
          {prazo && (
            <p className={`mt-2 text-sm font-semibold ${prazo.vencido || prazo.perto ? "text-atencao" : "text-alerta"}`}>
              ⏰ Prazo: {prazo.texto}
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

      <h2 className="mt-8 px-1 font-titulo text-xl">A conversa</h2>
      {erro && <p className="mt-2 text-sm text-atencao">Não deu para ler do Gmail: {erro}</p>}
      <div className="mt-2 space-y-3">
        {mensagens.map((m) => {
          const de = separarEndereco(cabecalho(m, "From"));
          const minha = de.email === c.conta.email.toLowerCase();
          const texto = semCitacao(corpoEmTexto(m));
          return (
            <div key={m.id} className={`rounded-cartao p-4 shadow-cartao ${minha ? "bg-linha" : "bg-cartao"}`}>
              <div className="flex justify-between gap-2 text-xs text-fosco">
                <span className="truncate font-semibold text-grafite">{minha ? "Você" : de.nome}</span>
                <span className="shrink-0">
                  {new Date(Number(m.internalDate)).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    day: "numeric",
                    month: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm">{texto || "(sem texto)"}</p>
            </div>
          );
        })}
      </div>
    </article>
  );
}
