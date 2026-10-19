import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { IconeVoltar } from "@/componentes/icones";
import { LinhaConversa } from "@/componentes/linha-conversa";
import { Vazio } from "@/componentes/pecas";
import { bd } from "@/lib/bd";
import { FLUXOS, categoriasDoFluxo } from "@/lib/categorias";
import { ORDEM, visivel } from "@/lib/consultas";
import { corDaConta } from "@/lib/cores";
import { DetalheConversa } from "../conversa/detalhe";
import { PainelDividido } from "@/componentes/painel-dividido";

export const dynamic = "force-dynamic";

type Busca = Promise<{ fluxo?: string; conta?: string; resolvidas?: string; c?: string; cobrar?: string }>;

/**
 * E-mails: a lista à esquerda, a conversa aberta à direita. Filtros só dois,
 * em texto: o fluxo (Para você, Esperando, Para ler, Registros) e a conta.
 */
export default async function Emails({ searchParams }: { searchParams: Busca }) {
  const q = await searchParams;
  const resolvidas = q.resolvidas === "1";
  const fluxo = FLUXOS.find((f) => f.id === q.fluxo)?.id ?? "voce";

  const base: Prisma.ConversaWhereInput = resolvidas ? { resolvida: true } : visivel();
  const [contas, conversas] = await Promise.all([
    bd.conta.findMany({ orderBy: { criadoEm: "asc" } }),
    bd.conversa.findMany({
      where: {
        ...base,
        ...(q.conta ? { contaId: q.conta } : {}),
        ...(resolvidas ? {} : { categoria: { in: categoriasDoFluxo(fluxo) } }),
      },
      include: { conta: true },
      orderBy: resolvidas ? { atualizadoEm: "desc" } : ORDEM,
      take: 200,
    }),
  ]);

  const manter = { fluxo: q.fluxo, conta: q.conta, resolvidas: q.resolvidas };
  const link = (mudar: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...manter, ...mudar })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/caixa?${s}` : "/caixa";
  };
  const aba = (sel: boolean) => `shrink-0 text-[15px] ${sel ? "font-medium text-tinta" : "text-fosco hover:text-tinta"}`;
  const filtro = (sel: boolean) => `shrink-0 text-[13px] ${sel ? "text-tinta" : "text-fosco hover:text-tinta"}`;

  const lista = (
    <>
      <nav className="-mx-5 flex gap-5 overflow-x-auto px-5 lg:mx-0 lg:px-0">
        {FLUXOS.map((f) => (
          <Link key={f.id} href={link({ fluxo: f.id, resolvidas: undefined, c: undefined })} className={aba(!resolvidas && fluxo === f.id)}>
            {f.nome}
          </Link>
        ))}
      </nav>
      <nav className="-mx-5 mb-4 mt-2 flex gap-3 overflow-x-auto px-5 lg:mx-0 lg:px-0">
        <Link href={link({ conta: undefined, c: undefined })} className={filtro(!q.conta)}>
          Todas as contas
        </Link>
        {contas.map((c) => (
          <Link key={c.id} href={link({ conta: c.id, c: undefined })} className={filtro(q.conta === c.id)}>
            {c.rotulo}
          </Link>
        ))}
        <Link href={link({ resolvidas: resolvidas ? undefined : "1", c: undefined })} className={`ml-auto ${filtro(resolvidas)}`}>
          {resolvidas ? "Voltar às abertas" : "Resolvidas"}
        </Link>
      </nav>
      {conversas.length ? (
        conversas.map((c) => <LinhaConversa key={c.id} c={c} cor={corDaConta(contas, c.contaId)} href={link({ c: c.id })} ativa={q.c === c.id} />)
      ) : (
        <Vazio>Nada aqui.</Vazio>
      )}
    </>
  );

  return (
    <PainelDividido
      mostrarDireita={Boolean(q.c)}
      esquerda={
        <>
          <h1 className="mb-6 text-[28px] font-semibold tracking-tight">E-mails</h1>
          {lista}
        </>
      }
      direita={
        q.c ? (
          <div className="max-w-[760px]">
            <Link href={link({ c: undefined })} className="mb-6 inline-flex items-center gap-1 text-[15px] text-fosco lg:hidden">
              <IconeVoltar /> E-mails
            </Link>
            <DetalheConversa id={q.c} cobrar={q.cobrar === "1"} />
          </div>
        ) : (
          <div className="grid h-full place-items-center text-[15px] text-fosco">Escolha uma conversa.</div>
        )
      }
    />
  );
}
