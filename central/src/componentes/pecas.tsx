import { categoria, COR_DO_TOM } from "@/lib/categorias";

/** A etiqueta da categoria: um ponto de cor e o nome, sem emoji. */
export function Etiqueta({ id }: { id: string }) {
  const c = categoria(id);
  return (
    <span className="inline-flex items-center gap-1.5 text-mini font-medium text-grafite">
      <span className={`h-1.5 w-1.5 rounded-full ${COR_DO_TOM[c.tom]}`} />
      {c.nome}
    </span>
  );
}

/** O nome curto da conta, com a cor dela. */
export function Conta({ rotulo, cor }: { rotulo: string; cor: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-mini font-semibold uppercase tracking-wide" style={{ color: cor }}>
      {rotulo}
    </span>
  );
}

export function Titulo({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="text-[26px] font-semibold tracking-tight lg:text-[28px]">{children}</h1>
      {sub && <p className="mt-0.5 text-sm text-fosco first-letter:uppercase">{sub}</p>}
    </header>
  );
}

/** Uma seção: título pequeno em caixa-alta e o conteúdo separado por linhas finas. */
export function Secao({
  titulo,
  conta,
  acao,
  children,
  className = "",
}: {
  titulo: string;
  conta?: number;
  acao?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mb-8 ${className}`}>
      <div className="mb-1.5 flex items-baseline gap-2 border-b border-linha pb-1.5">
        <h2 className="text-mini font-semibold uppercase tracking-[0.08em] text-fosco">{titulo}</h2>
        {conta !== undefined && <span className="numeros text-mini text-fosco">{conta}</span>}
        {acao && <div className="ml-auto text-sm">{acao}</div>}
      </div>
      {children}
    </section>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-sm text-fosco">{children}</p>;
}

/** O prazo de uma conversa ou tarefa: vermelho se venceu ou é hoje/amanhã. */
export function Prazo({ texto, vencido, perto }: { texto: string; vencido: boolean; perto: boolean }) {
  return (
    <span className={`numeros text-mini font-medium ${vencido || perto ? "text-atencao" : "text-alerta"}`}>{texto}</span>
  );
}
