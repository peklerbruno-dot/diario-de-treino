import Link from "next/link";
import { comDiaDaSemana, curto } from "@/lib/datas";
import { NOME_DO_TIPO, type EstadoDaAtividade, type TipoDeAtividade } from "@/lib/tipos";
import { SeloDoEstado } from "./pecas";

/**
 * As linhas de lista que aparecem em mais de uma tela.
 *
 * Uma atividade tem que se parecer consigo mesma no painel, no calendário e na
 * busca — senão a pessoa reaprende a ler a cada tela.
 */

export function LinhaDeAtividade({
  atividade,
  mostrarEstado = true,
}: {
  atividade: {
    id: string;
    titulo: string;
    tipo: TipoDeAtividade;
    estado: EstadoDaAtividade;
    dia: string;
    hora: string | null;
    local: string | null;
    responsavel: { nome: string } | null;
  };
  mostrarEstado?: boolean;
}) {
  return (
    <li className="border-b border-linha last:border-b-0">
      <Link
        href={`/atividades/${atividade.id}`}
        className="flex items-start gap-3 px-4 py-3 hover:bg-linha/60"
      >
        <span className="tabular w-[80px] shrink-0 pt-[2px] text-[13px] leading-snug text-fosco">
          {curto(atividade.dia)}
          {atividade.hora && <span className="block">{atividade.hora}</span>}
        </span>

        {/* Título numa linha, detalhe em outra: emendados, os dois viravam um
            parágrafo só quando o título era comprido — que é o caso normal. */}
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium leading-snug">{atividade.titulo}</span>
          <span className="mt-0.5 block text-[13px] text-fosco">
            {[
              NOME_DO_TIPO[atividade.tipo],
              atividade.local,
              atividade.responsavel?.nome,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>

        {mostrarEstado && (
          <span className="shrink-0 pt-[2px]">
            <SeloDoEstado estado={atividade.estado} />
          </span>
        )}
      </Link>
    </li>
  );
}

export function LinhaDeReuniao({
  reuniao,
}: {
  reuniao: { id: string; titulo: string; dia: string; hora: string | null; local: string | null };
}) {
  return (
    <li className="border-b border-linha last:border-b-0">
      <Link
        href={`/reunioes/${reuniao.id}`}
        className="flex flex-wrap items-baseline gap-x-3 px-4 py-3 hover:bg-linha/60"
      >
        <span className="min-w-0 flex-1 text-[15px] font-medium">{reuniao.titulo}</span>
        <span className="text-[13px] text-fosco">
          {comDiaDaSemana(reuniao.dia)}
          {reuniao.hora ? `, ${reuniao.hora}` : ""}
          {reuniao.local ? ` · ${reuniao.local}` : ""}
        </span>
      </Link>
    </li>
  );
}
