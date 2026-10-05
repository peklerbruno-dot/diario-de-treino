"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { apagarRefeicaoPadrao, salvarRefeicaoPadrao } from "@/app/acoes";
import { milhar } from "@/lib/analise";
import { chaveDaRefeicao, type PadraoParaSalvar, type RefeicaoPadrao } from "@/lib/refeicoes-padrao";
import { Botao, Cartao, Chave, Titulo, campo } from "./pecas";

/**
 * As refeições que você repete: cadastrar, editar, apagar. A escolha do dia
 * (qual delas você comeu) mora no cartão de cada refeição, em Hoje.
 */

const VAZIO: PadraoParaSalvar = {
  refeicao: "",
  titulo: "",
  itens: "",
  calorias: "",
  proteinas: "",
  carboidratos: "",
  gorduras: "",
  seguePlano: true,
};

const paraFormulario = (p: RefeicaoPadrao): PadraoParaSalvar => ({
  refeicao: p.refeicao,
  titulo: p.titulo,
  itens: p.itens,
  calorias: p.calorias === null ? "" : String(p.calorias),
  proteinas: p.proteinas === null ? "" : String(p.proteinas),
  carboidratos: p.carboidratos === null ? "" : String(p.carboidratos),
  gorduras: p.gorduras === null ? "" : String(p.gorduras),
  seguePlano: p.seguePlano,
});

/** Uma linha de resumo: quanto tem e se está no plano. Usada na lista e no seletor de Hoje. */
export function ResumoDoPadrao({ p }: { p: RefeicaoPadrao }) {
  return (
    <>
      {p.itens && <span className="mt-0.5 block text-[14px] leading-snug text-grafite">{p.itens}</span>}
      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-fosco tabular">
        {p.calorias !== null && <span>≈ {milhar(p.calorias)} kcal</span>}
        {p.proteinas !== null && <span>{p.proteinas} g prot.</span>}
        {!p.seguePlano && <span className="text-troca">fora do plano</span>}
      </span>
    </>
  );
}

export function TelaMinhasRefeicoes({
  padroes,
  nomesDoPlano,
  nova,
}: {
  padroes: RefeicaoPadrao[];
  /** As refeições do plano em uso, na ordem do dia. */
  nomesDoPlano: string[];
  /** Vindo de Hoje: abrir já criando uma para esta refeição. */
  nova?: string;
}) {
  const [editando, setEditando] = useState<{ id: string | null; form: PadraoParaSalvar } | null>(
    nova !== undefined ? { id: null, form: { ...VAZIO, refeicao: nova } } : null,
  );

  // Os grupos: primeiro as refeições do plano, na ordem do dia; depois as que
  // sobraram de um plano antigo; por fim as de "qualquer refeição".
  const grupos: { nome: string; itens: RefeicaoPadrao[] }[] = nomesDoPlano.map((nome) => ({
    nome,
    itens: padroes.filter((p) => p.refeicao !== "" && chaveDaRefeicao(p.refeicao) === chaveDaRefeicao(nome)),
  }));
  const chavesDoPlano = new Set(nomesDoPlano.map(chaveDaRefeicao));
  const outras = [...new Set(padroes.filter((p) => p.refeicao !== "" && !chavesDoPlano.has(chaveDaRefeicao(p.refeicao))).map((p) => p.refeicao))];
  for (const nome of outras) grupos.push({ nome, itens: padroes.filter((p) => p.refeicao === nome) });
  grupos.push({ nome: "Qualquer refeição", itens: padroes.filter((p) => p.refeicao === "") });

  return (
    <>
      <Titulo
        depois={
          !editando && (
            <Botao tipo="primario" className="mb-1 !px-3.5 !py-2 !text-[15px]" onClick={() => setEditando({ id: null, form: VAZIO })}>
              Nova
            </Botao>
          )
        }
      >
        Minhas refeições
      </Titulo>

      <p className="-mt-2 mb-4 text-[15px] leading-snug text-grafite">
        As refeições que você repete. Cadastre uma vez e, em Hoje, escolha qual delas você comeu em cada horário.
      </p>

      {editando && (
        <Editor
          key={editando.id ?? "nova"}
          inicial={editando.form}
          id={editando.id}
          nomesDoPlano={nomesDoPlano}
          aoFechar={() => setEditando(null)}
        />
      )}

      {padroes.length === 0 && !editando && (
        <Cartao>
          <p className="text-[18px] font-semibold">Nenhuma ainda</p>
          <p className="mt-1 text-[15px] leading-snug text-grafite">
            Comece pelas que você mais come: o café da manhã de sempre, a marmita do almoço, o lanche da tarde.
          </p>
        </Cartao>
      )}

      <div className="space-y-3">
        {grupos
          .filter((g) => g.itens.length > 0)
          .map((g) => (
            <Cartao key={g.nome}>
              <p className="text-[13px] font-medium uppercase tracking-wide text-fosco">{g.nome}</p>
              <ul className="mt-1 divide-y divide-linha">
                {g.itens.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <span className="block text-[17px] font-medium leading-snug">{p.titulo}</span>
                      <ResumoDoPadrao p={p} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditando({ id: p.id, form: paraFormulario(p) })}
                      className="shrink-0 rounded-full bg-papel px-3 py-1 text-[13.5px] text-grafite"
                      aria-label={`Editar ${p.titulo}`}
                    >
                      Editar
                    </button>
                  </li>
                ))}
              </ul>
            </Cartao>
          ))}
      </div>
    </>
  );
}

function Editor({
  inicial,
  id,
  nomesDoPlano,
  aoFechar,
}: {
  inicial: PadraoParaSalvar;
  id: string | null;
  nomesDoPlano: string[];
  aoFechar: () => void;
}) {
  const [form, setForm] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [apagando, setApagando] = useState(false);
  const [pendente, iniciar] = useTransition();
  const mudar = (parcial: Partial<PadraoParaSalvar>) => setForm((f) => ({ ...f, ...parcial }));

  // A refeição da lista é sempre uma que existe no plano — ou a que já estava
  // gravada (de um plano antigo), para não sumir ao editar.
  const opcoes = [...nomesDoPlano];
  if (form.refeicao && !opcoes.some((n) => chaveDaRefeicao(n) === chaveDaRefeicao(form.refeicao))) opcoes.push(form.refeicao);
  const selecionada = opcoes.find((n) => chaveDaRefeicao(n) === chaveDaRefeicao(form.refeicao)) ?? "";

  const salvar = () =>
    iniciar(async () => {
      setErro(null);
      const r = await salvarRefeicaoPadrao(id, form);
      if (r.erro) setErro(r.erro);
      else aoFechar();
    });

  return (
    <Cartao className="mb-4">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          salvar();
        }}
      >
        <p className="text-[18px] font-semibold">{id ? "Editar refeição" : "Nova refeição"}</p>

        <label className="block">
          <span className="text-[13px] text-fosco">Em qual refeição aparece</span>
          <select className={campo} value={selecionada} onChange={(e) => mudar({ refeicao: e.target.value })}>
            <option value="">Qualquer refeição</option>
            {opcoes.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[13px] text-fosco">Nome</span>
          <input
            className={campo}
            value={form.titulo}
            onChange={(e) => mudar({ titulo: e.target.value })}
            placeholder="Ex.: Marmita de frango com batata-doce"
            maxLength={80}
            autoFocus
          />
        </label>

        <label className="block">
          <span className="text-[13px] text-fosco">O que tem (opcional)</span>
          <textarea
            className={`${campo} leading-snug`}
            rows={3}
            value={form.itens}
            onChange={(e) => mudar({ itens: e.target.value })}
            placeholder="150 g de frango, 200 g de batata-doce, salada"
          />
        </label>

        <div className="flex items-start justify-between gap-3 rounded-folha bg-papel p-3">
          <div>
            <p className="text-[15px] font-medium">Está dentro do plano</p>
            <p className="mt-0.5 text-[13px] leading-snug text-fosco">
              Ligado, escolher esta refeição marca “segui”. Desligado, marca “troquei”.
            </p>
          </div>
          <Chave ligado={form.seguePlano} aoMudar={(v) => mudar({ seguePlano: v })} rotulo="Está dentro do plano" />
        </div>

        <details className="rounded-folha bg-papel px-3 py-2" open={Boolean(form.calorias || form.proteinas || form.carboidratos || form.gorduras)}>
          <summary className="cursor-pointer text-[15px] font-medium">Números (opcional)</summary>
          <p className="mt-1.5 text-[13px] leading-snug text-fosco">
            Com as calorias, esta refeição entra na soma do dia, junto com as fotos.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                ["calorias", "Calorias (kcal)"],
                ["proteinas", "Proteínas (g)"],
                ["carboidratos", "Carboidratos (g)"],
                ["gorduras", "Gorduras (g)"],
              ] as const
            ).map(([chave, rotulo]) => (
              <label key={chave} className="block">
                <span className="text-[12.5px] text-fosco">{rotulo}</span>
                <input
                  className={`${campo} tabular`}
                  inputMode="decimal"
                  value={form[chave]}
                  onChange={(e) => mudar({ [chave]: e.target.value })}
                />
              </label>
            ))}
          </div>
        </details>

        {erro && (
          <p role="alert" className="text-[14px] text-pulou">
            {erro}
          </p>
        )}

        <div className="flex gap-2">
          <Botao type="submit" tipo="primario" className="flex-1" disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar"}
          </Botao>
          <Botao tipo="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
        </div>

        {id &&
          (apagando ? (
            <div className="flex items-center gap-2 border-t border-linha pt-3">
              <p className="mr-auto text-[14px] text-grafite">O que já foi marcado com ela continua no histórico.</p>
              <Botao
                tipo="perigo"
                disabled={pendente}
                onClick={() =>
                  iniciar(async () => {
                    await apagarRefeicaoPadrao(id);
                    aoFechar();
                  })
                }
              >
                Apagar
              </Botao>
              <Botao tipo="fantasma" onClick={() => setApagando(false)}>
                Não
              </Botao>
            </div>
          ) : (
            <button type="button" onClick={() => setApagando(true)} className="w-full border-t border-linha pt-3 text-left text-[14px] text-pulou">
              Apagar esta refeição
            </button>
          ))}
      </form>
    </Cartao>
  );
}

/** O atalho para cadastrar, usado nos lugares onde falta uma refeição. */
export function LinkNovaRefeicao({ refeicao, className = "" }: { refeicao?: string; className?: string }) {
  return (
    <Link href={refeicao ? `/refeicoes?nova=${encodeURIComponent(refeicao)}` : "/refeicoes"} className={className}>
      {refeicao ? "+ Cadastrar uma para esta refeição" : "Minhas refeições"}
    </Link>
  );
}
