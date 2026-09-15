import { redirect } from "next/navigation";
import { codigoConfigurado, temSessao } from "@/lib/auth";
import { FormularioDeEntrada } from "./formulario";

export const dynamic = "force-dynamic";

export default async function Entrar() {
  // Quem já tem sessão válida não vê esta tela. A conferência é aqui, e não no
  // middleware: lá só se sabe que existe um cookie, não se ele presta.
  if (await temSessao()) redirect("/");

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-[28px] font-semibold tracking-tight">Termômetro</h1>
      <p className="mt-2 text-[17px] leading-relaxed text-grafite">
        Entradas, saídas e o saldo de cada dia. Digite o código de acesso — este aparelho vai
        lembrar por seis meses.
      </p>

      <FormularioDeEntrada />

      {!codigoConfigurado() && (
        <p className="mt-6 rounded-folha border border-atencao/40 p-4 text-[15px] leading-relaxed text-grafite">
          Esta instalação ainda não tem código. Cadastre <code>CODIGO_DE_ACESSO</code> nas variáveis
          de ambiente da Vercel e publique de novo.
        </p>
      )}
    </main>
  );
}
