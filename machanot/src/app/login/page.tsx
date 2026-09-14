import { Suspense } from "react";
import { redirect } from "next/navigation";
import { temSessao } from "@/lib/auth";
import { FormularioLogin } from "./formulario";

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ de?: string }>;
}) {
  const { de } = await searchParams;
  if (await temSessao()) redirect("/");
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
        <FormularioLogin de={de} />
      </Suspense>
      <p className="mt-8 text-xs leading-relaxed text-suave">
        A plataforma trabalha com quantidades, não com pessoas identificadas: não há cadastro de
        chanichim nem de madrichim, e nenhum documento de ninguém.
      </p>
    </main>
  );
}
