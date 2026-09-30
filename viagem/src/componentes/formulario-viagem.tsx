"use client";

import { criarViagem, editarViagem } from "@/acoes/viagem";
import { Formulario } from "@/componentes/formulario";
import { comoVeio } from "@/lib/formulario";
import { LISTA_DE_MOEDAS, MOEDAS } from "@/lib/dinheiro";
import { Aviso } from "./pecas";

type Viagem = { id: string; nome: string; destino: string; inicio: string; fim: string; moedaBase: string };

export function FormularioDeViagem({ viagem }: { viagem?: Viagem }) {
  return (
    <Formulario acao={viagem ? editarViagem : criarViagem} botao={viagem ? "Salvar" : "Criar viagem"}>
      {(e) => (
        <>
          {e?.valores?.ok && <Aviso tom="ok">Salvo.</Aviso>}
          {viagem && <input type="hidden" name="viagemId" value={viagem.id} />}
          <label className="block">
            <span className="rotulo">Nome</span>
            <input name="nome" required className="campo" defaultValue={comoVeio(e, "nome", viagem?.nome)} placeholder="México 2026 🇲🇽" />
          </label>
          <label className="block">
            <span className="rotulo">Destino</span>
            <input name="destino" className="campo" defaultValue={comoVeio(e, "destino", viagem?.destino ?? "México")} placeholder="México" />
            <span className="mt-1 block text-[13px] text-fosco">Ajuda a achar os lugares no mapa certo.</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="rotulo">Ida</span>
              <input name="inicio" type="date" required className="campo" defaultValue={comoVeio(e, "inicio", viagem?.inicio)} />
            </label>
            <label className="block">
              <span className="rotulo">Volta</span>
              <input name="fim" type="date" required className="campo" defaultValue={comoVeio(e, "fim", viagem?.fim)} />
            </label>
          </div>
          <label className="block">
            <span className="rotulo">Moeda das contas</span>
            <select name="moedaBase" className="campo" defaultValue={comoVeio(e, "moedaBase", viagem?.moedaBase ?? "BRL")}>
              {LISTA_DE_MOEDAS.map((m) => (
                <option key={m} value={m}>{MOEDAS[m].nome} ({m})</option>
              ))}
            </select>
            <span className="mt-1 block text-[13px] text-fosco">Os saldos aparecem nela. Dá para lançar em pesos, dólar etc.</span>
          </label>
          {!viagem && (
            <>
              <label className="block">
                <span className="rotulo">Quem mais vai</span>
                <textarea name="outros" rows={3} className="campo" defaultValue={comoVeio(e, "outros")} placeholder={"Um nome por linha, ou separados por vírgula"} />
                <span className="mt-1 block text-[13px] text-fosco">Já entram nas contas. Quando abrirem o convite, escolhem o próprio nome.</span>
              </label>
              <label className="block">
                <span className="rotulo">Pastas de lugares (opcional)</span>
                <input name="pastas" className="campo" defaultValue={comoVeio(e, "pastas", "Cidade do México, Oaxaca, Puerto Escondido")} />
              </label>
            </>
          )}
        </>
      )}
    </Formulario>
  );
}
