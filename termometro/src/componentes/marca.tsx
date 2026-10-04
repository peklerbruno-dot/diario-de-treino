/**
 * A marca do app: o selo "BP" e o nome, Finanças do BP.
 *
 * O selo é o mesmo desenho do ícone da tela de início — quadrado escuro, as
 * duas letras em serifa e o traço verde de "sobrou" embaixo — para quem abre o
 * app reconhecer de onde veio. É feito em HTML, e não em imagem, para a letra
 * sair nítida em qualquer tamanho e trocar de cor junto com o modo escuro.
 */

export const NOME_DO_APP = "Finanças do BP";

export function SeloBP({ tamanho = 28 }: { tamanho?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: tamanho, height: tamanho, borderRadius: tamanho * 0.26 }}
      className="relative inline-flex shrink-0 flex-col items-center justify-center bg-[#111114] text-white ring-1 ring-white/10"
    >
      <span
        style={{ fontSize: tamanho * 0.42, lineHeight: 1, letterSpacing: "-0.02em" }}
        className="font-titulo font-bold"
      >
        BP
      </span>
      <span
        style={{
          width: tamanho * 0.36,
          height: Math.max(1.5, tamanho * 0.055),
          marginTop: tamanho * 0.035,
        }}
        className="rounded-full bg-[#3fbf7f]"
      />
    </span>
  );
}

export function Marca({ tamanho = "pequena" }: { tamanho?: "pequena" | "grande" }) {
  const grande = tamanho === "grande";
  return (
    <span className="inline-flex items-center gap-2.5">
      <SeloBP tamanho={grande ? 44 : 28} />
      <span
        className={`font-titulo font-semibold tracking-tight text-tinta ${
          grande ? "text-[26px]" : "text-[19px]"
        }`}
      >
        Finanças <span className="font-normal text-grafite">do</span> BP
      </span>
    </span>
  );
}
