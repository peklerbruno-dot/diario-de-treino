import Link from "next/link";
import { redirect } from "next/navigation";
import { pessoaAtual, sistemaVazio } from "@/lib/auth";
import { FormularioDeEntrada } from "./formulario";
import { MolduraDeFora } from "@/componentes/moldura";

export const dynamic = "force-dynamic";

export default async function Entrar() {
  // A conferência é aqui, e não no middleware: lá só se sabe que existe um
  // cookie, não se ele presta.
  if (await pessoaAtual()) redirect("/");

  if (await sistemaVazio()) {
    return (
      <MolduraDeFora
        titulo="Ainda não há ninguém aqui"
        chamada="O sistema acabou de subir. A primeira conta é a da coordenação, e é ela que cadastra o resto da equipe."
      >
        <Link
          href="/fundar"
          className="mt-7 inline-flex min-h-[46px] w-full items-center justify-center rounded-folha bg-heroi px-4 text-[16px] font-semibold text-heroi-tinta"
        >
          Criar a primeira conta
        </Link>
      </MolduraDeFora>
    );
  }

  return (
    <MolduraDeFora
      titulo="Entrar"
      chamada="O sistema de atividades, reuniões e encaminhamentos da equipe."
      rodape={
        <>
          Esqueceu a senha? Peça a alguém da coordenação um link novo de primeiro acesso — leva
          um minuto e não precisa de ninguém de fora.
        </>
      }
    >
      <FormularioDeEntrada />
    </MolduraDeFora>
  );
}
