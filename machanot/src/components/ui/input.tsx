import * as React from "react";
import { cn } from "@/lib/cn";

const base =
  "w-full rounded-md border border-borda bg-papel px-2.5 py-1.5 text-sm placeholder:text-suave/70 focus:border-acento focus:outline-none focus:ring-2 focus:ring-acento/20 disabled:bg-fundo disabled:text-suave";

export const Campo = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(base, className)} {...props} />,
);
Campo.displayName = "Campo";

export const AreaTexto = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(base, "min-h-[68px] resize-y", className)} {...props} />
));
AreaTexto.displayName = "AreaTexto";

export const Selecao = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(base, "pr-7", className)} {...props} />
));
Selecao.displayName = "Selecao";

export function Rotulo({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mb-1 block text-xs font-medium text-suave", className)} {...props} />
  );
}
