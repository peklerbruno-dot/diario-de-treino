import { bd } from "@/lib/bd";
import { linkDoGmail, mensagensReais } from "@/lib/conversas";
import { corDaConta } from "@/lib/cores";
import { diasDesde, prazoPorExtenso } from "@/lib/datas";
import { anexos as anexosDe, cabecalho, corpoEmTexto, semCitacao, separarEndereco } from "@/lib/gmail";
import { lerThread, type ThreadGmail } from "@/lib/google";
import { Ponto, Prazo } from "@/componentes/pecas";
import { DEPENDEM_DE_MIM, categoria, type Categoria } from "@/lib/categorias";
import { Suspense } from "react";
import { DossieCarregando, DossieDaConversa, ResumoCurto } from "./dossie";
import { Acoes } from "./acoes-da-conversa";
import { Anexos } from "./anexos";
import { PainelDeRascunho } from "./rascunho";
import { SobreContato } from "./contato";
import { SugestaoDeEvento } from "./evento";
import { compromissos } from "@/lib/agenda";
import { FUSO } from "@/lib/datas";

/**
 * Uma conversa aberta: o que a triagem concluiu (e, se ela é uma pendência,
 * o dossiê: por que é com você e o que aconteceu até aqui), as ações, o rascunho da
 * resposta, os anexos e, embaixo, as mensagens — lidas do Gmail na hora,
 * porque a Central não guarda corpo de e-mail.
 */
export async function DetalheConversa({ id, cobrar = false }: { id: string; cobrar?: boolean }) {
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
  const pendencia = [...DEPENDEM_DE_MIM, "aguardando"].includes(c.categoria as Categoria) && !c.resolvida;

  // O compromisso do e-mail, se for no futuro: já está em alguma agenda?
  let evento: { texto: string; jaNaAgenda: boolean } | null = null;
  if (c.eventoInicio && c.eventoFim && c.eventoTitulo && c.eventoFim.getTime() > Date.now()) {
    const doDia = await compromissos(contas, new Date(c.eventoInicio.getTime() - 3_600_000), new Date(c.eventoFim.getTime() + 3_600_000));
    const jaNaAgenda = doDia.some((e) => !e.diaInteiro && Math.abs(e.inicio.getTime() - c.eventoInicio!.getTime()) < 30 * 60_000);
    const quando = c.eventoInicio.toLocaleString("pt-BR", { timeZone: FUSO, weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
    const ate = c.eventoFim.toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
    evento = { texto: `${c.eventoTitulo} · ${quando}–${ate}`, jaNaAgenda };
  }

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
      {pendencia && c.proximaAcao ? (
        <>
          <h1 className="mt-2 text-[24px] font-semibold leading-snug tracking-tight">{c.proximaAcao}</h1>
          <p className="mt-1 text-[14px] text-fosco">
            {c.remetente.replace(/^Para: /, "")} · {c.assunto}
          </p>
        </>
      ) : (
        <h1 className="mt-2 text-[24px] font-semibold leading-snug tracking-tight">{c.assunto}</h1>
      )}

      {/* O que está na sua lista ganha a história inteira; o resto, a frase da triagem. */}
      {pendencia ? (
        <Suspense key={`d-${c.id}`} fallback={<DossieCarregando c={c} />}>
          <DossieDaConversa c={c} mensagens={mensagens} />
        </Suspense>
      ) : (
        <ResumoCurto c={c} />
      )}

      {evento && <SugestaoDeEvento key={`e-${c.id}`} id={c.id} texto={evento.texto} jaNaAgenda={evento.jaNaAgenda} />}

      <Acoes
        key={`a-${c.id}`}
        id={c.id}
        categoria={c.categoria}
        resolvida={c.resolvida}
        temPrazo={Boolean(c.prazo)}
        linkGmail={linkDoGmail(c.conta.email, c.threadId)}
      />

      <PainelDeRascunho
        key={`r-${c.id}`}
        id={c.id}
        ultimo={c.rascunhos[0] ? { texto: c.rascunhos[0].texto, contexto: c.rascunhos[0].contexto } : null}
        semEstilo={!c.conta.estilo}
        cobranca={c.categoria === "aguardando" ? { dias: diasDesde(c.ultimaData), automatica: cobrar } : null}
      />

      <SobreContato email={c.remetenteEmail} nome={c.remetente.replace(/^Para: /, "")} conversaAtual={c.id} />

      {anexos.length > 0 && <Anexos key={`x-${c.id}`} id={c.id} anexos={anexos} />}

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
