import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const selo = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4",
  {
    variants: {
      variante: {
        neutro: "border-borda bg-fundo text-suave",
        atencao: "border-atencao/30 bg-atencaoFundo text-atencao",
        erro: "border-erro/30 bg-erroFundo text-erro",
        ok: "border-ok/30 bg-okFundo text-ok",
        acento: "border-acento/30 bg-acento/10 text-acento",
      },
    },
    defaultVariants: { variante: "neutro" },
  },
);

export function Selo({
  className,
  variante,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof selo>) {
  return <span className={cn(selo({ variante }), className)} {...props} />;
}
