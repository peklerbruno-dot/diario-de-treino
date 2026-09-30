"use client";

import { salvarLugar } from "@/acoes/lugares";
import { Formulario } from "@/componentes/formulario";
import { comoVeio } from "@/lib/formulario";
import { CATEGORIAS } from "@/lib/lugares";

type Lugar = {
  id: string;
  nome: string;
  categoria: string;
  cidade: string;
  endereco: string;
  descricao: string;
  dicas: string;
  fonte: string;
  pastaId: string | null;
  lat: number | null;
  lng: number | null;
};

export function FormularioDeLugar({ viagemId, pastas, lugar, pastaInicial }: { viagemId: string; pastas: { id: string; nome: string; emoji: string }[]; lugar?: Lugar; pastaInicial?: string }) {
  return (
    <Formulario acao={salvarLugar} botao="Salvar">
      {(e) => (
        <>
          <input type="hidden" name="viagemId" value={viagemId} />
          {lugar && <input type="hidden" name="lugarId" value={lugar.id} />}
          {lugar && <input type="hidden" name="lat" value={lugar.lat ?? ""} />}
          {lugar && <input type="hidden" name="lng" value={lugar.lng ?? ""} />}
          <label className="block">
            <span className="rotulo">Nome</span>
            <input name="nome" required className="campo" defaultValue={comoVeio(e, "nome", lugar?.nome)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="rotulo">Tipo</span>
              <select name="categoria" className="campo" defaultValue={comoVeio(e, "categoria", lugar?.categoria ?? "restaurante")}>
                {CATEGORIAS.map((c) => <option key={c.valor} value={c.valor}>{c.emoji} {c.nome}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="rotulo">Pasta</span>
              <select name="pastaId" className="campo" defaultValue={comoVeio(e, "pastaId", lugar?.pastaId ?? pastaInicial ?? "")}>
                <option value="">Sem pasta</option>
                {pastas.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.nome}</option>)}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="rotulo">Cidade</span>
            <input name="cidade" className="campo" defaultValue={comoVeio(e, "cidade", lugar?.cidade)} placeholder="Cidade do México" />
          </label>
          <label className="block">
            <span className="rotulo">Endereço ou bairro</span>
            <input name="endereco" className="campo" defaultValue={comoVeio(e, "endereco", lugar?.endereco)} />
          </label>
          <label className="block">
            <span className="rotulo">Link do Google Maps (opcional)</span>
            <input name="linkMaps" type="url" inputMode="url" className="campo" defaultValue={comoVeio(e, "linkMaps")} placeholder="https://maps.app.goo.gl/…" />
            <span className="mt-1 block text-[13px] text-fosco">
              {lugar?.lat != null ? "Já está no mapa. Cole um link só se o ponto estiver errado." : "Põe o lugar no ponto exato do mapa."}
            </span>
          </label>
          <label className="block">
            <span className="rotulo">O que é</span>
            <textarea name="descricao" rows={2} className="campo" defaultValue={comoVeio(e, "descricao", lugar?.descricao)} />
          </label>
          <label className="block">
            <span className="rotulo">Dicas</span>
            <textarea name="dicas" rows={3} className="campo" defaultValue={comoVeio(e, "dicas", lugar?.dicas)} placeholder="O que pedir, preço, precisa reservar…" />
          </label>
          <label className="block">
            <span className="rotulo">De onde veio (link do post)</span>
            <input name="fonte" className="campo" defaultValue={comoVeio(e, "fonte", lugar?.fonte)} />
          </label>
        </>
      )}
    </Formulario>
  );
}
