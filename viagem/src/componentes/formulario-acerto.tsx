"use client";

import { registrarPagamento } from "@/acoes/contas";
import { Formulario } from "./formulario";
import { comoVeio } from "@/lib/formulario";

export function FormularioDeAcerto({
  viagemId,
  membros,
  de,
  para,
  valor,
  moedaBase,
  hoje,
}: {
  viagemId: string;
  membros: { id: string; nome: string }[];
  de: string;
  para: string;
  valor: string;
  moedaBase: string;
  hoje: string;
}) {
  return (
    <Formulario acao={registrarPagamento} botao="Registrar acerto">
      {(e) => (
        <>
          <input type="hidden" name="viagemId" value={viagemId} />
          <label className="block">
            <span className="rotulo">Quem pagou</span>
            <select name="deId" className="campo" defaultValue={comoVeio(e, "deId", de)}>
              {membros.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="rotulo">Para quem</span>
            <select name="paraId" className="campo" defaultValue={comoVeio(e, "paraId", para)} required>
              <option value="">Escolha</option>
              {membros.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="rotulo">Valor ({moedaBase})</span>
            <input name="valor" inputMode="decimal" required className="campo text-[20px] font-semibold tabular-nums" defaultValue={comoVeio(e, "valor", valor)} placeholder="0,00" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="rotulo">Data</span>
              <input name="data" type="date" className="campo" defaultValue={comoVeio(e, "data", hoje)} />
            </label>
            <label className="block">
              <span className="rotulo">Como</span>
              <input name="notas" className="campo" defaultValue={comoVeio(e, "notas")} placeholder="Pix, dinheiro…" />
            </label>
          </div>
        </>
      )}
    </Formulario>
  );
}
