import { Suspense } from "react";
import { codigoDeAcessoLigado } from "@/lib/auth";
import { FormularioLogin } from "./formulario";

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; de?: string }>;
}) {
  const { erro, de } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <div className="mb-7">
        <p className="text-xs uppercase tracking-widest text-suave">Chazit Hanoar</p>
        <h1 className="mt-1 text-2xl font-semibold">Precificação de machanot</h1>
        <p className="mt-2 text-sm text-suave">
          Orçamento, rateio por pessoa-dia e grade de preços das machanot de kaitz e choref.
        </p>
      </div>
      <Suspense>
        <FormularioLogin erroDeEntrada={erro} de={de} comCodigo={codigoDeAcessoLigado()} />
      </Suspense>
      <p className="mt-8 text-xs leading-relaxed text-suave">
        A plataforma trabalha com quantidades, não com crianças identificadas: não há cadastro
        nominal de chanichim, nem CPF ou RG de ninguém.
      </p>
    </main>
  );
}
