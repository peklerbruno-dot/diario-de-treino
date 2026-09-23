import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessao } from "@/lib/auth";
import { Simbolo } from "@/componentes/Logo";
import { FormularioEntrada } from "./formulario";

export const metadata: Metadata = { title: "Área da equipe", robots: { index: false } };

export default async function Entrar() {
  if (await sessao()) redirect("/painel");
  return (
    <div className="mx-auto grid max-w-md px-4 pt-14">
      <Simbolo className="mx-auto h-16 w-auto" />
      <h1 className="mt-6 text-center font-titulo text-3xl font-black uppercase tracking-tight text-marinho">Área da equipe</h1>
      <p className="mt-2 text-center font-corpo text-slate-600">
        Entre para editar textos, fotos, agenda e notícias direto no site.
      </p>
      <div className="mt-8 rounded-3xl bg-white p-6 shadow-xl ring-2 ring-marinho/10">
        <FormularioEntrada />
      </div>
      <p className="mt-5 text-center font-corpo text-sm text-slate-500">
        O navegador lembra de você por quatro meses. Em computador compartilhado, lembre de sair.
      </p>
    </div>
  );
}
