"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Botao } from "@/components/ui/button";
import { Cartao, CartaoCorpo, CartaoTitulo } from "@/components/ui/card";
import { Campo, Rotulo, Selecao } from "@/components/ui/input";
import { Aviso } from "@/components/ui/avisos";
import { criarMachane, duplicarMachane } from "@/app/actions";
import { TIPOS_MACHANE } from "@/lib/textos";

interface Anterior {
  id: string;
  nome: string;
  ano: number;
  tipo: "KAITZ" | "CHOREF";
}

export function NovaMachane({ anteriores }: { anteriores: Anterior[] }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"KAITZ" | "CHOREF">("KAITZ");
  const [ano, setAno] = useState(new Date().getFullYear() + 1);
  const [origem, setOrigem] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  function enviar() {
    setErro(null);
    iniciar(async () => {
      const r = origem
        ? await duplicarMachane({ origemId: origem, nome, tipo, ano })
        : await criarMachane({ nome, tipo, ano });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      router.push(`/machane/${r.dado.id}/parametros`);
    });
  }

  if (!aberto) {
    return <Botao onClick={() => setAberto(true)}>Nova machané</Botao>;
  }

  return (
    <Cartao className="w-full max-w-xl">
      <CartaoCorpo className="space-y-3">
        <CartaoTitulo>Nova machané</CartaoTitulo>

        <div className="grid gap-3 sm:grid-cols-[1fr_140px_100px]">
          <div>
            <Rotulo htmlFor="nome">Nome</Rotulo>
            <Campo
              id="nome"
              value={nome}
              placeholder="Machané Kaitz 2027"
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div>
            <Rotulo htmlFor="tipo">Tipo</Rotulo>
            <Selecao
              id="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "KAITZ" | "CHOREF")}
            >
              {Object.entries(TIPOS_MACHANE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Selecao>
          </div>
          <div>
            <Rotulo htmlFor="ano">Ano</Rotulo>
            <Campo
              id="ano"
              inputMode="numeric"
              value={ano}
              onChange={(e) => setAno(Number(e.target.value.replace(/\D/g, "")) || 0)}
            />
          </div>
        </div>

        {anteriores.length > 0 ? (
          <div>
            <Rotulo htmlFor="origem">Duplicar de</Rotulo>
            <Selecao id="origem" value={origem} onChange={(e) => setOrigem(e.target.value)}>
              <option value="">começar do zero</option>
              {anteriores.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </Selecao>
            {origem ? (
              <Aviso className="mt-2">
                A estrutura vem junto (categorias, gastos e política), mas{" "}
                <strong>todas as quantidades chegam zeradas</strong> e cada gasto herdado fica
                marcado como <strong>não revisado</strong>. A machané só pode ser publicada depois
                que tudo for conferido — foi copiar aba sem conferir que produziu os erros mais caros
                da planilha.
              </Aviso>
            ) : null}
          </div>
        ) : null}

        {erro ? <Aviso tom="erro">{erro}</Aviso> : null}

        <div className="flex gap-2">
          <Botao onClick={enviar} disabled={pendente || nome.trim().length < 3}>
            {pendente ? "Criando…" : origem ? "Duplicar" : "Criar"}
          </Botao>
          <Botao variante="contorno" onClick={() => setAberto(false)} disabled={pendente}>
            Cancelar
          </Botao>
        </div>
      </CartaoCorpo>
    </Cartao>
  );
}
