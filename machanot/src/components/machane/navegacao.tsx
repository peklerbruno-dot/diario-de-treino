"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TELAS = [
  { slug: "parametros", nome: "Parâmetros", dica: "diária, dias, datas" },
  { slug: "pessoas", nome: "Pessoas", dica: "quantidades por categoria" },
  { slug: "custos", nome: "Custos", dica: "gastos fixos" },
  { slug: "madrichim", nome: "Madrichim", dica: "cadastro e pagamentos" },
  { slug: "rateio", nome: "Rateio", dica: "peso grandes/pequenos" },
  { slug: "precos", nome: "Preços", dica: "a grade divulgada" },
  { slug: "transparencia", nome: "Transparência", dica: "por que este preço" },
  { slug: "cenarios", nome: "Cenários", dica: "e se…" },
  { slug: "comparativo", nome: "Comparativo", dica: "contra a anterior" },
  { slug: "registro", nome: "Registro", dica: "quem mudou o quê" },
] as const;

export function Navegacao({ id }: { id: string }) {
  const caminho = usePathname();
  return (
    <nav className="sem-impressao flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {TELAS.map((t, i) => {
        const href = `/machane/${id}/${t.slug}`;
        const ativa = caminho === href;
        return (
          <Link
            key={t.slug}
            href={href}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              ativa ? "bg-acento text-acentoTexto" : "text-texto hover:bg-papel",
            )}
          >
            <span className={cn("mr-1.5 text-[11px]", ativa ? "opacity-70" : "text-suave")}>
              {i + 1}
            </span>
            {t.nome}
            <span
              className={cn(
                "hidden text-[11px] lg:block",
                ativa ? "opacity-70" : "text-suave",
              )}
            >
              {t.dica}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
