"use client";

import { useState } from "react";

export function EscolhaDePasta({ pastas, inicial }: { pastas: { id: string; nome: string }[]; inicial: string }) {
  const [valor, setValor] = useState(inicial);
  return (
    <div className="space-y-2">
      <label className="block">
        <span className="rotulo">Salvar na pasta</span>
        <select name="pastaId" value={valor} onChange={(e) => setValor(e.target.value)} className="campo">
          <option value="">Sem pasta</option>
          {pastas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          <option value="nova">+ Pasta nova…</option>
        </select>
      </label>
      {valor === "nova" && <input name="novaPasta" required autoFocus className="campo" placeholder="Nome da pasta (ex.: Tulum)" />}
    </div>
  );
}
