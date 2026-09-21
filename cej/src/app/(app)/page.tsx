import { exigirPessoa } from "@/lib/auth";
import { comDiaDaSemana, hoje } from "@/lib/datas";
import {
  atividadesEsperandoFecho, encaminhamentos, proximasAtividades, proximasReunioes,
} from "@/lib/consultas";
import { agrupar } from "@/lib/encaminhamentos";
import { LinhaDeAtividade, LinhaDeReuniao } from "@/componentes/itens";
import { ItemDeEncaminhamento } from "@/componentes/encaminhamentos";
import { BotaoLink, Cartao, Chamada, Sobrescrito, Subtitulo, Titulo, Vazio } from "@/componentes/pecas";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * O painel.
 *
 * A pergunta que ele responde não é "o que existe no sistema" — para isso há as
 * outras telas. É "o que eu preciso ver hoje". Por isso ele abre pelo que está
 * na sua mão e atrasado, e não pelo calendário: o calendário é bonito e não
 * cobra nada de ninguém.
 */
export default async function Painel() {
  const pessoa = await exigirPessoa();
  const [meus, atividades, reunioes, esperandoFecho] = await Promise.all([
    encaminhamentos({ responsavelId: pessoa.id }),
    proximasAtividades(6),
    proximasReunioes(3),
    atividadesEsperandoFecho(),
  ]);

  const caixas = agrupar(meus);
  const urgentes = caixas.filter((c) => c.urgencia === "VENCIDO" || c.urgencia === "HOJE");

  return (
    <>
      <div className="mb-7">
        <Sobrescrito>{comDiaDaSemana(hoje())}</Sobrescrito>
        <Titulo className="mt-1">{saudacao(pessoa.nome)}</Titulo>
        <Chamada>
          {meus.length === 0
            ? "Você não tem nenhum encaminhamento em aberto."
            : urgentes.length > 0
              ? `Você tem ${contar(urgentes.reduce((s, c) => s + c.itens.length, 0), "encaminhamento")} pedindo atenção hoje.`
              : `Você tem ${contar(meus.length, "encaminhamento")} em aberto, nenhum vencendo hoje.`}
        </Chamada>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-5">
          {urgentes.length > 0 && (
            <Cartao como="section">
              <div className="flex items-center justify-between gap-3 border-b border-linha px-4 py-3">
                <Subtitulo>Na sua mão, agora</Subtitulo>
                <Link href="/encaminhamentos" className="text-[13.5px] text-realce hover:underline">
                  ver todos
                </Link>
              </div>
              {urgentes.map((caixa) => (
                <div key={caixa.urgencia}>
                  <p className="sobrescrito border-b border-linha bg-papel px-4 py-1.5">
                    {caixa.titulo}
                  </p>
                  <ul>
                    {caixa.itens.map((item) => (
                      <ItemDeEncaminhamento
                        key={item.id}
                        item={item}
                        mostrarResponsavel={false}
                        mostrarOrigem
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </Cartao>
          )}

          <Cartao como="section">
            <div className="flex items-center justify-between gap-3 border-b border-linha px-4 py-3">
              <Subtitulo>O que vem pela frente</Subtitulo>
              <Link href="/atividades" className="text-[13.5px] text-realce hover:underline">
                todas as atividades
              </Link>
            </div>
            {atividades.length === 0 ? (
              <div className="p-4">
                <Vazio acao={<BotaoLink href="/atividades/nova" tipo="primario">Cadastrar uma atividade</BotaoLink>}>
                  Nenhuma atividade marcada daqui para a frente.
                </Vazio>
              </div>
            ) : (
              <ul>
                {atividades.map((a) => (
                  <LinhaDeAtividade key={a.id} atividade={a} />
                ))}
              </ul>
            )}
          </Cartao>
        </div>

        <div className="space-y-5">
          <Cartao como="section">
            <div className="flex items-center justify-between gap-3 border-b border-linha px-4 py-3">
              <Subtitulo>Próximas reuniões</Subtitulo>
              <Link href="/reunioes" className="text-[13.5px] text-realce hover:underline">
                todas
              </Link>
            </div>
            {reunioes.length === 0 ? (
              <div className="p-4">
                <Vazio acao={<BotaoLink href="/reunioes/nova">Marcar uma reunião</BotaoLink>}>
                  Nenhuma reunião marcada.
                </Vazio>
              </div>
            ) : (
              <ul>
                {reunioes.map((r) => (
                  <LinhaDeReuniao key={r.id} reuniao={r} />
                ))}
              </ul>
            )}
          </Cartao>

          {esperandoFecho.length > 0 && (
            <Cartao como="section">
              <div className="border-b border-linha px-4 py-3">
                <Subtitulo>Já aconteceram?</Subtitulo>
                <p className="mt-1 text-[13.5px] leading-relaxed text-grafite">
                  A data passou há mais de uma semana e estas atividades continuam em aberto. Se
                  aconteceram, marque como realizadas — é o que faz o relatório sair certo em
                  dezembro.
                </p>
              </div>
              <ul>
                {esperandoFecho.slice(0, 6).map((a) => (
                  <LinhaDeAtividade key={a.id} atividade={a} />
                ))}
              </ul>
            </Cartao>
          )}
        </div>
      </div>
    </>
  );
}

function saudacao(nome: string): string {
  return `Olá, ${nome.split(" ")[0]}`;
}

const contar = (quantos: number, palavra: string) =>
  quantos === 1 ? `1 ${palavra}` : `${quantos} ${palavra}s`;
