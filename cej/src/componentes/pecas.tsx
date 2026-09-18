/**
 * As peças da interface.
 *
 * Nenhuma delas é um componente de cliente: são HTML com classe. O sistema
 * inteiro é feito de formulários que o servidor processa, então a página chega
 * pronta e funciona antes de qualquer JavaScript carregar — o que numa sala de
 * aula da FFLCH, com o wi-fi que tem, não é detalhe.
 */

import Link from "next/link";
import {
  COR_DO_ESTADO, NOME_DO_ESTADO, NOME_DO_ESTADO_DA_REUNIAO,
  type EstadoDaAtividade, type EstadoDaReuniao,
} from "@/lib/tipos";

export function Cartao({
  children,
  className = "",
  como: Como = "div",
}: {
  children: React.ReactNode;
  className?: string;
  como?: "div" | "section" | "article" | "li";
}) {
  return (
    <Como className={`cartao-impresso rounded-cartao bg-cartao shadow-cartao ${className}`}>
      {children}
    </Como>
  );
}

export function Titulo({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h1 className={`font-titulo text-[30px] font-semibold leading-tight tracking-tight ${className}`}>
      {children}
    </h1>
  );
}

export function Subtitulo({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`font-titulo text-[20px] font-semibold tracking-tight ${className}`}>{children}</h2>
  );
}

export function Sobrescrito({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`sobrescrito ${className}`}>{children}</p>;
}

/** A explicação abaixo de um título: o que esta tela é, em uma frase. */
export function Chamada({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 max-w-leitura text-[15px] leading-relaxed text-grafite">{children}</p>;
}

export function Selo({
  children,
  cor,
  className = "",
}: {
  children: React.ReactNode;
  cor?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-pilula px-2 py-[3px] text-[11px] font-semibold uppercase tracking-wide ${className}`}
      style={cor ? { color: cor, boxShadow: `inset 0 0 0 1px ${cor}` } : undefined}
    >
      {children}
    </span>
  );
}

export const SeloDoEstado = ({ estado }: { estado: EstadoDaAtividade }) => (
  <Selo cor={COR_DO_ESTADO[estado]}>{NOME_DO_ESTADO[estado]}</Selo>
);

export const SeloDaReuniao = ({ estado }: { estado: EstadoDaReuniao }) => (
  <Selo
    cor={
      estado === "CANCELADA"
        ? "var(--tinta-vermelha)"
        : estado === "REALIZADA"
          ? "var(--tinta-verde)"
          : "var(--tinta-azul)"
    }
  >
    {NOME_DO_ESTADO_DA_REUNIAO[estado]}
  </Selo>
);

const ESTILO_DO_BOTAO = {
  primario: "bg-heroi text-heroi-tinta font-semibold shadow-baixa hover:opacity-90",
  secundario: "bg-cartao text-tinta shadow-baixa hover:bg-linha",
  discreto: "text-realce hover:underline",
  perigo: "bg-cartao text-vermelho shadow-baixa hover:bg-linha",
} as const;

type Aparencia = keyof typeof ESTILO_DO_BOTAO;

export function Botao({
  children,
  tipo = "secundario",
  submit = true,
  name,
  value,
  disabled,
  className = "",
  formAction,
}: {
  children: React.ReactNode;
  tipo?: Aparencia;
  submit?: boolean;
  name?: string;
  value?: string;
  disabled?: boolean;
  className?: string;
  formAction?: (dados: FormData) => void | Promise<void>;
}) {
  const base =
    tipo === "discreto"
      ? "text-[14px]"
      : "inline-flex min-h-[42px] items-center justify-center rounded-folha px-4 text-[15px]";
  return (
    <button
      type={submit ? "submit" : "button"}
      name={name}
      value={value}
      disabled={disabled}
      formAction={formAction}
      className={`${base} ${ESTILO_DO_BOTAO[tipo]} disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function BotaoLink({
  children,
  href,
  tipo = "secundario",
  className = "",
}: {
  children: React.ReactNode;
  href: string;
  tipo?: Aparencia;
  className?: string;
}) {
  const base =
    tipo === "discreto"
      ? "text-[14px]"
      : "inline-flex min-h-[42px] items-center justify-center rounded-folha px-4 text-[15px]";
  return (
    <Link href={href} className={`${base} ${ESTILO_DO_BOTAO[tipo]} ${className}`}>
      {children}
    </Link>
  );
}

const CAMPO =
  "mt-1.5 w-full rounded-folha border border-regua bg-cartao px-3.5 py-2.5 outline-none focus:border-realce";

export function Campo({
  rotulo,
  dica,
  children,
  className = "",
}: {
  rotulo: string;
  dica?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[14px] font-medium text-grafite">{rotulo}</span>
      {children}
      {dica && <span className="mt-1 block text-[12.5px] leading-snug text-fosco">{dica}</span>}
    </label>
  );
}

export function Texto({
  nome,
  valor,
  tipo = "text",
  placeholder,
  obrigatorio,
  autoFoco,
  autoComplete,
  maximo,
}: {
  nome: string;
  valor?: string | null;
  tipo?: "text" | "email" | "password" | "date" | "time" | "number" | "url";
  placeholder?: string;
  obrigatorio?: boolean;
  autoFoco?: boolean;
  autoComplete?: string;
  maximo?: number;
}) {
  return (
    <input
      name={nome}
      type={tipo}
      defaultValue={valor ?? ""}
      placeholder={placeholder}
      required={obrigatorio}
      autoFocus={autoFoco}
      autoComplete={autoComplete}
      maxLength={maximo}
      className={CAMPO}
    />
  );
}

export function AreaDeTexto({
  nome,
  valor,
  linhas = 6,
  placeholder,
}: {
  nome: string;
  valor?: string | null;
  linhas?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      name={nome}
      rows={linhas}
      defaultValue={valor ?? ""}
      placeholder={placeholder}
      className={`${CAMPO} leading-relaxed`}
    />
  );
}

export function Selecao({
  nome,
  valor,
  opcoes,
  vazio,
}: {
  nome: string;
  valor?: string | null;
  opcoes: { valor: string; rotulo: string }[];
  /** O rótulo da opção "nenhum", quando não escolher é uma resposta legítima. */
  vazio?: string;
}) {
  return (
    <select name={nome} defaultValue={valor ?? ""} className={CAMPO}>
      {vazio && <option value="">{vazio}</option>}
      {opcoes.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.rotulo}
        </option>
      ))}
    </select>
  );
}

export function Aviso({
  children,
  tom = "neutro",
}: {
  children: React.ReactNode;
  tom?: "neutro" | "atencao" | "erro" | "bom";
}) {
  const cor =
    tom === "erro"
      ? "text-vermelho ring-vermelho/40"
      : tom === "atencao"
        ? "text-ambar ring-ambar/40"
        : tom === "bom"
          ? "text-verde ring-verde/40"
          : "text-grafite ring-regua";
  return (
    <div
      role={tom === "erro" ? "alert" : undefined}
      className={`rounded-folha bg-cartao p-3.5 text-[14.5px] leading-relaxed ring-1 ${cor}`}
    >
      {children}
    </div>
  );
}

/** O que a tela diz quando não há nada — e o que fazer a respeito. */
export function Vazio({ children, acao }: { children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <div className="rounded-cartao border border-dashed border-regua px-5 py-8 text-center">
      <p className="text-[15px] leading-relaxed text-fosco">{children}</p>
      {acao && <div className="mt-4 flex justify-center">{acao}</div>}
    </div>
  );
}

/** O cabeçalho de uma tela: título à esquerda, ação à direita. */
export function Topo({
  titulo,
  chamada,
  acao,
}: {
  titulo: string;
  chamada?: React.ReactNode;
  acao?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <Titulo>{titulo}</Titulo>
        {chamada && <Chamada>{chamada}</Chamada>}
      </div>
      {acao && <div className="nao-imprime flex shrink-0 gap-2">{acao}</div>}
    </div>
  );
}
