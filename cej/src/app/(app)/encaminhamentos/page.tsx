import Link from "next/link";
import { exigirPessoa } from "@/lib/auth";
import { encaminhamentos as buscar, equipeAtiva } from "@/lib/consultas";
import { agrupar } from "@/lib/encaminhamentos";
import { ItemDeEncaminhamento, NovoEncaminhamento } from "@/componentes/encaminhamentos";
import { Cartao, Topo, Vazio } from "@/componentes/pecas";

export const dynamic = "force-dynamic";

/**
 * O painel de encaminhamentos.
 *
 * Abre pelos seus, porque é a pergunta que a pessoa tem quando clica aqui. Mas
 * a visão da equipe inteira fica a um clique — e não escondida —, já que a
 * outra pergunta legítima é "o que está parado com quem".
 *
 * Agrupado por urgência, nunca por data de cadastro: a ordem em que as coisas
 * foram anotadas não interessa a ninguém.
 */
export default async function Encaminhamentos({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; fechados?: string }>;
}) {
  const { de = "meus", fechados } = await searchParams;
  const pessoa = await exigirPessoa();
  const meus = de !== "todos";

  const [lista, equipe] = await Promise.all([
    buscar({
      responsavelId: meus ? pessoa.id : undefined,
      incluirFechados: fechados === "1",
    }),
    equipeAtiva(),
  ]);

  const caixas = agrupar(lista);

  return (
    <>
      <Topo
        titulo="Encaminhamentos"
        chamada="O que ficou combinado, com nome e prazo. Um encaminhamento sem responsável é um desejo; sem prazo, é um desejo para sempre."
      />

      <div className="nao-imprime mb-5 flex flex-wrap items-center gap-2">
        <Aba href={`/encaminhamentos?de=meus${fechados === "1" ? "&fechados=1" : ""}`} ativa={meus}>
          Na minha mão
        </Aba>
        <Aba href={`/encaminhamentos?de=todos${fechados === "1" ? "&fechados=1" : ""}`} ativa={!meus}>
          Da equipe inteira
        </Aba>
        <span className="mx-1 text-regua">·</span>
        <Aba href={`/encaminhamentos?de=${meus ? "meus" : "todos"}${fechados === "1" ? "" : "&fechados=1"}`} ativa={fechados === "1"}>
          Mostrar os já fechados
        </Aba>
      </div>

      {lista.length === 0 ? (
        <Vazio>
          {meus
            ? "Nada na sua mão. Encaminhamentos aparecem aqui quando alguém anota o seu nome numa reunião ou numa atividade."
            : "Nenhum encaminhamento em aberto na equipe."}
        </Vazio>
      ) : (
        <div className="space-y-5">
          {caixas.map((caixa) => (
            <Cartao key={caixa.urgencia} como="section">
              <h2
                className={`sobrescrito border-b border-linha px-4 py-2.5 ${
                  caixa.urgencia === "VENCIDO" ? "!text-vermelho" : ""
                }`}
              >
                {caixa.titulo} · {caixa.itens.length}
              </h2>
              <ul>
                {caixa.itens.map((item) => (
                  <ItemDeEncaminhamento
                    key={item.id}
                    item={item}
                    mostrarResponsavel={!meus}
                    mostrarOrigem
                  />
                ))}
              </ul>
            </Cartao>
          ))}
        </div>
      )}

      <Cartao como="section" className="nao-imprime mt-5">
        <h2 className="sobrescrito border-b border-linha px-4 py-2.5">Anotar um encaminhamento solto</h2>
        <p className="px-4 pt-3 text-[13.5px] leading-relaxed text-grafite">
          Para o que foi combinado fora de reunião. O que saiu de uma reunião, anote na página dela
          — assim fica ligado ao lugar onde foi decidido.
        </p>
        <NovoEncaminhamento equipe={equipe} />
      </Cartao>
    </>
  );
}

function Aba({ href, ativa, children }: { href: string; ativa: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-pilula px-3.5 py-1.5 text-[14px] ${
        ativa ? "bg-heroi font-semibold text-heroi-tinta" : "bg-cartao text-grafite shadow-baixa hover:bg-linha"
      }`}
    >
      {children}
    </Link>
  );
}
