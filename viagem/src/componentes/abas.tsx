"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONES: Record<string, React.ReactNode> = {
  inicio: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  lugares: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  roteiro: <><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></>,
  contas: <><rect x="2.5" y="6" width="19" height="13" rx="2" /><path d="M2.5 10.5h19M6.5 15h4" /></>,
  grupo: <><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5.2a3.5 3.5 0 0 1 0 6.6M18.5 14.3A6.5 6.5 0 0 1 21.5 20" /></>,
};

export function Abas({ viagemId, pendentes }: { viagemId: string; pendentes: number }) {
  const caminho = usePathname();
  const base = `/v/${viagemId}`;
  const abas = [
    { chave: "inicio", nome: "Início", href: base, ativa: caminho === base || /\/(votacoes|tarefas|documentos)/.test(caminho) },
    { chave: "lugares", nome: "Lugares", href: `${base}/lugares`, ativa: /\/(lugares|adicionar|caixa|mapa)/.test(caminho) },
    { chave: "roteiro", nome: "Roteiro", href: `${base}/roteiro`, ativa: caminho.startsWith(`${base}/roteiro`) },
    { chave: "contas", nome: "Contas", href: `${base}/contas`, ativa: caminho.startsWith(`${base}/contas`) },
    { chave: "grupo", nome: "Grupo", href: `${base}/grupo`, ativa: caminho.startsWith(`${base}/grupo`) },
  ];
  return (
    <nav className="abas fixed inset-x-0 bottom-0 z-30 border-t border-linha bg-cartao/95 backdrop-blur" aria-label="Seções da viagem">
      <ul className="mx-auto flex max-w-2xl">
        {abas.map((a) => (
          <li key={a.chave} className="flex-1">
            <Link
              href={a.href}
              aria-current={a.ativa ? "page" : undefined}
              className={`relative flex flex-col items-center gap-0.5 pb-1 pt-2 text-[11px] font-medium ${a.ativa ? "text-realce" : "text-fosco"}`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a.ativa ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {ICONES[a.chave]}
              </svg>
              {a.nome}
              {a.chave === "lugares" && pendentes > 0 && (
                <span className="absolute right-[calc(50%-20px)] top-1 min-w-[18px] rounded-full bg-realce px-1 text-center text-[11px] font-bold leading-[18px] text-realce-tinta">
                  {pendentes}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
