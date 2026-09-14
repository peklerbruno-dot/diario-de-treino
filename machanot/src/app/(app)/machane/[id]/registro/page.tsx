import { registrosDaMachane } from "@/lib/carregar";
import { Cartao, CartaoCorpo, CartaoDescricao, CartaoTitulo, CartaoTopo } from "@/components/ui/card";
import { Selo } from "@/components/ui/badge";
import { ALVOS_ALTERACAO } from "@/lib/textos";
import { dataHora } from "@/lib/dinheiro";

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const registros = await registrosDaMachane(id);

  return (
    <Cartao>
      <CartaoTopo>
        <CartaoTitulo>Quem mudou o quê</CartaoTitulo>
        <CartaoDescricao>
          Peso do rateio, política de preço, gastos e status ficam registrados com autor, data e o
          valor de antes. É o que responde &ldquo;por que este número mudou?&rdquo; meses depois.
        </CartaoDescricao>
      </CartaoTopo>
      <CartaoCorpo className="space-y-2">
        {registros.length === 0 ? (
          <p className="text-sm text-suave">Nada registrado ainda.</p>
        ) : (
          registros.map((r) => (
            <div key={r.id} className="border-b border-borda/60 pb-2 last:border-0">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Selo variante={r.alvo === "PESO" ? "atencao" : "neutro"}>
                  {ALVOS_ALTERACAO[r.alvo]}
                </Selo>
                <span className="font-medium">{r.descricao}</span>
                <span className="text-xs text-suave">
                  {r.email} · {dataHora(r.em.toISOString())}
                </span>
              </div>
              {r.valorAntes || r.valorDepois ? (
                <p className="mt-0.5 font-mono text-[11px] text-suave">
                  {r.valorAntes ?? "—"} → {r.valorDepois ?? "—"}
                </p>
              ) : null}
              {r.justificativa ? (
                <p className="mt-0.5 text-xs italic text-suave">
                  &ldquo;{r.justificativa}&rdquo;
                </p>
              ) : null}
            </div>
          ))
        )}
      </CartaoCorpo>
    </Cartao>
  );
}
