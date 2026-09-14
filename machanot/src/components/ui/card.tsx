import * as React from "react";
import { cn } from "@/lib/cn";

export function Cartao({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-borda bg-papel shadow-sm", className)}
      {...props}
    />
  );
}

export function CartaoTopo({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-borda px-4 py-3", className)} {...props} />;
}

export function CartaoTitulo({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-sm font-semibold", className)} {...props} />;
}

export function CartaoDescricao({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-0.5 text-xs text-suave", className)} {...props} />;
}

export function CartaoCorpo({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 py-3", className)} {...props} />;
}
