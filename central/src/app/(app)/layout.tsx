import Link from "next/link";
import { Atualizar } from "@/componentes/atualizar";
import { exigirSessao } from "@/lib/auth";
import { bd } from "@/lib/bd";

export default async function LayoutDoApp({ children }: { children: React.ReactNode }) {
  await exigirSessao();
  // Uma conta recém-conectada nunca foi lida: conta como "nunca atualizado",
  // para a busca rodar já, em vez de esperar os dez minutos das outras.
  const [recente, nova] = await Promise.all([
    bd.conta.findFirst({
      where: { ultimaSincronia: { not: null } },
      orderBy: { ultimaSincronia: "desc" },
      select: { ultimaSincronia: true },
    }),
    bd.conta.findFirst({ where: { ultimaSincronia: null, erro: null }, select: { id: true } }),
  ]);
  const ultima = nova ? null : (recente?.ultimaSincronia?.toISOString() ?? null);
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16">
      <header className="flex items-start justify-between pt-5">
        <div>
          <Link href="/" className="font-titulo text-3xl">
            Central
          </Link>
          <nav className="mt-2 flex gap-4 text-sm font-semibold text-grafite">
            <Link href="/">Hoje</Link>
            <Link href="/caixa">E-mails</Link>
            <Link href="/ajustes">Ajustes</Link>
          </nav>
        </div>
        <Atualizar ultima={ultima} />
      </header>
      {children}
    </div>
  );
}
