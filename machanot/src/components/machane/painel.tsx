"use client";

import Link from "next/link";
import { useMachane } from "./provedor";
import { brl, brlRedondo, pct, pctComSinal } from "@/lib/dinheiro";
import { Aviso } from "@/components/ui/avisos";
import { cn } from "@/lib/cn";

function Linha({
  rotulo,
  valor,
  detalhe,
  destaque,
  tom,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  destaque?: boolean;
  tom?: "ok" | "erro";
}) {
  return (
    <div className="border-b border-borda/70 px-4 py-2.5 last:border-0">
      <p className="text-[11px] uppercase tracking-wide text-suave">{rotulo}</p>
      <p
        className={cn(
          "tabular font-semibold",
          destaque ? "text-xl" : "text-base",
          tom === "ok" && "text-ok",
          tom === "erro" && "text-erro",
        )}
      >
        {valor}
      </p>
      {detalhe ? <p className="mt-0.5 text-[11px] text-suave">{detalhe}</p> : null}
    </div>
  );
}

/**
 * Painel que acompanha a coordenação em todas as telas (§9).
 * Não existe botão "calcular": isto aqui é o resultado, sempre.
 */
export function PainelAoVivo() {
  const { estado, resultado: r, situacao, erro } = useMachane();

  const situacoes = {
    limpo: { texto: "tudo salvo", classe: "text-suave" },
    salvando: { texto: "salvando…", classe: "text-suave" },
    salvo: { texto: "salvo", classe: "text-ok" },
    erro: { texto: "não salvou", classe: "text-erro" },
  } as const;

  return (
    <aside className="lg:sticky lg:top-4">
      <div className="overflow-hidden rounded-lg border border-borda bg-papel shadow-sm">
        <div className="flex items-center justify-between border-b border-borda bg-fundo px-4 py-2">
          <p className="text-xs font-semibold">Resultado ao vivo</p>
          <span className={cn("text-[11px]", situacoes[situacao].classe)}>
            {situacoes[situacao].texto}
          </span>
        </div>

        <Linha
          rotulo="Custo total"
          valor={brl(r.custoTotalCents)}
          detalhe={`hospedagem ${brlRedondo(r.hospedagemCents)} + fixos ${brlRedondo(r.gastosFixosCents)}`}
          destaque
        />
        <Linha
          rotulo="Custo por chanich grande"
          valor={brl(r.custoPorChanichGrandesCents)}
          detalhe={`${r.chanichimGrandes} chanichim × ${estado.diasGrandes} dias`}
          destaque
        />
        <Linha
          rotulo="Custo por chanich pequeno"
          valor={brl(r.custoPorChanichPequenosCents)}
          detalhe={`${r.chanichimPequenos} chanichim × ${estado.diasPequenos} dias`}
          destaque
        />
        <Linha
          rotulo="Superávit projetado"
          valor={`${brl(r.superavitProjetadoCents)} (${pctComSinal(r.superavitProjetadoPct)})`}
          detalhe="se todos forem 1º filho sócio"
          tom={r.superavitProjetadoCents < 0 ? "erro" : "ok"}
          destaque
        />
        <Linha
          rotulo="Rateio aplicado"
          valor={`${pct(r.pesoAplicado)} / ${pct(1 - r.pesoAplicado)}`}
          detalhe={
            estado.pesoOverride === null
              ? "peso calculado por pessoa-dia"
              : `ajustado à mão (calculado: ${pct(r.pesoCalculado)})`
          }
        />
      </div>

      {erro ? (
        <Aviso tom="erro" className="mt-3">
          {erro}
        </Aviso>
      ) : null}

      {r.avisos.length > 0 ? (
        <div className="mt-3 space-y-2">
          {r.avisos.map((a) => (
            <Aviso key={a} tom={a.startsWith("DÉFICIT") ? "erro" : "atencao"}>
              {a}
            </Aviso>
          ))}
        </div>
      ) : null}

      <p className="mt-3 px-1 text-[11px] leading-relaxed text-suave">
        Todo preço desta plataforma sai deste cálculo.{" "}
        <Link href={`/machane/${estado.id}/transparencia`} className="text-acento underline">
          Ver de onde vem cada número
        </Link>
        .
      </p>
    </aside>
  );
}
