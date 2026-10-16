import { Suspense } from "react";
import { Atualizar } from "@/componentes/atualizar";
import { Abas, Lateral, type ResumoNav } from "@/componentes/navegacao";
import { exigirSessao } from "@/lib/auth";
import { bd } from "@/lib/bd";
import { FLUXOS, categoriasDoFluxo, DEPENDEM_DE_MIM } from "@/lib/categorias";
import { VISIVEL } from "@/lib/consultas";
import { corDaConta } from "@/lib/cores";
import { fimDeHojeUTC } from "@/lib/datas";

export default async function LayoutDoApp({ children }: { children: React.ReactNode }) {
  await exigirSessao();
  const [contas, porCategoria, tarefasHoje, acoesHoje] = await Promise.all([
    bd.conta.findMany({ orderBy: { criadoEm: "asc" } }),
    bd.conversa.groupBy({ by: ["categoria"], where: VISIVEL, _count: true }),
    bd.tarefa.count({ where: { feitaEm: null, prazo: { lte: fimDeHojeUTC() } } }),
    bd.conversa.count({ where: { ...VISIVEL, categoria: { in: DEPENDEM_DE_MIM }, prazo: { lte: fimDeHojeUTC() } } }),
  ]);

  const n = (cats: string[]) => porCategoria.filter((p) => cats.includes(p.categoria)).reduce((s, p) => s + p._count, 0);
  const resumo: ResumoNav = {
    hoje: n(DEPENDEM_DE_MIM),
    tarefas: tarefasHoje + acoesHoje,
    fluxos: FLUXOS.map((f) => ({ id: f.id, nome: f.nome, n: n(categoriasDoFluxo(f.id)) })),
    contas: contas.map((c) => ({ id: c.id, rotulo: c.rotulo, email: c.email, cor: corDaConta(contas, c.id), erro: Boolean(c.erro) })),
  };

  // Uma conta recém-conectada nunca foi lida: conta como "nunca atualizado",
  // para a busca rodar já, em vez de esperar os dez minutos das outras.
  const nova = contas.some((c) => !c.ultimaSincronia && !c.erro);
  const recente = contas
    .map((c) => c.ultimaSincronia)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const ultima = nova ? null : (recente?.toISOString() ?? null);
  const status = <Atualizar ultima={ultima} />;

  return (
    <div className="flex min-h-screen">
      <Suspense>
        <Lateral resumo={resumo} rodape={status} />
      </Suspense>
      <div className="min-w-0 flex-1">
        <div className="seguro-em-cima sticky top-0 z-10 flex items-center justify-between border-b border-linha bg-fundo px-4 py-2.5 backdrop-blur lg:hidden">
          <span className="text-[15px] font-semibold tracking-tight">Central</span>
          {status}
        </div>
        <main className="px-4 pb-28 pt-5 lg:px-10 lg:pb-12 lg:pt-8">{children}</main>
      </div>
      <Abas resumo={resumo} />
    </div>
  );
}
