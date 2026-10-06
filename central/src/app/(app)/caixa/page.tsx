import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { CartaoConversa, Vazio } from "@/componentes/cartao-conversa";
import { bd } from "@/lib/bd";
import { CATEGORIAS } from "@/lib/categorias";
import { ORDEM, VISIVEL } from "@/lib/consultas";

export const dynamic = "force-dynamic";

type Busca = Promise<{ categoria?: string; conta?: string; resolvidas?: string }>;

export default async function Caixa({ searchParams }: { searchParams: Busca }) {
  const { categoria, conta, resolvidas } = await searchParams;
  const verResolvidas = resolvidas === "1";

  const base: Prisma.ConversaWhereInput = verResolvidas ? { resolvida: true } : VISIVEL;
  const filtro: Prisma.ConversaWhereInput = {
    ...base,
    ...(categoria ? { categoria } : {}),
    ...(conta ? { contaId: conta } : {}),
  };

  const [contas, contagem, conversas] = await Promise.all([
    bd.conta.findMany({ orderBy: { criadoEm: "asc" } }),
    bd.conversa.groupBy({ by: ["categoria"], where: { ...base, ...(conta ? { contaId: conta } : {}) }, _count: true }),
    bd.conversa.findMany({ where: filtro, include: { conta: true }, orderBy: verResolvidas ? { ultimaData: "desc" } : ORDEM, take: 150 }),
  ]);

  const link = (mudar: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const atual = { categoria, conta, resolvidas, ...mudar };
    for (const [k, v] of Object.entries(atual)) if (v) p.set(k, v);
    const q = p.toString();
    return q ? `/caixa?${q}` : "/caixa";
  };
  const chip = (ativo: boolean) =>
    `shrink-0 rounded-full px-3 py-1.5 text-sm ${ativo ? "bg-tinta text-papel font-semibold" : "bg-cartao text-grafite shadow-cartao"}`;
  const total = contagem.reduce((s, c) => s + c._count, 0);

  return (
    <>
      <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href={link({ categoria: undefined })} className={chip(!categoria)}>
          Tudo {total}
        </Link>
        {CATEGORIAS.map((c) => {
          const n = contagem.find((x) => x.categoria === c.id)?._count ?? 0;
          if (!n && categoria !== c.id) return null;
          return (
            <Link key={c.id} href={link({ categoria: c.id })} className={chip(categoria === c.id)}>
              {c.icone} {c.nome} {n}
            </Link>
          );
        })}
      </div>

      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href={link({ conta: undefined })} className={chip(!conta)}>
          Todas as contas
        </Link>
        {contas.map((c) => (
          <Link key={c.id} href={link({ conta: c.id })} className={chip(conta === c.id)}>
            {c.rotulo}
          </Link>
        ))}
        <Link href={link({ resolvidas: verResolvidas ? undefined : "1" })} className={chip(verResolvidas)}>
          ✓ Resolvidas
        </Link>
      </div>

      {categoria && (
        <p className="mt-3 px-1 text-sm text-grafite">{CATEGORIAS.find((c) => c.id === categoria)?.explicacao}</p>
      )}

      <div className="mt-3 divide-y divide-linha overflow-hidden rounded-cartao bg-cartao shadow-cartao">
        {conversas.length ? (
          conversas.map((c) => <CartaoConversa key={c.id} c={c} mostrarCategoria={!categoria} />)
        ) : (
          <Vazio>Nada aqui.</Vazio>
        )}
      </div>
    </>
  );
}
