"use client";

import { useState } from "react";
import { Campo } from "@/components/ui/input";
import { paraCentavos, reais } from "@/lib/dinheiro";
import { cn } from "@/lib/cn";

/**
 * Campo de dinheiro. Mostra "2.447,49", guarda 244749.
 * Enquanto a pessoa digita, o texto é dela; ao sair, volta formatado.
 */
export function CampoDinheiro({
  valor,
  aoMudar,
  disabled,
  className,
  id,
}: {
  valor: number;
  aoMudar: (cents: number) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  const [texto, setTexto] = useState<string | null>(null);
  return (
    <Campo
      id={id}
      inputMode="decimal"
      disabled={disabled}
      className={cn("text-right tabular", className)}
      value={texto ?? reais(valor)}
      onChange={(e) => {
        setTexto(e.target.value);
        const c = paraCentavos(e.target.value);
        if (c !== null) aoMudar(c);
      }}
      onFocus={(e) => {
        setTexto(reais(valor));
        e.currentTarget.select();
      }}
      onBlur={() => setTexto(null)}
    />
  );
}

/** Igual ao anterior, mas aceita ficar vazio (devolve null). */
export function CampoDinheiroOpcional({
  valor,
  aoMudar,
  disabled,
  className,
  placeholder,
  id,
}: {
  valor: number | null;
  aoMudar: (cents: number | null) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
}) {
  const [texto, setTexto] = useState<string | null>(null);
  return (
    <Campo
      id={id}
      inputMode="decimal"
      disabled={disabled}
      placeholder={placeholder ?? "—"}
      className={cn("text-right tabular", className)}
      value={texto ?? (valor === null ? "" : reais(valor))}
      onChange={(e) => {
        setTexto(e.target.value);
        if (e.target.value.trim() === "") {
          aoMudar(null);
          return;
        }
        const c = paraCentavos(e.target.value);
        if (c !== null) aoMudar(c);
      }}
      onFocus={(e) => {
        setTexto(valor === null ? "" : reais(valor));
        e.currentTarget.select();
      }}
      onBlur={() => setTexto(null)}
    />
  );
}

export function CampoInteiro({
  valor,
  aoMudar,
  min = 0,
  max = 5000,
  disabled,
  className,
  id,
}: {
  valor: number;
  aoMudar: (n: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  const [texto, setTexto] = useState<string | null>(null);
  return (
    <Campo
      id={id}
      inputMode="numeric"
      disabled={disabled}
      className={cn("text-right tabular", className)}
      value={texto ?? String(valor)}
      onChange={(e) => {
        setTexto(e.target.value);
        const n = Number(e.target.value.replace(/[^\d-]/g, ""));
        if (Number.isFinite(n) && n >= min && n <= max) aoMudar(Math.trunc(n));
      }}
      onFocus={(e) => {
        setTexto(String(valor));
        e.currentTarget.select();
      }}
      onBlur={() => setTexto(null)}
    />
  );
}

/** Percentual guardado como fração: mostra 3,0 e guarda 0,03. */
export function CampoPercentual({
  valor,
  aoMudar,
  disabled,
  className,
  id,
}: {
  valor: number | null;
  aoMudar: (fracao: number) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  const [texto, setTexto] = useState<string | null>(null);
  const mostrar = valor === null ? "" : String((valor * 100).toFixed(2)).replace(".", ",");
  return (
    <div className="relative">
      <Campo
        id={id}
        inputMode="decimal"
        disabled={disabled}
        className={cn("pr-6 text-right tabular", className)}
        value={texto ?? mostrar}
        onChange={(e) => {
          setTexto(e.target.value);
          const n = Number(e.target.value.replace(",", "."));
          if (Number.isFinite(n)) aoMudar(n / 100);
        }}
        onFocus={(e) => {
          setTexto(mostrar);
          e.currentTarget.select();
        }}
        onBlur={() => setTexto(null)}
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-suave">
        %
      </span>
    </div>
  );
}

/** Texto comum, sem debounce próprio: quem segura o debounce é o provedor. */
export function CampoTexto({
  valor,
  aoMudar,
  ...props
}: {
  valor: string;
  aoMudar: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return <Campo value={valor} onChange={(e) => aoMudar(e.target.value)} {...props} />;
}
