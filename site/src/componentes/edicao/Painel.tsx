"use client";

import { useEffect, useState } from "react";
import type { Campo, Dados } from "@/lib/esquema";
import type { Resposta } from "@/lib/acoes";
import { CampoFormulario } from "./Campos";

/**
 * O painel que desliza da direita com o formulário. Os campos vêm do esquema;
 * o painel não sabe o que está editando.
 */
export function Painel({
  titulo,
  descricao,
  campos,
  iniciais,
  salvar,
  fechar,
  rotuloSalvar = "Salvar e publicar",
}: {
  titulo: string;
  descricao?: string;
  campos: readonly Campo[];
  iniciais: Dados;
  salvar: (dados: Dados) => Promise<Resposta>;
  fechar: () => void;
  rotuloSalvar?: string;
}) {
  const [valores, setValores] = useState<Dados>(() => {
    const v: Dados = {};
    for (const c of campos) v[c.nome] = iniciais[c.nome] ?? "";
    return v;
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const alterado = campos.some((c) => (valores[c.nome] ?? "") !== (iniciais[c.nome] ?? ""));

  const tentarFechar = () => {
    if (alterado && !window.confirm("Sair sem salvar? O que você mudou vai se perder.")) return;
    fechar();
  };

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && tentarFechar();
    window.addEventListener("keydown", tecla);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = "";
    };
  });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    const r = await salvar(valores);
    setSalvando(false);
    if (!r.ok) setErro(r.erro);
  }

  return (
    <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true" aria-label={titulo}>
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-marinho/50 backdrop-blur-[2px]" onClick={tentarFechar} />
      <form
        onSubmit={enviar}
        noValidate
        className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-[entrar_.18s_ease-out]"
      >
        <header className="flex items-start gap-3 border-b border-slate-200 bg-edicao/40 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="font-corpo text-xs font-bold uppercase tracking-widest text-marinho/70">Editando</p>
            <h2 className="font-titulo text-xl font-black text-marinho">{titulo}</h2>
            {descricao ? <p className="mt-1 font-corpo text-sm text-slate-600">{descricao}</p> : null}
          </div>
          <button
            type="button"
            onClick={tentarFechar}
            className="rounded-full p-2 text-2xl leading-none text-marinho hover:bg-black/5"
            aria-label="Fechar sem salvar"
          >
            ×
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {campos.map((c) => (
            <CampoFormulario
              key={c.nome}
              campo={c}
              valor={valores[c.nome] ?? ""}
              mudar={(v) => setValores((atual) => ({ ...atual, [c.nome]: v }))}
            />
          ))}
        </div>

        <footer className="border-t border-slate-200 px-5 py-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          {erro ? <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 font-corpo text-sm font-bold text-red-700">{erro}</p> : null}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 rounded-xl bg-marinho px-5 py-3.5 font-titulo text-base font-bold text-white hover:bg-azul disabled:opacity-60"
            >
              {salvando ? "Salvando…" : rotuloSalvar}
            </button>
            <button
              type="button"
              onClick={tentarFechar}
              className="rounded-xl border-2 border-slate-300 px-5 py-3.5 font-titulo text-base font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
