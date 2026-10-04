/**
 * A marca do app: o selo "$BP" e o nome, Finanças do BP.
 *
 * O selo é o mesmo desenho do ícone da tela de início — quadrado escuro, o
 * cifrão no verde de "sobrou" e as duas letras em serifa branca — para quem
 * abre o app reconhecer de onde veio. É feito em HTML, e não em imagem, para a
 * letra sair nítida em qualquer tamanho.
 */

export const NOME_DO_APP = "Finanças do BP";

export function SeloBP({ tamanho = 28 }: { tamanho?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: tamanho, height: tamanho, borderRadius: tamanho * 0.26 }}
      className="inline-flex shrink-0 items-center justify-center bg-[#111114] text-white ring-1 ring-white/10"
    >
      <span
        style={{ fontSize: tamanho * 0.4, lineHeight: 1, letterSpacing: "-0.03em" }}
        className="font-titulo font-bold"
      >
        <span className="text-[#3fbf7f]">$</span>BP
      </span>
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
