import { redirect } from "next/navigation";
import { temSessao } from "@/lib/auth";
import { Formulario } from "./formulario";

export default async function Entrar() {
  if (await temSessao()) redirect("/");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="font-titulo text-4xl">Central</h1>
      <p className="mt-2 text-grafite">E-mail, agenda e o que precisa de você.</p>
      <Formulario />
    </main>
  );
}
