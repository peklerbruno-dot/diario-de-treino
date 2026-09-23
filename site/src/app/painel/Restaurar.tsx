"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { restaurarItem } from "@/lib/acoes";
import { useEdicao } from "@/componentes/edicao/Provedor";

export function Restaurar({ id }: { id: string }) {
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  const { avisar } = useEdicao();
  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const r = await restaurarItem(id);
          if (r.ok) {
            avisar({ texto: "Voltou para o site.", tom: "ok" });
            router.refresh();
          } else avisar({ texto: r.erro, tom: "erro" });
        })
      }
      className="shrink-0 rounded-full border-2 border-marinho px-4 py-1.5 font-titulo text-sm font-bold text-marinho hover:bg-marinho hover:text-white disabled:opacity-50"
    >
      {pendente ? "…" : "Trazer de volta"}
    </button>
  );
}
