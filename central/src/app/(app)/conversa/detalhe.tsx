import { bd } from "@/lib/bd";
import { linkDoGmail, mensagensReais } from "@/lib/conversas";
import { corDaConta } from "@/lib/cores";
import { prazoPorExtenso } from "@/lib/datas";
import { anexos as anexosDe, cabecalho, corpoEmTexto, semCitacao, separarEndereco } from "@/lib/gmail";
import { lerThread, type ThreadGmail } from "@/lib/google";
import { Ponto, Prazo } from "@/componentes/pecas";
import { categoria } from "@/lib/categorias";
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
      <p className="flex items-center gap-2 text-[13px] text-fosco">
        <Ponto cor={cor} />
        {c.conta.rotulo} · {categoria(c.categoria).nome}
        {prazo && (
          <>
            {" · "}
            <Prazo {...prazo} />
          </>
        )}
      </p>
      <h1 className="mt-2 text-[24px] font-semibold leading-snug tracking-tight">{c.assunto}</h1>

      {(c.resumo || c.proximaAcao) && (
        <div className="mt-5 space-y-1.5 text-[16px] leading-relaxed">
          {c.resumo && <p className="text-grafite">{c.resumo}</p>}
          {c.proximaAcao && <p>{c.proximaAcao}.</p>}
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

      {mensagens.length > 0 && (
        <h2 className="mb-1 mt-12 text-[13px] font-semibold text-fosco">
          {mensagens.length} {mensagens.length === 1 ? "mensagem" : "mensagens"}
        </h2>
      )}
      {erro && (
        <p className="mt-12 text-[15px] text-fosco" title={erro}>
          Não deu para carregar as mensagens agora. Abra no Gmail ou tente daqui a pouco.
        </p>
      )}
      <div>
        {mensagens.map((m) => {
          const de = separarEndereco(cabecalho(m, "From"));
          const minha = de.email === c.conta.email.toLowerCase();
          const texto = semCitacao(corpoEmTexto(m));
          return (
            <div key={m.id} className="border-t border-linha py-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[15px] font-medium">{minha ? "Você" : de.nome}</span>
                <span className="numeros shrink-0 text-[13px] text-fosco">
                  {new Date(Number(m.internalDate)).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className={`mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed ${minha ? "text-grafite" : ""}`}>
                {texto || "(sem texto)"}
              </p>
            </div>
          );
        })}
      </div>
    </article>
  );
}
