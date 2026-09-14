import { cn } from "@/lib/cn";

/** Faixa de aviso. Amarelo = confira; vermelho = está errado. */
export function Aviso({
  children,
  tom = "atencao",
  className,
}: {
  children: React.ReactNode;
  tom?: "atencao" | "erro" | "ok" | "neutro";
  className?: string;
}) {
  const tons = {
    atencao: "border-atencao/30 bg-atencaoFundo text-atencao",
    erro: "border-erro/30 bg-erroFundo text-erro",
    ok: "border-ok/30 bg-okFundo text-ok",
    neutro: "border-borda bg-fundo text-suave",
  } as const;
  return (
    <div className={cn("rounded-md border px-3 py-2 text-xs leading-relaxed", tons[tom], className)}>
      {children}
    </div>
  );
}
