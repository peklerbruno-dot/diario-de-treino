import Link from "next/link";
import { redirect } from "next/navigation";
import { bd } from "@/lib/bd";
import { pessoaAtual } from "@/lib/auth";
import { periodo } from "@/lib/datas";
import { Porta } from "@/componentes/porta";
import { FormularioDeConvite } from "./formulario";

export default async function Convite({ params }: { params: Promise<{ chave: string }> }) {
  const { chave } = await params;
  const viagem = await bd.viagem.findUnique({
    where: { convite: chave },
    include: { membros: { where: { saiuEm: null }, orderBy: { criadoEm: "asc" } } },
  });
  if (!viagem) {
    return (
      <Porta titulo="Convite vencido" subtitulo="Esse link não vale mais. Peça um novo a quem organiza a viagem.">
        <Link href="/entrar" className="botao w-full">Entrar</Link>
      </Porta>
    );
  }

  const pessoa = await pessoaAtual();
  if (pessoa && viagem.membros.some((m) => m.pessoaId === pessoa.id)) redirect(`/v/${viagem.id}`);

  const livres = viagem.membros.filter((m) => !m.pessoaId).map((m) => ({ id: m.id, nome: m.nome }));
  const quem = viagem.membros.map((m) => m.nome.split(" ")[0]).slice(0, 6).join(", ");

  return (
    <Porta
      titulo={viagem.nome}
      subtitulo={
        <>
          {periodo(viagem.inicio, viagem.fim)}
          {quem && <><br />Já estão: {quem}{viagem.membros.length > 6 ? "…" : ""}</>}
        </>
      }
    >
      <FormularioDeConvite convite={chave} livres={livres} logado={pessoa ? pessoa.nome : null} />
      {!pessoa && (
        <p className="mt-5 text-center text-[14px] text-fosco">
          Já tem conta?{" "}
          <Link href={`/entrar?volta=${encodeURIComponent(`/convite/${chave}`)}`} className="font-semibold text-realce">Entre primeiro</Link>
          {" "}e volte a este link.
        </p>
      )}
    </Porta>
  );
}
