import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { IconeVoltar } from "@/componentes/icones";
import { LinhaConversa } from "@/componentes/linha-conversa";
import { Vazio } from "@/componentes/pecas";
import { bd } from "@/lib/bd";
import { CATEGORIAS, FLUXOS, categoriasDoFluxo } from "@/lib/categorias";
import { ORDEM, VISIVEL } from "@/lib/consultas";
import { corDaConta } from "@/lib/cores";
import { DetalheConversa } from "../conversa/detalhe";

export const dynamic = "force-dynamic";

type Busca = Promise<{ fluxo?: string; categoria?: string; conta?: string; resolvidas?: string; c?: string }>;

/**
 * E-mails: a lista por fluxo à esquerda e a conversa aberta à direita, como
 * num cliente de e-mail de computador. No celular, uma coisa de cada vez.
 */
export default async function Emails({ searchParams }: { searchParams: Busca }) {
  const q = await searchParams;
  const resolvidas = q.resolvidas === "1";
  const fluxo = FLUXOS.find((f) => f.id === q.fluxo)?.id ?? "voce";
  const cats = q.categoria ? [q.categoria] : categoriasDoFluxo(fluxo);

  const base: Prisma.ConversaWhereInput = resolvidas ? { resolvida: true } : VISIVEL;
  const doFiltro: Prisma.ConversaWhereInput = {
    ...base,
    ...(q.conta ? { contaId: q.conta } : {}),
    ...(resolvidas ? {} : { categoria: { in: cats } }),
  };

  const [contas, conversas, porCategoria] = await Promise.all([
    bd.conta.findMany({ orderBy: { criadoEm: "asc" } }),
    bd.conversa.findMany({
      where: doFiltro,
      include: { conta: true },
      orderBy: resolvidas ? { atualizadoEm: "desc" } : ORDEM,
      take: 200,
    }),
    bd.conversa.groupBy({ by: ["categoria"], where: { ...base, ...(q.conta ? { contaId: q.conta } : {}) }, _count: true }),
  ]);

  const manter = { fluxo: q.fluxo, categoria: q.categoria, conta: q.conta, resolvidas: q.resolvidas };
  const link = (mudar: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...manter, ...mudar })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/caixa?${s}` : "/caixa";
  };
  const n = (ids: string[]) => porCategoria.filter((p) => ids.includes(p.categoria)).reduce((s, p) => s + p._count, 0);
  const aba = (sel: boolean) =>
    `shrink-0 border-b-2 px-0.5 pb-2 text-sm ${sel ? "border-tinta font-semibold text-tinta" : "border-transparent text-fosco hover:text-tinta"}`;
  const pilula = (sel: boolean) =>
    `shrink-0 rounded-full px-2.5 py-1 text-mini ${sel ? "bg-tinta text-fundo font-semibold" : "bg-realce text-grafite hover:text-tinta"}`;
  const contaAtual = contas.find((c) => c.id === q.conta);

  const lista = (
    <div>
      <div className="-mx-4 flex gap-5 overflow-x-auto border-b border-linha px-4 lg:mx-0 lg:px-0">
        {FLUXOS.map((f) => (
          <Link key={f.id} href={link({ fluxo: f.id, categoria: undefined, resolvidas: undefined, c: undefined })} className={aba(!resolvidas && fluxo === f.id)}>
            {f.nome} <span className="numeros text-fosco">{n(categoriasDoFluxo(f.id))}</span>
          </Link>
        ))}
        <Link href={link({ resolvidas: "1", categoria: undefined, c: undefined })} className={aba(resolvidas)}>
          Resolvidas
        </Link>
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 py-3 lg:mx-0 lg:px-0">
        {!resolvidas && categoriasDoFluxo(fluxo).length > 1 && (
          <>
            <Link href={link({ categoria: undefined, c: undefined })} className={pilula(!q.categoria)}>
              Tudo
            </Link>
            {CATEGORIAS.filter((c) => c.fluxo === fluxo && (n([c.id]) > 0 || q.categoria === c.id)).map((c) => (
              <Link key={c.id} href={link({ categoria: c.id, c: undefined })} className={pilula(q.categoria === c.id)}>
                {c.nome} {n([c.id])}
              </Link>
            ))}
            <span className="mx-1 w-px shrink-0 bg-linha" />
          </>
        )}
        <Link href={link({ conta: undefined, c: undefined })} className={pilula(!q.conta)}>
          Todas as contas
        </Link>
        {contas.map((c) => (
          <Link key={c.id} href={link({ conta: c.id, c: undefined })} className={pilula(q.conta === c.id)}>
            {c.rotulo}
          </Link>
        ))}
      </div>

      <div className="border-t border-linha">
        {conversas.length ? (
          conversas.map((c) => (
            <LinhaConversa
              key={c.id}
              c={c}
              cor={corDaConta(contas, c.contaId)}
              href={link({ c: c.id })}
              ativa={q.c === c.id}
              mostrarCategoria={!q.categoria}
            />
          ))
        ) : (
          <Vazio>Nada aqui{contaAtual ? ` em ${contaAtual.rotulo}` : ""}.</Vazio>
        )}
      </div>
    </div>
  );

  return (
    <div className="lg:-my-8 lg:grid lg:h-screen lg:grid-cols-[minmax(340px,420px)_1fr] lg:gap-0">
      <div className={`${q.c ? "hidden lg:block" : ""} lg:overflow-y-auto lg:border-r lg:border-linha lg:py-8 lg:pr-6`}>
        <h1 className="mb-4 text-[26px] font-semibold tracking-tight lg:text-[28px]">E-mails</h1>
        {lista}
      </div>
      <div className={`${q.c ? "" : "hidden lg:block"} lg:overflow-y-auto lg:py-8 lg:pl-10`}>
        {q.c ? (
          <div className="mx-auto max-w-3xl">
            <Link href={link({ c: undefined })} className="mb-4 inline-flex items-center gap-1 text-sm text-grafite lg:hidden">
              <IconeVoltar /> E-mails
            </Link>
            <DetalheConversa id={q.c} />
          </div>
        ) : (
          <div className="grid h-full place-items-center text-sm text-fosco">Escolha uma conversa à esquerda.</div>
        )}
      </div>
    </div>
  );
}
