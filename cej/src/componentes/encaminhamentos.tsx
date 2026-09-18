import Link from "next/link";
import {
  apagarEncaminhamento, criarEncaminhamento, mudarEstadoDoEncaminhamento,
} from "@/app/(app)/encaminhamentos/acoes";
import { comoPrazo } from "@/lib/datas";
import { urgenciaVisivel } from "@/lib/encaminhamentos";
import type { EstadoDoEncaminhamento } from "@/lib/tipos";
import { Botao } from "./pecas";

/**
 * O encaminhamento, em uma linha — a mesma em toda tela: no painel, na lista
 * geral, dentro da reunião e dentro da atividade.
 *
 * Havia duas versões disto, e a diferença entre elas era um bug: a da lista não
 * tinha a caixa de marcar. Quer dizer que a tela em que a pessoa mais quer
 * riscar coisa da lista era justamente a que não deixava. Uma linha só, sempre
 * com a caixa.
 *
 * A caixa é um botão de formulário, não um `checkbox` de verdade. Um checkbox
 * pediria JavaScript para valer alguma coisa, e sem JavaScript ficaria uma
 * caixa que se marca e não guarda nada — pior do que não ter.
 */
export function ItemDeEncaminhamento({
  item,
  mostrarResponsavel = true,
  mostrarOrigem = false,
}: {
  item: {
    id: string;
    oQue: string;
    prazo: string | null;
    estado: EstadoDoEncaminhamento;
    observacao?: string | null;
    responsavel: { nome: string } | null;
    reuniao?: { id: string; titulo: string } | null;
    atividade?: { id: string; titulo: string } | null;
  };
  mostrarResponsavel?: boolean;
  /** Fora da reunião ou da atividade de origem, é ela que dá o contexto. */
  mostrarOrigem?: boolean;
}) {
  const origem = item.reuniao
    ? { href: `/reunioes/${item.reuniao.id}`, texto: item.reuniao.titulo }
    : item.atividade
      ? { href: `/atividades/${item.atividade.id}`, texto: item.atividade.titulo }
      : null;

  const feito = item.estado === "FEITO";
  const cancelado = item.estado === "CANCELADO";
  const atrasado = urgenciaVisivel(item) === "VENCIDO";

  return (
    <li className="flex items-start gap-3 border-b border-linha px-4 py-3 last:border-b-0">
      <form action={mudarEstadoDoEncaminhamento} className="pt-[3px]">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="estado" value={feito ? "ABERTO" : "FEITO"} />
        <button
          type="submit"
          aria-label={feito ? `Reabrir: ${item.oQue}` : `Marcar como feito: ${item.oQue}`}
          className={`flex h-[20px] w-[20px] items-center justify-center rounded-[6px] border text-[12px] font-bold ${
            feito ? "border-verde bg-verde text-white" : "border-regua hover:border-realce"
          }`}
        >
          {feito ? "✓" : ""}
        </button>
      </form>

      <div className="min-w-0 flex-1">
        <p
          className={`text-[15px] leading-snug ${
            feito || cancelado ? "text-fosco line-through" : ""
          }`}
        >
          {item.oQue}
        </p>
        {mostrarOrigem && origem && (
          <Link href={origem.href} className="text-[12.5px] text-realce hover:underline">
            {origem.texto}
          </Link>
        )}
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-[12.5px] text-fosco">
          {mostrarResponsavel && <span>{item.responsavel?.nome ?? "sem responsável"}</span>}
          {item.prazo && (
            <span className={atrasado ? "font-semibold text-vermelho" : ""}>
              {comoPrazo(item.prazo)}
            </span>
          )}
          {cancelado && <span>cancelado</span>}
        </p>
        {item.observacao && <p className="escrito mt-1 text-[13px] text-grafite">{item.observacao}</p>}
      </div>

      <form action={apagarEncaminhamento} className="nao-imprime pt-[2px]">
        <input type="hidden" name="id" value={item.id} />
        <button
          type="submit"
          aria-label={`Apagar: ${item.oQue}`}
          className="rounded-pilula px-2 py-1 text-[12px] text-fosco hover:bg-linha hover:text-vermelho"
        >
          apagar
        </button>
      </form>
    </li>
  );
}

/**
 * A linha de cadastro, embaixo da lista.
 *
 * Os três campos ficam sempre visíveis, e não atrás de um botão "adicionar":
 * numa reunião, o encaminhamento é escrito enquanto alguém fala. Um clique a
 * mais é o clique em que a frase se perde.
 */
export function NovoEncaminhamento({
  equipe,
  reuniaoId,
  atividadeId,
}: {
  equipe: { id: string; nome: string }[];
  reuniaoId?: string;
  atividadeId?: string;
}) {
  return (
    <form
      action={criarEncaminhamento}
      className="nao-imprime flex flex-wrap items-end gap-2 border-t border-linha bg-papel px-4 py-3"
    >
      {reuniaoId && <input type="hidden" name="reuniaoId" value={reuniaoId} />}
      {atividadeId && <input type="hidden" name="atividadeId" value={atividadeId} />}

      <label className="min-w-[200px] flex-[3]">
        <span className="sobrescrito">O quê</span>
        <input
          name="oQue"
          required
          placeholder="Confirmar a sala com a secretaria"
          className="mt-1 w-full rounded-folha border border-regua bg-cartao px-3 py-2 outline-none focus:border-realce"
        />
      </label>

      <label className="min-w-[130px] flex-1">
        <span className="sobrescrito">Quem</span>
        <select
          name="responsavelId"
          className="mt-1 w-full rounded-folha border border-regua bg-cartao px-3 py-2 outline-none focus:border-realce"
        >
          <option value="">— ninguém —</option>
          {equipe.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="min-w-[140px]">
        <span className="sobrescrito">Até quando</span>
        <input
          name="prazo"
          type="date"
          className="mt-1 w-full rounded-folha border border-regua bg-cartao px-3 py-2 outline-none focus:border-realce"
        />
      </label>

      <Botao tipo="secundario">Anotar</Botao>
    </form>
  );
}
