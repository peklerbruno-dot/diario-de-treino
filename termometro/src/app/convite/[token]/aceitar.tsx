"use client";

import Link from "next/link";
import { useState } from "react";
import { acaoAceitarConvite } from "@/app/acoes";
import { CodigoGuardavel } from "@/componentes/codigo-guardavel";

/**
 * As três caras do convite: valendo, já aceito (o código na tela) e sem
 * validade.
 *
 * Fica tudo num componente só, no mesmo lugar da página, por um motivo: o
 * aceite abre a sessão, e gravar cookie numa ação do servidor faz o Next
 * redesenhar a página — que, olhando o banco de novo, já vê o convite gasto.
 * Se o "sem validade" fosse outro ramo da página, o código sumiria da tela no
 * mesmo instante em que aparece. Aqui o estado sobrevive ao redesenho.
 */
export function AceitarConvite({ token, nome }: { token: string; nome: string | null }) {
  const [esperando, setEsperando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);

  if (codigo) {
    return (
      <div className="mt-6">
        <h1 className="mb-4 text-[24px] font-semibold tracking-tight">Pronto, está criado.</h1>
        <CodigoGuardavel codigo={codigo} />
        <p className="mt-4 text-[15px] leading-relaxed text-grafite">
          Este aparelho já está dentro. O código é para entrar em outro aparelho, ou neste mesmo
          daqui a seis meses — e para o atalho da Siri, se um dia quiser montar.
        </p>
        {/* Navegação inteira, e não do lado do cliente: o app começa limpo. */}
        <a
          href="/"
          className="mt-5 flex min-h-[50px] w-full items-center justify-center rounded-folha bg-tinta px-4 text-[17px] font-medium text-papel"
        >
          Abrir o app
        </a>
      </div>
    );
  }

  if (nome === null) {
    return (
      <>
        <h1 className="mt-6 text-[24px] font-semibold tracking-tight">Convite sem validade</h1>
        <p className="mt-2 text-[17px] leading-relaxed text-grafite">
          Este convite já foi usado ou venceu (eles valem sete dias). Peça um novo ao BP — ou, se
          você já tem o seu código, é só entrar.
        </p>
        <Link
          href="/entrar"
          className="mt-6 inline-flex min-h-[46px] items-center justify-center rounded-folha bg-tinta px-4 text-[17px] font-medium text-papel"
        >
          Entrar com meu código
        </Link>
      </>
    );
  }

  return (
    <div className="mt-6">
      <h1 className="text-[24px] font-semibold tracking-tight">Oi, {nome}!</h1>
      <p className="mt-2 mb-6 text-[17px] leading-relaxed text-grafite">
        O BP te convidou para usar o app dele de finanças. A conta é sua e começa do zero: ninguém
        mais vê o que você lança — nem ele.
      </p>
      {erro && (
        <p role="alert" className="mb-3 text-[15px] text-atencao">
          {erro}
        </p>
      )}
      <button
        type="button"
        disabled={esperando}
        onClick={async () => {
          setEsperando(true);
          setErro(null);
          try {
            const r = await acaoAceitarConvite(token);
            if (r.ok) setCodigo(r.codigo);
            else setErro(r.motivo);
          } catch {
            setErro("Não consegui falar com o servidor. Confira a internet e tente de novo.");
          } finally {
            setEsperando(false);
          }
        }}
        className="flex min-h-[50px] w-full items-center justify-center rounded-folha bg-tinta px-4 text-[17px] font-medium text-papel disabled:opacity-60"
      >
        {esperando ? "Criando…" : "Criar meu acesso"}
      </button>
    </div>
  );
}
