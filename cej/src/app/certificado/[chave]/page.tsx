import { notFound } from "next/navigation";
import { bd } from "@/lib/bd";
import { porExtenso } from "@/lib/datas";
import { NOME_DO_TIPO } from "@/lib/tipos";
import { Imprimir } from "./imprimir";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

/**
 * O certificado de participação.
 *
 * Uma página feita para ser impressa — ou salva em PDF pelo próprio diálogo de
 * impressão, que é o que todo computador e todo celular já sabem fazer, melhor
 * do que qualquer biblioteca que eu carregasse aqui.
 *
 * O endereço é secreto e permanente, e isso lhe dá uma segunda função: quem
 * receber o PDF pode abrir o link e ver que ele saiu daqui. É uma conferência
 * que um arquivo solto não oferece.
 */
export default async function Certificado({ params }: { params: Promise<{ chave: string }> }) {
  const { chave } = await params;

  const p = await bd.participacao.findUnique({
    where: { chaveDoCertificado: chave },
    include: {
      contato: { select: { nome: true } },
      atividade: {
        include: { responsavel: { select: { nome: true } } },
      },
    },
  });

  if (!p || !p.compareceu || p.atividade.apagadaEm) notFound();

  const a = p.atividade;
  const periodo = a.diaFinal
    ? `de ${porExtenso(a.dia)} a ${porExtenso(a.diaFinal)}`
    : `em ${porExtenso(a.dia)}`;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Imprimir />

      <article className="folha-do-certificado rounded-cartao bg-cartao px-10 py-14 text-center shadow-cartao">
        <p className="sobrescrito">Universidade de São Paulo</p>
        <p className="mt-1.5 font-titulo text-[19px] font-semibold tracking-tight">
          Centro de Estudos Judaicos
        </p>

        <h1 className="mt-10 font-titulo text-[30px] font-semibold tracking-tight">
          Certificado de participação
        </h1>

        <p className="mx-auto mt-8 max-w-[52ch] text-[17px] leading-loose">
          Certificamos que <b>{p.contato.nome}</b> participou {a.tipo === "CURSO" ? "do" : "da"}{" "}
          {NOME_DO_TIPO[a.tipo].toLocaleLowerCase("pt-BR")}{" "}
          <b>{a.titulo}</b>, realizad{a.tipo === "CURSO" ? "o" : "a"} pelo Centro de Estudos
          Judaicos da Universidade de São Paulo {periodo}
          {a.local ? `, ${a.local}` : ""}.
        </p>

        <div className="mt-14 inline-block border-t border-tinta px-10 pt-2 text-[14.5px]">
          {a.responsavel?.nome ?? "Coordenação"}
          <span className="block text-[12.5px] text-fosco">Centro de Estudos Judaicos — USP</span>
        </div>

        <p className="mt-12 text-[11.5px] leading-relaxed text-fosco">
          A autenticidade deste certificado pode ser conferida no endereço em que esta página está
          publicada.
        </p>
      </article>
    </main>
  );
}
