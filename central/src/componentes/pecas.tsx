import { categoria } from "@/lib/categorias";

/**
 * As peças de texto da Central. A regra: uma cor de destaque só (a da conta,
 * num ponto pequeno), vermelho apenas para o que venceu ou vence hoje, e o
 * resto em tinta e cinza. Hierarquia se faz com tamanho e peso, não com cor.
 */

export const nomeDaCategoria = (id: string) => categoria(id).nome;

/** O ponto da conta: 8 px, a cor que diz de onde a coisa vem. */
export function Ponto({ cor, titulo }: { cor: string; titulo?: string }) {
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: cor }} title={titulo} />;
}


/** As iniciais de alguém num círculo na cor da conta (como num app de contatos). */
export function Avatar({ nome, cor, tamanho = 36 }: { nome: string; cor: string; tamanho?: number }) {
  const partes = nome.replace(/^Para:\s*/, "").replace(/[^\p{L}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  const iniciais = ((partes[0]?.[0] ?? "?") + (partes.length > 1 ? partes[partes.length - 1][0] : (partes[0]?.[1] ?? ""))).toUpperCase();
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ background: cor, width: tamanho, height: tamanho, fontSize: tamanho * 0.36 }}
      aria-hidden
    >
      {iniciais}
    </span>
  );
}
/**
 * Um bloco de itens, como as listas agrupadas do iPhone: um cartão branco,
 * com uma linha fina entre um item e outro.
 */
export function Grupo({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`cartao divide-y divide-linha overflow-hidden ${className}`}>{children}</div>;
}

export function Titulo({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <header className="mb-8">
      <h1 className="serifa text-[34px] leading-tight">{children}</h1>
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
  tom,
}: {
  titulo: string;
  /** "atencao" pinta o título de vermelho (atrasadas). */
  tom?: "atencao";
  acao?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mb-8 ${className}`}>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className={`rotulo ${tom === "atencao" ? "!text-atencao" : ""}`}>{titulo}</h2>
        {acao && <div className="text-[14px] font-semibold text-destaque">{acao}</div>}
      </div>
      {children}
    </section>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="cartao px-4 py-4 text-[15px] text-fosco">{children}</p>;
}

/** O prazo, discreto: "até sex., 18/10" em cinza; vermelho só se venceu ou é hoje. */
export function Prazo({ texto, vencido }: { texto: string; vencido: boolean; perto?: boolean }) {
  const [dia, falta] = texto.split(" · ");
  if (vencido) return <span className="numeros whitespace-nowrap text-atencao">{falta}</span>;
  if (falta === "hoje") return <span className="whitespace-nowrap text-atencao">vence hoje</span>;
  return <span className="numeros whitespace-nowrap text-fosco">até {falta === "amanhã" ? "amanhã" : dia}</span>;
}
