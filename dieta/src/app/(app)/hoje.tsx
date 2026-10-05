"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { beberAgua, desfazerAgua } from "@/app/acoes";
import { ConviteDeAvisos } from "@/componentes/avisos";
import { BotaoDeFoto, Miniaturas } from "@/componentes/foto-do-prato";
import { PossoTrocar } from "@/componentes/posso-trocar";
import { IconeGota } from "@/componentes/icones";
import { ESTADOS, FichaDaRefeicao, type Estado } from "@/componentes/ficha";
import { Botao, Cartao, Titulo } from "@/componentes/pecas";
import { litros, type Ajustes } from "@/lib/ajustes";
import { ritmoDaAgua } from "@/lib/agenda";
import { resumir, type Conteudo } from "@/lib/conteudo";
import { milhar, somarDia } from "@/lib/analise";
import type { Atalhos, FotoDoDia, Marca, RefeicaoCompleta } from "@/lib/consultas";
import { paraEstaRefeicao, type RefeicaoPadrao } from "@/lib/refeicoes-padrao";
import { ehFome, ehHumor, FOMES, HUMORES } from "@/lib/padroes";
import { type Agora, diaPorExtenso, horaFalada, paraMinutos, valeNoDia } from "@/lib/datas";

type Props = {
  agora: Agora;
  temPlano: boolean;
  orientacoes: string;
  refeicoes: RefeicaoCompleta[];
  marcas: Record<string, Marca>;
  agua: number;
  fotos: FotoDoDia[];
  sequencia: number;
  ajustes: Ajustes;
  chavePublica: string;
  atalhos: Record<string, Atalhos>;
  /** As minhas refeições (as padrão), de todas as refeições; cada cartão pega as suas. */
  padroes: RefeicaoPadrao[];
};

/** O app do Diário de treino, deste mesmo repositório. */
const DIARIO = process.env.NEXT_PUBLIC_DIARIO_URL || "https://diario-de-treino-lemon.vercel.app";

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function TelaHoje(p: Props) {
  const feitas = p.refeicoes.filter((r) => p.marcas[r.id]).length;

  // A próxima é a primeira ainda não marcada cujo horário não passou há mais de
  // uma hora. A que passou há mais tempo e não foi marcada fica quieta, sem
  // destaque — ela pede um toque, não uma bronca.
  const proxima = p.refeicoes.find((r) => !p.marcas[r.id] && (paraMinutos(r.horario) ?? 0) + 60 > p.agora.minutos);

  // A foto sugere a refeição mais perto da hora atual, marcada ou não.
  const maisPerto = [...p.refeicoes].sort(
    (a, b) => Math.abs((paraMinutos(a.horario) ?? 0) - p.agora.minutos) - Math.abs((paraMinutos(b.horario) ?? 0) - p.agora.minutos),
  )[0];
  const doDia = somarDia(p.fotos.map((f) => f.analise));
  const foraDoPlano = p.fotos.filter((f) => !f.refeicaoId || !p.refeicoes.some((r) => r.id === f.refeicaoId));

  return (
    <>
      <Titulo
        depois={
          p.refeicoes.length > 0 && (
            <span className="pb-1 text-[15px] text-fosco tabular">
              {feitas} de {p.refeicoes.length}
            </span>
          )
        }
      >
        <span className="block text-[15px] font-normal text-fosco">{maiuscula(diaPorExtenso(p.agora.dia))}</span>
        Hoje
      </Titulo>

      {(p.sequencia > 0 || doDia.fotos > 0) && (
        <div className="-mt-2 mb-3 flex flex-wrap gap-2 text-[13.5px]">
          {p.sequencia > 0 && (
            <span className="rounded-full bg-folha-clara px-3 py-1 font-medium text-folha">
              🔥 {p.sequencia} {p.sequencia === 1 ? "dia" : "dias seguidos"} no plano
            </span>
          )}
          {doDia.fotos > 0 && (
            <span className="rounded-full bg-cartao px-3 py-1 text-grafite shadow-cartao">
              ≈ {milhar(doDia.calorias)} kcal pelas fotos · {doDia.proteinas} g prot.
            </span>
          )}
        </div>
      )}

      {p.temPlano && <ConviteDeAvisos chavePublica={p.chavePublica} />}

      {!p.temPlano && (
        <Cartao className="mb-4">
          <p className="text-[18px] font-semibold">Comece pelo plano da nutricionista</p>
          <p className="mt-1 text-[15px] leading-snug text-grafite">
            Mande o PDF ou as fotos do plano: o app lê as refeições, os horários e as substituições, e você confere
            antes de salvar.
          </p>
          <Link href="/plano/novo" className="mt-4 inline-block rounded-folha bg-folha px-4 py-2.5 font-medium text-sobre-cor">
            Ler o plano
          </Link>
        </Cartao>
      )}


      {p.temPlano && p.refeicoes.length === 0 && (
        <Cartao className="mt-4">
          <p className="text-grafite">Nenhuma refeição no plano para hoje.</p>
        </Cartao>
      )}

      <div className="space-y-3">
        {p.refeicoes.map((r) => (
          <CartaoRefeicao
            key={r.id}
            dia={p.agora.dia}
            refeicao={r}
            marca={p.marcas[r.id]}
            proxima={proxima?.id === r.id}
            fotos={p.fotos.filter((f) => f.refeicaoId === r.id)}
            atalhos={p.atalhos[r.nome]}
            padroes={p.padroes}
            passou={(paraMinutos(r.horario) ?? 0) < p.agora.minutos}
          />
        ))}
      </div>

      {p.temPlano && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <BotaoDeFoto dia={p.agora.dia} refeicoes={p.refeicoes} rotulo="＋ Outra coisa" />
          <PossoTrocar refeicoes={p.refeicoes} sugerida={maisPerto?.id} />
        </div>
      )}

      {foraDoPlano.length > 0 && (
        <Cartao className="mt-3">
          <p className="font-semibold">Fora das refeições do plano</p>
          <Miniaturas fotos={foraDoPlano} />
        </Cartao>
      )}

      <div className="mt-4">
        <CartaoAgua agua={p.agua} ajustes={p.ajustes} minutos={p.agora.minutos} />
      </div>

      {p.ajustes.treinoAvisos && valeNoDia(p.ajustes.treinoDias, p.agora.diaDaSemana) && (
        <Cartao className="mt-4 !bg-agua-clara">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">🏋️ Dia de treino · {horaFalada(p.ajustes.treinoHora)}</p>
              {p.ajustes.preTreino && <p className="mt-1 text-[14.5px] text-grafite">Pré: {p.ajustes.preTreino}</p>}
              {p.ajustes.posTreino && <p className="text-[14.5px] text-grafite">Pós: {p.ajustes.posTreino}</p>}
            </div>
            <a href={DIARIO} className="shrink-0 rounded-full bg-cartao px-3 py-1.5 text-[13.5px] font-medium text-agua shadow-cartao">
              Diário de treino ↗
            </a>
          </div>
        </Cartao>
      )}

      {p.orientacoes && (
        <details className="mt-4 rounded-cartao bg-cartao p-4 shadow-cartao">
          <summary className="cursor-pointer font-medium">Orientações da nutricionista</summary>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-grafite">{p.orientacoes}</p>
        </details>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Água
// ---------------------------------------------------------------------------

function CartaoAgua({ agua, ajustes, minutos }: { agua: number; ajustes: Ajustes; minutos: number }) {
  const [, iniciar] = useTransition();
  const [otimista, somar] = useOptimistic(agua, (atual, delta: number) => Math.max(0, atual + delta));
  const fracao = Math.min(1, otimista / ajustes.aguaMeta);
  const ritmo = Math.min(1, ritmoDaAgua(ajustes, minutos) / ajustes.aguaMeta);
  const bateu = otimista >= ajustes.aguaMeta;

  const beber = (ml: number) =>
    iniciar(async () => {
      somar(ml);
      await beberAgua(ml);
    });

  return (
    <Cartao id="agua">
      <div className="flex items-baseline justify-between">
        <p className="flex items-center gap-1.5 font-semibold">
          <IconeGota className="h-5 w-5 text-agua" /> Água
        </p>
        <p className="tabular text-[15px] text-grafite">
          <span className="text-[20px] font-semibold text-tinta">{litros(otimista)}</span> de {litros(ajustes.aguaMeta)}
        </p>
      </div>

      <div
        className="relative mt-3 h-3 overflow-hidden rounded-full bg-agua-clara"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={ajustes.aguaMeta}
        aria-valuenow={otimista}
        aria-label="Água bebida hoje"
      >
        <div className="h-full rounded-full bg-agua transition-[width] duration-300" style={{ width: `${fracao * 100}%` }} />
        {/* O tracinho é onde você deveria estar a esta hora para fechar a meta no fim do dia. */}
        {!bateu && ritmo > 0 && ritmo < 1 && (
          <div className="absolute top-0 h-full w-0.5 bg-tinta/40" style={{ left: `${ritmo * 100}%` }} />
        )}
      </div>
      <p className="mt-1.5 text-[13px] text-fosco">
        {bateu ? "Meta do dia batida. 🎉" : `Faltam ${litros(ajustes.aguaMeta - otimista)}. O tracinho é o ritmo para chegar lá.`}
      </p>

      <div className="mt-3 flex gap-2">
        <Botao tipo="primario" className="flex-1 !bg-agua" aria-label={`Bebi um copo, ${litros(ajustes.copo)}`} onClick={() => beber(ajustes.copo)}>
          + 1 copo
        </Botao>
        <Botao onClick={() => beber(ajustes.copo * 2)}>+ {litros(ajustes.copo * 2)}</Botao>
        {otimista > 0 && (
          <Botao
            tipo="fantasma"
            aria-label="Desfazer o último copo"
            onClick={() =>
              iniciar(async () => {
                await desfazerAgua();
              })
            }
          >
            ↶
          </Botao>
        )}
      </div>
    </Cartao>
  );
}

// ---------------------------------------------------------------------------
// Refeição
// ---------------------------------------------------------------------------

/**
 * Uma refeição do dia, em três jeitos:
 *  - registrada: um resumo (como foi, o que comeu, os emojis, a foto), e um
 *    toque reabre a ficha para mudar;
 *  - a próxima: aberta e em destaque, com o que o plano sugere e os três botões;
 *  - as outras: fechadas numa linha, que abre ao tocar.
 * Os três botões abrem a ficha (componentes/ficha.tsx) já no estado tocado.
 */
function CartaoRefeicao({
  dia,
  refeicao: r,
  marca,
  proxima,
  fotos,
  atalhos,
  padroes: todos,
  passou,
}: {
  dia: string;
  refeicao: RefeicaoCompleta;
  marca?: Marca;
  proxima: boolean;
  /** O horário já passou e ela não foi registrada. */
  passou: boolean;
  fotos: FotoDoDia[];
  atalhos?: Atalhos;
  padroes: RefeicaoPadrao[];
}) {
  const [aberta, setAberta] = useState(proxima);
  const [ficha, setFicha] = useState<Estado | null>(null);
  const minhas = paraEstaRefeicao(todos, r.nome);
  const padroes = [...minhas.dela, ...minhas.gerais];

  const abrirFicha = ficha && (
    <FichaDaRefeicao dia={dia} hoje={dia} refeicao={r} marca={marca} estadoInicial={ficha} atalhos={atalhos} padroes={padroes} fotos={fotos} aoFechar={() => setFicha(null)} />
  );

  if (marca) {
    const e = ESTADOS[marca.estado];
    return (
      <Cartao id={`r-${r.id}`}>
        <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setFicha(marca.estado)} aria-label={`${r.nome}: ${e.rotulo}. Tocar para editar`}>
          <div className="min-w-0">
            <p className="text-[13px] tabular text-fosco">{horaFalada(r.horario)}</p>
            <p className="text-[18px] font-semibold leading-tight">{r.nome}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[13.5px] font-semibold ${e.claro}`}>
            {e.simbolo} {e.rotulo}
          </span>
        </button>
        {marca.nota && <p className="mt-1.5 text-[15px] leading-snug text-grafite">{marca.estado === "pulou" ? `Motivo: ${marca.nota}` : marca.nota}</p>}
        {(ehFome(marca.fome) || ehHumor(marca.humor) || marca.obs) && (
          <p className="mt-1 text-[14px] text-fosco">
            {ehFome(marca.fome) && <span title={FOMES[marca.fome].rotulo}>{FOMES[marca.fome].emoji}</span>}
            {ehFome(marca.fome) && ehHumor(marca.humor) && " → "}
            {ehHumor(marca.humor) && <span title={HUMORES[marca.humor].rotulo}>{HUMORES[marca.humor].emoji}</span>}
            {marca.obs && <span className="italic">{(ehFome(marca.fome) || ehHumor(marca.humor)) && " · "}“{marca.obs}”</span>}
          </p>
        )}
        <Miniaturas fotos={fotos} />
        {abrirFicha}
      </Cartao>
    );
  }

  return (
    <Cartao id={`r-${r.id}`} className={proxima ? "ring-2 ring-folha" : ""}>
      <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setAberta((a) => !a)} aria-expanded={aberta}>
        <div className="min-w-0">
          <p className="text-[13px] tabular text-fosco">
            {horaFalada(r.horario)}
            {proxima && <span className="ml-2 font-semibold uppercase tracking-wide text-folha">Próxima</span>}
            {passou && !proxima && <span className="ml-2">· sem registro</span>}
          </p>
          <p className={`${proxima ? "text-[22px]" : "text-[18px]"} font-semibold leading-tight`}>{r.nome}</p>
          {!aberta && r.conteudo.length > 0 && <p className="mt-0.5 line-clamp-1 text-[14px] text-fosco">{resumir(r.conteudo, 80)}</p>}
        </div>
        <span className="shrink-0 pt-1 text-[13px] text-fosco">{aberta ? "▴" : "ver ▾"}</span>
      </button>

      {aberta && (
        <>
          <OQueComer conteudo={r.conteudo} />
          {r.nota && <p className="mt-2 rounded-folha bg-papel px-3 py-2 text-[14px] leading-snug text-grafite">{r.nota}</p>}
          {minhas.dela.length > 0 && (
            <p className="mt-2 text-[13.5px] text-fosco">⭐ Minhas: {minhas.dela.slice(0, 3).map((p) => p.titulo).join(" · ")}</p>
          )}
        </>
      )}

      <Miniaturas fotos={fotos} />

      {(aberta || proxima) && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(Object.keys(ESTADOS) as Estado[]).map((e) => (
            <button key={e} type="button" onClick={() => setFicha(e)} className={`rounded-folha py-2.5 text-[15px] font-semibold ${e === "seguiu" ? ESTADOS[e].cheio : ESTADOS[e].claro}`}>
              {ESTADOS[e].simbolo} {ESTADOS[e].rotulo}
            </button>
          ))}
        </div>
      )}
      {abrirFicha}
    </Cartao>
  );
}

/** Os itens da refeição. Com mais de uma opção, uma fileira de abas no topo. */
export function OQueComer({ conteudo }: { conteudo: Conteudo }) {
  const [qual, setQual] = useState(0);
  const opcao = conteudo[Math.min(qual, conteudo.length - 1)];
  if (!opcao) return null;

  return (
    <div className="mt-3">
      {conteudo.length > 1 && (
        <div className="mb-2 flex gap-1.5 overflow-x-auto" role="tablist">
          {conteudo.map((o, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === qual}
              onClick={() => setQual(i)}
              className={`shrink-0 rounded-full px-3 py-1 text-[14px] ${i === qual ? "bg-tinta text-cartao" : "bg-papel text-grafite"}`}
            >
              {o.titulo || `Opção ${i + 1}`}
            </button>
          ))}
        </div>
      )}
      <ul className="divide-y divide-linha">
        {opcao.itens.map((item, i) => (
          <ItemDaRefeicao key={i} texto={item.texto} subs={item.subs} />
        ))}
      </ul>
    </div>
  );
}

function ItemDaRefeicao({ texto, subs }: { texto: string; subs: string[] }) {
  const [verTrocas, setVerTrocas] = useState(false);
  return (
    <li className="py-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[16px] leading-snug">{texto}</span>
        {subs.length > 0 && (
          <button
            type="button"
            onClick={() => setVerTrocas((v) => !v)}
            aria-expanded={verTrocas}
            className="shrink-0 rounded-full bg-papel px-2.5 py-0.5 text-[13px] text-grafite"
          >
            {subs.length} {subs.length === 1 ? "troca" : "trocas"}
          </button>
        )}
      </div>
      {verTrocas && (
        <ul className="mt-1 space-y-0.5 border-l-2 border-regua pl-3">
          {subs.map((s, i) => (
            <li key={i} className="text-[14.5px] leading-snug text-grafite">
              ou {s}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
