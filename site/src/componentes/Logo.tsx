/**
 * O símbolo da Chazit Hanoar redesenhado em vetor a partir do manual: o
 * trapézio com as duas figuras. As variantes são as do manual — fundo
 * marinho, fundo azul, e só as figuras sobre fundo escuro.
 */

const VARIANTES = {
  marinho: { fundo: "#2B3278", figura: "#FFFFFF" },
  azul: { fundo: "#3C91E6", figura: "#FFFFFF" },
  branco: { fundo: "#FFFFFF", figura: "#2B3278" },
  brancoAzul: { fundo: "#FFFFFF", figura: "#3C91E6" },
} as const;

export function Simbolo({
  variante = "marinho",
  className,
  titulo = "Chazit Hanoar",
}: {
  variante?: keyof typeof VARIANTES;
  className?: string;
  titulo?: string;
}) {
  const { fundo, figura } = VARIANTES[variante];
  return (
    <svg viewBox="0 0 1026 895" className={className} role="img" aria-label={titulo}>
      <path d="M176 0H850L1026 895H0Z" fill={fundo} />
      <g fill={figura}>
        <circle cx="355" cy="230" r="118" />
        <circle cx="670" cy="230" r="118" />
        <path d="M188 314Q357 447 490 328V784H93L121 656H182L216 451H156Z" />
        <path d="M535 328Q670 447 837 314L933 784H802V736H644V784H535Z" />
      </g>
    </svg>
  );
}

/** Símbolo + "CHAZIT HANOAR / SÃO PAULO", como no cabeçalho. */
export function Marca({ claro = false }: { claro?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <Simbolo variante={claro ? "branco" : "marinho"} className="h-9 w-auto shrink-0" titulo="" />
      <span className={`flex flex-col leading-none ${claro ? "text-white" : "text-marinho"}`}>
        <span className="font-titulo text-[15px] font-black tracking-tight sm:text-base">CHAZIT HANOAR</span>
        <span className="mt-0.5 self-end font-titulo text-[10px] font-normal tracking-[0.12em]">SÃO PAULO</span>
      </span>
    </span>
  );
}
