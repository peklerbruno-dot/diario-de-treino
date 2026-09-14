import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const botao = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento/40",
  {
    variants: {
      variante: {
        padrao: "bg-acento text-acentoTexto hover:bg-acento/90",
        contorno: "border border-borda bg-papel hover:bg-fundo",
        sutil: "text-suave hover:bg-fundo hover:text-texto",
        perigo: "border border-erro/30 bg-erroFundo text-erro hover:bg-erro/10",
      },
      tamanho: {
        padrao: "h-9 px-3.5",
        pequeno: "h-7 px-2 text-xs",
        icone: "h-8 w-8",
      },
    },
    defaultVariants: { variante: "padrao", tamanho: "padrao" },
  },
);

export interface BotaoProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof botao> {}

export const Botao = React.forwardRef<HTMLButtonElement, BotaoProps>(
  ({ className, variante, tamanho, ...props }, ref) => (
    <button ref={ref} className={cn(botao({ variante, tamanho }), className)} {...props} />
  ),
);
Botao.displayName = "Botao";

export { botao };
