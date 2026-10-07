import Link from "next/link";
import { Atualizar } from "@/componentes/atualizar";
import { exigirSessao } from "@/lib/auth";

export default async function LayoutDoApp({ children }: { children: React.ReactNode }) {
  await exigirSessao();
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16">
      <header className="flex items-start justify-between pt-5">
        <div>
          <Link href="/" className="font-titulo text-3xl">
            Central
          </Link>
          <nav className="mt-2 flex gap-4 text-sm font-semibold text-grafite">
            <Link href="/">Painel</Link>
            <Link href="/caixa">Caixa</Link>
            <Link href="/ajustes">Ajustes</Link>
          </nav>
        </div>
        <Atualizar />
      </header>
      {children}
    </div>
  );
}
