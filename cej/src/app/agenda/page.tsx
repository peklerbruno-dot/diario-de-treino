import { agendaPublica } from "@/lib/consultas-contatos";
import { comDiaDaSemana, comMaiuscula, porExtenso } from "@/lib/datas";
import { linkDoGoogle } from "@/lib/agenda";
import { NOME_DO_TIPO } from "@/lib/tipos";
import { PaginaPublica } from "@/componentes/publico";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Agenda — Centro de Estudos Judaicos da USP",
  description: "As próximas atividades do Centro de Estudos Judaicos da Universidade de São Paulo.",
};

/**
 * A agenda aberta.
 *
 * O filtro é a própria situação da atividade: aparece aqui o que a equipe
 * marcou como **divulgação**, que já quer dizer "está de pé e pode ser
 * anunciada". Não há uma segunda chavinha de "publicar" — duas chaves para a
 * mesma decisão viram duas verdades, e um dia a atividade está divulgada lá
 * dentro e escondida aqui fora.
 *
 * É a única página do sistema que vai para buscador, e é de propósito: ela
 * existe para ser achada.
 */
export default async function Agenda() {
  const atividades = await agendaPublica();

  return (
    <PaginaPublica largura="larga">
      <h1 className="font-titulo text-[32px] font-semibold leading-tight tracking-tight">
        Próximas atividades
      </h1>
      <p className="mt-2.5 max-w-leitura text-[16px] leading-relaxed text-grafite">
        Palestras, cursos, oficinas e encontros promovidos pelo Centro de Estudos Judaicos da USP.
        Abertos à comunidade da universidade e ao público em geral.
      </p>

      {atividades.length === 0 ? (
        <p className="mt-10 rounded-folha bg-cartao p-6 text-[15.5px] leading-relaxed text-grafite ring-1 ring-regua">
          Não há atividades marcadas no momento. Volte em breve — o semestre do Centro costuma se
          desenhar com algumas semanas de antecedência.
        </p>
      ) : (
        <ul className="mt-9 space-y-6">
          {atividades.map((a) => (
            <li key={a.id} className="border-b border-linha pb-6 last:border-b-0">
              <p className="sobrescrito">{NOME_DO_TIPO[a.tipo]}</p>
              <h2 className="mt-1 font-titulo text-[22px] font-semibold leading-snug tracking-tight">
                {a.titulo}
              </h2>
              <p className="mt-1.5 text-[15px] text-grafite">
                {a.diaFinal
                  ? `De ${porExtenso(a.dia)} a ${porExtenso(a.diaFinal)}`
                  : comMaiuscula(comDiaDaSemana(a.dia))}
                {a.hora && `, às ${a.hora}`}
                {a.local && ` · ${a.local}`}
              </p>

              {a.convidados.length > 0 && (
                <p className="mt-1.5 text-[14.5px] text-grafite">
                  Com {a.convidados.map((c) => (c.instituicao ? `${c.nome} (${c.instituicao})` : c.nome)).join(", ")}
                </p>
              )}

              {a.resumo && (
                <p className="escrito mt-2.5 max-w-leitura text-[15.5px] leading-relaxed">{a.resumo}</p>
              )}

              <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[14.5px]">
                {a.inscricaoAberta && a.chavePublica && (
                  <a href={`/inscricao/${a.chavePublica}`} className="font-semibold text-realce hover:underline">
                    Inscrever-se →
                  </a>
                )}
                <a
                  href={linkDoGoogle({
                    uid: a.id, titulo: a.titulo, dia: a.dia, hora: a.hora,
                    diaFinal: a.diaFinal, horaFinal: a.horaFinal, local: a.local,
                    descricao: a.resumo, cancelado: false,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-realce hover:underline"
                >
                  Google Agenda ↗
                </a>
              </p>
            </li>
          ))}
        </ul>
      )}
    </PaginaPublica>
  );
}
