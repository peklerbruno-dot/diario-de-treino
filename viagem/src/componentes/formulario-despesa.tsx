"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { guardarNaFila } from "./fila";
import { salvarDespesa } from "@/acoes/contas";
import { CATEGORIAS_DE_DESPESA, MODOS, dividir, ErroDeDivisao, type Modo } from "@/lib/contas";
import { formatar, lerValor, LISTA_DE_MOEDAS, MOEDAS, paraCampo } from "@/lib/dinheiro";
import { BotaoEnviar } from "./formulario";
import { Aviso, Avatar } from "./pecas";

type Membro = { id: string; nome: string; cor: string };
export type DespesaParaEditar = {
  id: string;
  descricao: string;
  categoria: string;
  data: string;
  valor: number;
  moeda: string;
  cambio: number;
  modo: string;
  notas: string;
  pagadores: { membroId: string; valor: number }[];
  partes: { membroId: string; valor: number; peso: number }[];
};

/**
 * A despesa, com a divisão ao vivo: enquanto se digita, cada pessoa mostra
 * quanto lhe cabe. A prévia usa a mesma `dividir` que o servidor usa para
 * gravar, então o que aparece é o que fica.
 */
export function FormularioDeDespesa({
  viagemId,
  membros,
  euId,
  moedaBase,
  cambios,
  hoje,
  despesa,
  inicial,
}: {
  viagemId: string;
  membros: Membro[];
  euId: string;
  moedaBase: string;
  cambios: Record<string, number>;
  hoje: string;
  despesa?: DespesaParaEditar;
  inicial?: { descricao: string; valor: number; moeda: string; data: string; categoria: string; cambio?: number };
}) {
  const [estado, agir] = useActionState(salvarDespesa, null);
  const v = estado?.valores;

  const router = useRouter();
  const [valorTexto, setValorTexto] = useState(
    v?.valor ?? (despesa ? paraCampo(despesa.valor) : inicial ? paraCampo(inicial.valor) : ""),
  );
  const [moeda, setMoeda] = useState(v?.moeda ?? despesa?.moeda ?? inicial?.moeda ?? "MXN");
  // O id que o celular sorteia para a despesa nova: se ela for lançada sem
  // internet e reenviada depois, o servidor reconhece e não duplica.
  const [idCliente, setIdCliente] = useState("");
  const [guardada, setGuardada] = useState(false);
  useEffect(() => {
    if (!despesa) setIdCliente(crypto.randomUUID());
  }, [despesa]);
  const [cambioTexto, setCambioTexto] = useState(
    v?.cambio ?? String(despesa && despesa.moeda === moeda ? despesa.cambio : (inicial?.cambio ?? cambios[moeda] ?? "")).replace(".", ","),
  );
  const [modo, setModo] = useState<Modo>((v?.modo as Modo) ?? (despesa?.modo as Modo) ?? "igual");
  const [pagador, setPagador] = useState(
    v?.pagador ?? (despesa ? (despesa.pagadores.length > 1 ? "varios" : despesa.pagadores[0]?.membroId) : euId),
  );

  const parteDe = (mid: string) => despesa?.partes.find((p) => p.membroId === mid);
  const [incluidos, setIncluidos] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(membros.map((m) => [m.id, despesa ? Boolean(parteDe(m.id)) : true])),
  );
  const [numeros, setNumeros] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      membros.map((m) => {
        const p = parteDe(m.id);
        if (!p || !despesa) return [m.id, ""];
        if (despesa.modo === "exato") return [m.id, paraCampo(p.valor)];
        return [m.id, String(p.peso).replace(".", ",")];
      }),
    ),
  );
  const [pagos, setPagos] = useState<Record<string, string>>(() =>
    Object.fromEntries(membros.map((m) => [m.id, despesa?.pagadores.find((p) => p.membroId === m.id) ? paraCampo(despesa.pagadores.find((p) => p.membroId === m.id)!.valor) : ""])),
  );

  const valor = lerValor(valorTexto) ?? 0;
  const cambio = moeda === moedaBase ? 1 : Number(cambioTexto.replace(",", ".")) || 0;

  function trocarModo(novo: Modo) {
    setModo(novo);
    // Ao trocar, parte de um ponto que faz sentido em vez de campos vazios.
    const ativos = membros.filter((m) => incluidos[m.id] !== false);
    const n = ativos.length || 1;
    setNumeros(
      Object.fromEntries(
        membros.map((m) => {
          const ativo = incluidos[m.id] !== false;
          if (novo === "porcentagem") return [m.id, ativo ? (Math.round((100 / n) * 100) / 100).toString().replace(".", ",") : ""];
          if (novo === "cotas") return [m.id, ativo ? "1" : ""];
          if (novo === "exato") return [m.id, ""];
          return [m.id, ""];
        }),
      ),
    );
  }

  const previa = useMemo(() => {
    if (valor <= 0) return { partes: new Map<string, number>(), erro: "" };
    const entradas = membros
      .map((m) => {
        if (modo === "igual") return incluidos[m.id] ? { membroId: m.id, valor: 1 } : null;
        const t = numeros[m.id] ?? "";
        const n = modo === "exato" ? (lerValor(t) ?? 0) : Number(t.replace(",", ".")) || 0;
        return n > 0 ? { membroId: m.id, valor: n } : null;
      })
      .filter((x): x is { membroId: string; valor: number } => x !== null);
    try {
      const partes = dividir(modo, valor, entradas);
      return { partes: new Map(partes.map((p) => [p.membroId, p.valor])), erro: "" };
    } catch (e) {
      return { partes: new Map<string, number>(), erro: e instanceof ErroDeDivisao ? e.message : "" };
    }
  }, [valor, modo, incluidos, numeros, membros]);

  const somaPagos = membros.reduce((a, m) => a + (lerValor(pagos[m.id] ?? "") ?? 0), 0);
  const nome = (m: Membro) => (m.id === euId ? "Você" : m.nome.split(" ")[0]);

  return (
    <form
      action={agir}
      onSubmit={(e) => {
        // Sem internet: guarda no celular e a fila envia quando o sinal voltar.
        if (despesa || navigator.onLine) return;
        e.preventDefault();
        const campos: Record<string, string> = {};
        new FormData(e.currentTarget).forEach((valor, nome) => {
          if (typeof valor === "string") campos[nome] = valor;
        });
        if (guardarNaFila(viagemId, campos)) {
          setGuardada(true);
          setTimeout(() => router.push(`/v/${viagemId}/contas`), 1200);
        }
      }}
      className="space-y-5"
    >
      <input type="hidden" name="viagemId" value={viagemId} />
      {idCliente && <input type="hidden" name="idCliente" value={idCliente} />}
      {despesa && <input type="hidden" name="despesaId" value={despesa.id} />}
      <input type="hidden" name="modo" value={modo} />

      <label className="block">
        <span className="rotulo">O que foi</span>
        <input name="descricao" required className="campo" defaultValue={v?.descricao ?? despesa?.descricao ?? inicial?.descricao} placeholder="Jantar no Contramar" />
      </label>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="block">
          <span className="rotulo">Valor</span>
          <input
            name="valor"
            inputMode="decimal"
            required
            className="campo text-[22px] font-semibold tabular-nums"
            value={valorTexto}
            onChange={(e) => setValorTexto(e.target.value)}
            placeholder="0,00"
          />
        </label>
        <label className="block">
          <span className="rotulo">Moeda</span>
          <select
            name="moeda"
            className="campo h-[52px]"
            value={moeda}
            onChange={(e) => {
              setMoeda(e.target.value);
              setCambioTexto(String(cambios[e.target.value] ?? "").replace(".", ","));
            }}
          >
            {LISTA_DE_MOEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      </div>

      {moeda !== moedaBase && (
        <label className="block">
          <span className="rotulo">Câmbio: 1 {moeda} = quantos {moedaBase}?</span>
          <input name="cambio" inputMode="decimal" className="campo tabular-nums" value={cambioTexto} onChange={(e) => setCambioTexto(e.target.value)} placeholder="0,29" />
          {valor > 0 && cambio > 0 && (
            <span className="mt-1 block text-[14px] text-fosco">
              {formatar(valor, moeda)} ≈ {formatar(Math.round(valor * cambio), moedaBase)}. Se pagou no cartão, use o câmbio da fatura.
            </span>
          )}
        </label>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="rotulo">Data</span>
          <input name="data" type="date" className="campo" defaultValue={v?.data ?? despesa?.data ?? inicial?.data ?? hoje} />
        </label>
        <label className="block">
          <span className="rotulo">Tipo</span>
          <select name="categoria" className="campo" defaultValue={v?.categoria ?? despesa?.categoria ?? inicial?.categoria ?? "comida"}>
            {CATEGORIAS_DE_DESPESA.map((c) => <option key={c.valor} value={c.valor}>{c.emoji} {c.nome}</option>)}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="rotulo">Quem pagou</legend>
        <select name="pagador" className="campo" value={pagador} onChange={(e) => setPagador(e.target.value)}>
          {membros.map((m) => <option key={m.id} value={m.id}>{nome(m)}</option>)}
          <option value="varios">Mais de uma pessoa…</option>
        </select>
        {pagador === "varios" && (
          <div className="mt-2 space-y-2">
            {membros.map((m) => (
              <label key={m.id} className="flex items-center gap-3">
                <Avatar nome={m.nome} cor={m.cor} tamanho={28} />
                <span className="flex-1">{nome(m)}</span>
                <input
                  name={`pago_${m.id}`}
                  inputMode="decimal"
                  className="campo w-32 py-2 text-right tabular-nums"
                  value={pagos[m.id] ?? ""}
                  onChange={(e) => setPagos((x) => ({ ...x, [m.id]: e.target.value }))}
                  placeholder="0,00"
                />
              </label>
            ))}
            <p className={`text-right text-[14px] ${somaPagos === valor ? "text-verde" : "text-ambar"}`}>
              {somaPagos === valor ? "Fecha ✓" : `Soma ${formatar(somaPagos, moeda)} de ${formatar(valor, moeda)}`}
            </p>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend className="rotulo">Como dividir</legend>
        <div className="grid grid-cols-4 gap-1 rounded-folha bg-linha p-1">
          {MODOS.map((m) => (
            <button
              key={m.valor}
              type="button"
              onClick={() => trocarModo(m.valor)}
              aria-pressed={modo === m.valor}
              className={`min-h-[38px] rounded-[9px] text-[15px] font-semibold ${modo === m.valor ? "bg-cartao text-realce shadow-cartao" : "text-grafite"}`}
            >
              {m.nome}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[13px] text-fosco">{MODOS.find((m) => m.valor === modo)?.dica}</p>

        <ul className="mt-2 divide-y divide-linha">
          {membros.map((m) => {
            const parte = previa.partes.get(m.id);
            return (
              <li key={m.id} className="flex items-center gap-3 py-2">
                {modo === "igual" ? (
                  <input
                    type="checkbox"
                    name={`inc_${m.id}`}
                    value="sim"
                    checked={incluidos[m.id] ?? false}
                    onChange={(e) => setIncluidos((x) => ({ ...x, [m.id]: e.target.checked }))}
                    className="h-5 w-5 accent-[var(--realce)]"
                    aria-label={`Incluir ${nome(m)}`}
                  />
                ) : null}
                <Avatar nome={m.nome} cor={m.cor} tamanho={28} />
                <span className="flex-1">{nome(m)}</span>
                {modo !== "igual" && (
                  <span className="flex items-center gap-1">
                    <input
                      name={`${modo === "exato" ? "val" : modo === "porcentagem" ? "pct" : "cota"}_${m.id}`}
                      inputMode="decimal"
                      className="campo w-24 py-2 text-right tabular-nums"
                      value={numeros[m.id] ?? ""}
                      onChange={(e) => setNumeros((x) => ({ ...x, [m.id]: e.target.value }))}
                      placeholder="0"
                    />
                    <span className="w-5 text-[14px] text-fosco">{modo === "porcentagem" ? "%" : modo === "cotas" ? "×" : ""}</span>
                  </span>
                )}
                <span className="w-24 text-right text-[14px] tabular-nums text-grafite">{parte != null ? formatar(parte, moeda) : "—"}</span>
              </li>
            );
          })}
        </ul>
        {previa.erro && valor > 0 && <p className="mt-1 text-[14px] text-ambar">{previa.erro}</p>}
      </fieldset>

      <label className="block">
        <span className="rotulo">Notas</span>
        <input name="notas" className="campo" defaultValue={v?.notas ?? despesa?.notas} placeholder="Opcional" />
      </label>

      {estado?.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      {guardada && <Aviso tom="atencao">📶 Sem internet: guardei no celular. Ela sobe sozinha quando o sinal voltar.</Aviso>}
      <BotaoEnviar>{despesa ? "Salvar" : "Lançar despesa"}</BotaoEnviar>
      <p className="text-center text-[13px] text-fosco">Moeda das contas: {MOEDAS[moedaBase as keyof typeof MOEDAS]?.nome ?? moedaBase}.</p>
    </form>
  );
}
