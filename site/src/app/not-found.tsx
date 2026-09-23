import Link from "next/link";
import { Simbolo } from "@/componentes/Logo";

export default function NaoEncontrado() {
  return (
    <div className="mx-auto max-w-md px-4 pt-20 text-center">
      <Simbolo className="mx-auto h-20 w-auto" />
      <h1 className="mt-6 font-titulo text-3xl font-black uppercase text-marinho">Página não encontrada</h1>
      <p className="mt-2 font-corpo text-slate-600">Esse endereço não existe mais, ou nunca existiu.</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-marinho px-6 py-3 font-titulo font-bold text-white hover:bg-azul">
        Voltar para o início
      </Link>
    </div>
  );
}
