import Link from "next/link";
import { bd } from "@/lib/bd";
import { exigirMembro } from "@/lib/auth";
import { CATEGORIAS } from "@/lib/lugares";
import { Cabecalho, Pagina } from "@/componentes/pecas";
import { ListaDeLugares } from "@/componentes/lista-lugares";
import { criarPasta } from "@/acoes/lugares";

export default async function Lugares({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pasta?: string; categoria?: string }>;
}) {
  const { id } = await params;
  const { pasta = "", categoria = "" } = await searchParams;
  const { eu } = await exigirMembro(id);

  const [pastas, lugares, pendentes] = await Promise.all([
    bd.pasta.findMany({
      where: { viagemId: id },
      include: { _count: { select: { lugares: { where: { apagadoEm: null } } } } },
      orderBy: { criadoEm: "asc" },
    }),
    bd.lugar.findMany({
      where: {
        viagemId: id,
        apagadoEm: null,
        ...(pasta === "sem" ? { pastaId: null } : pasta ? { pastaId: pasta } : {}),
        ...(categoria ? { categoria } : {}),
      },
      include: { votos: { select: { membroId: true } }, adicionadoPor: { select: { nome: true } } },
      orderBy: { criadoEm: "desc" },
    }),
    bd.importacao.count({ where: { viagemId: id, estado: { in: ["pronta", "falhou"] } } }),
  ]);
  const pastaAtual = pastas.find((p) => p.id === pasta);
  const link = (mudar: { pasta?: string; categoria?: string }) => {
    const q = new URLSearchParams();
    const p = mudar.pasta ?? pasta;
    const c = mudar.categoria ?? categoria;
    if (p) q.set("pasta", p);
    if (c) q.set("categoria", c);
    const s = q.toString();
    return `/v/${id}/lugares${s ? `?${s}` : ""}`;
  };

  return (
    <Pagina abas>
      <Cabecalho
        titulo={pastaAtual ? `${pastaAtual.emoji} ${pastaAtual.nome}` : "Lugares"}
        subtitulo={`${lugares.length} ${lugares.length === 1 ? "lugar" : "lugares"}`}
        acao={
          <Link href={`/v/${id}/mapa${pasta ? `?pasta=${pasta}` : ""}`} className="botao-leve mt-1 min-h-[40px] px-3 text-[15px]">
            🗺️ Mapa
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-2">
        <Link href={`/v/${id}/adicionar${pasta && pasta !== "sem" ? `?pasta=${pasta}` : ""}`} className="botao">+ Adicionar</Link>
        <Link href={`/v/${id}/caixa`} className="botao-leve">
          Caixa de entrada{pendentes > 0 && <span className="rounded-full bg-realce px-2 text-[13px] font-bold text-realce-tinta">{pendentes}</span>}
        </Link>
      </div>

      <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href={link({ pasta: "" })} className={`pilula shrink-0 ${!pasta ? "pilula-ativa" : ""}`}>Todos</Link>
        {pastas.map((p) => (
          <Link key={p.id} href={link({ pasta: p.id })} className={`pilula shrink-0 ${pasta === p.id ? "pilula-ativa" : ""}`}>
            {p.emoji} {p.nome} <span className="text-fosco">{p._count.lugares}</span>
          </Link>
        ))}
        <Link href={link({ pasta: "sem" })} className={`pilula shrink-0 ${pasta === "sem" ? "pilula-ativa" : ""}`}>Sem pasta</Link>
      </div>
      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href={link({ categoria: "" })} className={`pilula shrink-0 ${!categoria ? "pilula-ativa" : ""}`}>Tudo</Link>
        {CATEGORIAS.map((c) => (
          <Link key={c.valor} href={link({ categoria: c.valor })} className={`pilula shrink-0 ${categoria === c.valor ? "pilula-ativa" : ""}`}>
            {c.emoji} {c.nome}
          </Link>
        ))}
      </div>

      <ListaDeLugares
        viagemId={id}
        euId={eu.id}
        lugares={lugares.map((l) => ({
          id: l.id,
          nome: l.nome,
          categoria: l.categoria,
          cidade: l.cidade,
          endereco: l.endereco,
          descricao: l.descricao,
          lat: l.lat,
          lng: l.lng,
          googlePlaceId: l.googlePlaceId,
          fomos: l.fomos,
          votos: l.votos.map((v) => v.membroId),
          quem: l.adicionadoPor?.nome ?? "",
        }))}
      />

      <details className="mt-8">
        <summary className="cursor-pointer text-[15px] font-semibold text-realce">+ Nova pasta</summary>
        <form action={criarPasta} className="mt-3 flex gap-2">
          <input type="hidden" name="viagemId" value={id} />
          <input name="emoji" className="campo w-16 text-center" defaultValue="📍" aria-label="Emoji" />
          <input name="nome" required className="campo flex-1" placeholder="Ex.: Puerto Escondido" />
          <button className="botao">Criar</button>
        </form>
      </details>
      {pastaAtual && (
        <Link href={`/v/${id}/lugares/pasta?id=${pastaAtual.id}`} className="mt-3 block text-[15px] text-fosco">Renomear ou apagar esta pasta</Link>
      )}
    </Pagina>
  );
}
