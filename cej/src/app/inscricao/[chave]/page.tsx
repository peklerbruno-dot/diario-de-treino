import { notFound } from "next/navigation";
import { bd } from "@/lib/bd";
import { comDiaDaSemana, comMaiuscula, porExtenso } from "@/lib/datas";
import { linkDoGoogle } from "@/lib/agenda";
import { NOME_DO_TIPO } from "@/lib/tipos";
import { PaginaPublica } from "@/componentes/publico";
import { FormularioDeInscricao } from "./formulario";

export const dynamic = "force-dynamic";

/** Não vai para buscador: quem chega aqui veio pelo link que o Centro divulgou. */
export const metadata = { robots: { index: false, follow: false } };

export default async function Inscricao({ params }: { params: Promise<{ chave: string }> }) {
  const { chave } = await params;

  const a = await bd.atividade.findFirst({
    where: { chavePublica: chave, apagadaEm: null },
    include: {
      convidados: { orderBy: { ordem: "asc" } },
      _count: { select: { participacoes: true } },
    },
  });
  if (!a) notFound();

  const quando = a.diaFinal
    ? `De ${porExtenso(a.dia)} a ${porExtenso(a.diaFinal)}`
    : comMaiuscula(comDiaDaSemana(a.dia));

  const lotada = a.vagas != null && a._count.participacoes >= a.vagas;
  const fechada = !a.inscricaoAberta || a.estado === "CANCELADA";

  return (
    <PaginaPublica largura="larga">
      <p className="sobrescrito">{NOME_DO_TIPO[a.tipo]}</p>
      <h1 className="mt-1.5 font-titulo text-[32px] font-semibold leading-tight tracking-tight">
        {a.titulo}
      </h1>
      <p className="mt-3 text-[17px] leading-relaxed text-grafite">
        {quando}
        {a.hora && `, às ${a.hora}`}
        {a.local && (
          <>
            <br />
            {a.local}
          </>
        )}
      </p>

      {a.resumo && (
        <p className="escrito mt-5 max-w-leitura text-[16px] leading-relaxed">{a.resumo}</p>
      )}

      {a.convidados.length > 0 && (
        <div className="mt-5">
          <p className="sobrescrito">Com</p>
          <ul className="mt-1.5 space-y-0.5 text-[15.5px]">
            {a.convidados.map((c) => (
              <li key={c.id}>
                {c.nome}
                {c.instituicao && <span className="text-fosco"> · {c.instituicao}</span>}
                {c.funcao && <span className="text-fosco"> ({c.funcao})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8">
        {a.estado === "CANCELADA" ? (
          <p className="rounded-folha bg-cartao p-5 text-[15.5px] leading-relaxed text-vermelho ring-1 ring-vermelho/30">
            Esta atividade foi cancelada.
          </p>
        ) : fechada ? (
          <p className="rounded-folha bg-cartao p-5 text-[15.5px] leading-relaxed text-grafite ring-1 ring-regua">
            As inscrições para esta atividade não estão abertas. Ela continua de pé — escreva ao
            Centro se quiser participar.
          </p>
        ) : lotada ? (
          <p className="rounded-folha bg-cartao p-5 text-[15.5px] leading-relaxed text-ambar ring-1 ring-ambar/40">
            As vagas acabaram. Escreva ao Centro para entrar na lista de espera.
          </p>
        ) : (
          <>
            <h2 className="mb-3 font-titulo text-[21px] font-semibold tracking-tight">Inscreva-se</h2>
            <FormularioDeInscricao chave={chave} titulo={a.titulo} />
          </>
        )}
      </div>

      {a.estado !== "CANCELADA" && (
        <p className="mt-6">
          <a
            href={linkDoGoogle({
              uid: a.id, titulo: a.titulo, dia: a.dia, hora: a.hora,
              diaFinal: a.diaFinal, horaFinal: a.horaFinal, local: a.local,
              descricao: a.resumo, cancelado: false,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14.5px] text-realce hover:underline"
          >
            Guardar no Google Agenda ↗
          </a>
        </p>
      )}
    </PaginaPublica>
  );
}
