"use client";

import { useRef, useState } from "react";
import { lerFotoDoRecibo } from "@/acoes/contas";
import { formatar } from "@/lib/dinheiro";
import { reduzir } from "./imagem";
import { Aviso } from "./pecas";
import { FormularioDeDespesa } from "./formulario-despesa";

type Props = Omit<React.ComponentProps<typeof FormularioDeDespesa>, "inicial" | "despesa"> & { temLeitura: boolean };

/** A despesa nova, com o atalho de tirar foto do recibo e o formulário vir preenchido. */
export function NovaDespesa({ temLeitura, ...props }: Props) {
  const [inicial, setInicial] = useState<React.ComponentProps<typeof FormularioDeDespesa>["inicial"]>();
  const [versao, setVersao] = useState(0);
  const [lendo, setLendo] = useState(false);
  const [aviso, setAviso] = useState<{ tom: "ok" | "erro"; texto: string } | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  async function ler(arquivo: File | undefined) {
    if (!arquivo) return;
    setAviso(null);
    setLendo(true);
    try {
      const img = await reduzir(arquivo);
      const r = await lerFotoDoRecibo(props.viagemId, { tipo: img.tipo, base64: img.base64 });
      if (r.erro || !r.recibo) setAviso({ tom: "erro", texto: r.erro ?? "Não consegui ler a foto." });
      else {
        setInicial(r.recibo);
        setVersao((n) => n + 1);
        setAviso({ tom: "ok", texto: `Li: ${r.recibo.descricao}, ${formatar(r.recibo.valor, r.recibo.moeda)}. Confira e diga como divide.` });
      }
    } catch {
      setAviso({ tom: "erro", texto: "Sem conexão para ler a foto agora." });
    } finally {
      setLendo(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      {temLeitura && (
        <>
          <button type="button" onClick={() => entrada.current?.click()} disabled={lendo} className="botao-leve w-full">
            {lendo ? "Lendo o recibo…" : "📷 Tirar foto do recibo"}
          </button>
          <input ref={entrada} type="file" accept="image/*" capture="environment" hidden onChange={(e) => ler(e.target.files?.[0])} />
        </>
      )}
      {aviso && <Aviso tom={aviso.tom}>{aviso.texto}</Aviso>}
      <FormularioDeDespesa key={versao} {...props} inicial={inicial} />
    </div>
  );
}
