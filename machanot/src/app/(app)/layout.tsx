import Link from "next/link";
import { exigirSessao } from "@/lib/auth";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  await exigirSessao();
  return (
    <div className="min-h-screen">
      <header className="sem-impressao border-b border-borda bg-papel">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-2.5">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">Precificação de machanot</span>
            <span className="hidden text-xs text-suave sm:inline">Chazit Hanoar</span>
          </Link>
          <div className="flex items-center gap-3">
            <form action="/sair" method="post">
              <button className="text-xs text-suave underline hover:text-texto" type="submit">
                sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1400px] px-4 py-5">{children}</div>
    </div>
  );
}
