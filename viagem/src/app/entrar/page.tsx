import Link from "next/link";
import { redirect } from "next/navigation";
import { pessoaAtual } from "@/lib/auth";
import { Porta } from "@/componentes/porta";
import { FormularioDeEntrada } from "./formulario";

export default async function Entrar({ searchParams }: { searchParams: Promise<{ volta?: string }> }) {
  const { volta = "/" } = await searchParams;
  if (await pessoaAtual()) redirect(volta.startsWith("/") && !volta.startsWith("//") ? volta : "/");
  return (
    <Porta titulo="Viagem" subtitulo="Lugares, roteiro e contas do grupo.">
      <FormularioDeEntrada volta={volta} />
      <p className="mt-5 text-center text-[14px] text-fosco">
        Chegou por um convite? Abra o link que mandaram no grupo.
        <br />
        Vai organizar a viagem? <Link href="/criar-conta" className="font-semibold text-realce">Crie sua conta</Link>.
      </p>
    </Porta>
  );
}
