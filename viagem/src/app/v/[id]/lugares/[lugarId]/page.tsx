import Link from "next/link";
import { notFound } from "next/navigation";
import { bd } from "@/lib/bd";
import { exigirMembro } from "@/lib/auth";
import { diasEntre, curta } from "@/lib/datas";
import { infoCategoria, linkDeRota, linkDoMaps, linkDoUber, linkDoWaze } from "@/lib/lugares";
import { primeiroNome } from "@/lib/cores";
import { Cabecalho, Pagina, Secao } from "@/componentes/pecas";
import { Mapa } from "@/componentes/mapa";
import { apagarLugar, marcarFomos, votar } from "@/acoes/lugares";
import { FormularioDeItem } from "@/componentes/formulario-item";

export default async function Lugar({ params }: { params: Promise<{ id: string; lugarId: string }> }) {
  const { id, lugarId } = await params;
  const { eu, viagem } = await exigirMembro(id);
  const l = await bd.lugar.findFirst({
    where: { id: lugarId, viagemId: id, apagadoEm: null },
    include: {
      pasta: true,
      adicionadoPor: true,
      votos: { include: { membro: true } },
      itens: { orderBy: { dia: "asc" } },
    },
  });
  if (!l) notFound();

  const cat = infoCategoria(l.categoria);
  const votei = l.votos.some((v) => v.membroId === eu.id);
  const dias = diasEntre(viagem.inicio, viagem.fim);

  return (
    <Pagina abas>
      <Cabecalho
        titulo={l.nome}
        voltar={`/v/${id}/lugares${l.pastaId ? `?pasta=${l.pastaId}` : ""}`}
        subtitulo={[`${cat.emoji} ${cat.nome}`, l.cidade, l.pasta ? `${l.pasta.emoji} ${l.pasta.nome}` : ""].filter(Boolean).join(" · ")}
        acao={<Link href={`/v/${id}/lugares/${l.id}/editar`} className="mt-2 text-[15px] font-semibold text-realce">Editar</Link>}
      />

      <div className="grid grid-cols-2 gap-2">
        <a href={linkDeRota(l, "driving")} target="_blank" rel="noreferrer" className="botao col-span-2">🧭 Como chegar</a>
        <a href={linkDeRota(l, "walking")} target="_blank" rel="noreferrer" className="botao-leve">🚶 A pé</a>
        <a href={linkDeRota(l, "transit")} target="_blank" rel="noreferrer" className="botao-leve">🚇 Transporte</a>
        <a href={linkDoUber(l)} target="_blank" rel="noreferrer" className="botao-leve">🚗 Uber</a>
        <a href={linkDoWaze(l)} target="_blank" rel="noreferrer" className="botao-leve">🗺️ Waze</a>
        <a href={linkDoMaps(l)} target="_blank" rel="noreferrer" className="botao-leve col-span-2">Ver no Google Maps (fotos, horário, avaliações)</a>
      </div>

      {(l.descricao || l.dicas || l.endereco) && (
        <div className="cartao mt-5 space-y-3 p-4">
          {l.descricao && <p>{l.descricao}</p>}
          {l.dicas && (
            <div>
              <p className="rotulo">Dicas</p>
              <p className="whitespace-pre-line text-[15px] text-grafite">{l.dicas}</p>
            </div>
          )}
          {l.endereco && (
            <div>
              <p className="rotulo">Endereço</p>
              <p className="text-[15px] text-grafite">{l.endereco}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <form action={votar}>
          <input type="hidden" name="viagemId" value={id} />
          <input type="hidden" name="lugarId" value={l.id} />
          <button className={`pilula ${votei ? "pilula-ativa" : ""}`} aria-pressed={votei}>{votei ? "♥ Quero ir" : "♡ Quero ir"}</button>
        </form>
        <form action={marcarFomos}>
          <input type="hidden" name="viagemId" value={id} />
          <input type="hidden" name="lugarId" value={l.id} />
          <input type="hidden" name="fomos" value={l.fomos ? "nao" : "sim"} />
          <button className={`pilula ${l.fomos ? "pilula-ativa" : ""}`} aria-pressed={l.fomos}>{l.fomos ? "✓ Já fomos" : "Marcar que fomos"}</button>
        </form>
      </div>
      {l.votos.length > 0 && (
        <p className="mt-2 text-[14px] text-fosco">Querem ir: {l.votos.map((v) => primeiroNome(v.membro.nome)).join(", ")}</p>
      )}

      {l.lat != null && l.lng != null && (
        <div className="mt-5">
          <Mapa altura={220} mostrarEu={false} pontos={[{ id: l.id, nome: l.nome, lat: l.lat, lng: l.lng, emoji: cat.emoji }]} />
        </div>
      )}

      <Secao titulo="No roteiro">
        {l.itens.length > 0 && (
          <ul className="mb-3 space-y-1 text-[15px]">
            {l.itens.map((i) => (
              <li key={i.id}>
                <Link href={`/v/${id}/roteiro#${i.dia}`} className="text-realce">{curta(i.dia)}{i.hora && ` · ${i.hora}`}</Link>
              </li>
            ))}
          </ul>
        )}
        <details className="cartao p-4" open={l.itens.length === 0 ? undefined : false}>
          <summary className="cursor-pointer font-semibold text-realce">+ Pôr no roteiro</summary>
          <div className="mt-3">
            <FormularioDeItem viagemId={id} dias={dias} lugares={[]} lugarFixo={{ id: l.id, nome: l.nome }} />
          </div>
        </details>
      </Secao>

      <div className="mt-8 space-y-2 text-[14px] text-fosco">
        {l.adicionadoPor && <p>Adicionado por {primeiroNome(l.adicionadoPor.nome)}.</p>}
        {l.fonte && (
          <p>
            Veio de: <a href={l.fonte} target="_blank" rel="noreferrer" className="break-all text-realce">{l.fonte.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}</a>
          </p>
        )}
        <form action={apagarLugar}>
          <input type="hidden" name="viagemId" value={id} />
          <input type="hidden" name="lugarId" value={l.id} />
          <button className="text-vermelho">Apagar este lugar</button>
        </form>
      </div>
    </Pagina>
  );
}
