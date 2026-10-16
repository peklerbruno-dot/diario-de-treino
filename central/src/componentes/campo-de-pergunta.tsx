"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** O campo do "Pergunte à Central": uma linha, Enter para perguntar. */
export function CampoDePergunta({ inicial = "", compacto = false }: { inicial?: string; compacto?: boolean }) {
  const router = useRouter();
  const [texto, setTexto] = useState(inicial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (texto.trim()) router.push(`/perguntar?q=${encodeURIComponent(texto.trim())}`);
      }}
    >
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Pergunte algo sobre seus e-mails…"
        aria-label="Pergunte à Central"
        className={`w-full rounded-lg border border-linha bg-superficie px-3.5 outline-none placeholder:text-fosco focus:border-regua ${compacto ? "py-2 text-[15px]" : "py-2.5 text-[16px]"}`}
      />
    </form>
  );
}
