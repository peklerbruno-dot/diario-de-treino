import Link from "next/link";
import { Atualizar } from "@/componentes/atualizar";
import { Abas, Lateral } from "@/componentes/navegacao";
import { exigirSessao } from "@/lib/auth";
import { bd } from "@/lib/bd";

export default async function LayoutDoApp({ children }: { children: React.ReactNode }) {
  await exigirSessao();
  const contas = await bd.conta.findMany({ select: { ultimaSincronia: true, erro: true } });

  // Uma conta recém-conectada nunca foi lida: conta como "nunca atualizado",
  // para a busca rodar já, em vez de esperar os dez minutos das outras.
  const nova = contas.some((c) => !c.ultimaSincronia && !c.erro);
  const recente = contas
    .map((c) => c.ultimaSincronia)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const ultima = nova ? null : (recente?.toISOString() ?? null);
  const desconectadas = contas.filter((c) => c.erro).length;

  // Uma linha só, discreta, no lugar de um aviso vermelho por conta.
  const status = (
    <div className="space-y-1">
      {desconectadas > 0 && (
        <Link href="/ajustes" className="block text-[13px] text-atencao hover:underline">
          {desconectadas === 1 ? "1 conta pede reconexão" : `${desconectadas} contas pedem reconexão`}
        </Link>
      )}
      <Atualizar ultima={ultima} />
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <Lateral rodape={status} />
      <div className="min-w-0 flex-1">
        <div className="seguro-em-cima sticky top-0 z-10 flex items-center justify-between bg-fundo px-5 py-3 lg:hidden">
          <span className="serifa text-[19px]">Central</span>
          <div className="text-right">{status}</div>
        </div>
        <main className="px-4 pb-32 pt-4 lg:px-12 lg:pb-16 lg:pt-12">{children}</main>
      </div>
      <Abas />
    </div>
  );
}
