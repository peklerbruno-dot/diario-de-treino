import { categoria } from "@/lib/categorias";

/**
 * As peças de texto da Central. A regra: uma cor de destaque só (a da conta,
 * num ponto pequeno), vermelho apenas para o que venceu ou vence hoje, e o
 * resto em tinta e cinza. Hierarquia se faz com tamanho e peso, não com cor.
 */

export const nomeDaCategoria = (id: string) => categoria(id).nome;

/** O ponto da conta: 7 px, a única cor numa linha. */
export function Ponto({ cor, titulo }: { cor: string; titulo?: string }) {
  return <span className="inline-block h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: cor }} title={titulo} />;
}

export function Titulo({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <header className="mb-8">
      <h1 className="text-[28px] font-semibold tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-[15px] text-fosco first-letter:uppercase">{sub}</p>}
    </header>
  );
}

/** Uma seção: um título pequeno, sem caixa-alta nem linha, e o conteúdo. */
export function Secao({
  titulo,
  acao,
  children,
  className = "",
}: {
  titulo: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mb-10 ${className}`}>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[13px] font-semibold text-fosco">{titulo}</h2>
        {acao && <div className="text-[13px] text-fosco">{acao}</div>}
      </div>
      {children}
    </section>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-[15px] text-fosco">{children}</p>;
}

/** O prazo, discreto: "até sex., 18/10" em cinza; vermelho só se venceu ou é hoje. */
export function Prazo({ texto, vencido }: { texto: string; vencido: boolean; perto?: boolean }) {
  const [dia, falta] = texto.split(" · ");
  if (vencido) return <span className="numeros whitespace-nowrap text-atencao">{falta}</span>;
  if (falta === "hoje") return <span className="whitespace-nowrap text-atencao">vence hoje</span>;
  return <span className="numeros whitespace-nowrap text-fosco">até {falta === "amanhã" ? "amanhã" : dia}</span>;
}
