import { bd } from "@/lib/bd";
import { exigirMembro } from "@/lib/auth";
import { infoCategoria } from "@/lib/lugares";
import { Cabecalho, Pagina } from "@/componentes/pecas";
import { Mapa } from "@/componentes/mapa";

export default async function MapaDaViagem({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pasta?: string }> }) {
  const { id } = await params;
  const { pasta = "" } = await searchParams;
  await exigirMembro(id);
  const lugares = await bd.lugar.findMany({
    where: { viagemId: id, apagadoEm: null, ...(pasta && pasta !== "sem" ? { pastaId: pasta } : {}) },
    orderBy: { criadoEm: "asc" },
  });
  const comPonto = lugares.filter((l) => l.lat != null && l.lng != null);
  const semPonto = lugares.length - comPonto.length;
  return (
    <Pagina abas>
      <Cabecalho titulo="Mapa" voltar={`/v/${id}/lugares${pasta ? `?pasta=${pasta}` : ""}`} subtitulo={`${comPonto.length} no mapa${semPonto ? ` · ${semPonto} sem localização` : ""}`} />
      <Mapa
        altura={560}
        pontos={comPonto.map((l) => ({
          id: l.id,
          nome: l.nome,
          lat: l.lat!,
          lng: l.lng!,
          emoji: infoCategoria(l.categoria).emoji,
          href: `/v/${id}/lugares/${l.id}`,
          detalhe: l.cidade,
        }))}
      />
      {semPonto > 0 && (
        <p className="mt-3 text-[14px] text-fosco">
          Os lugares sem localização continuam com o “Como chegar” funcionando — o Google Maps acha pelo nome. Para pôr no mapa, abra o lugar e cole o link do Google Maps dele em Editar.
        </p>
      )}
    </Pagina>
  );
}
