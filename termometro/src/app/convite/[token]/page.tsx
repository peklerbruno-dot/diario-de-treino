import type { Metadata } from "next";
import { Marca } from "@/componentes/marca";
import { conviteValendo } from "@/lib/pessoas";
import { AceitarConvite } from "./aceitar";

export const dynamic = "force-dynamic";

// A prévia do WhatsApp lê estas linhas; o nome de quem foi convidado não entra
// nelas, para o link não sair contando nada a quem só o vê passar.
export const metadata: Metadata = {
  title: "Convite — Finanças do BP",
  description: "Um convite para usar o Finanças do BP, com as suas próprias contas.",
  robots: { index: false, follow: false },
};

export default async function Convite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const convite = await conviteValendo(token);

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-md flex-col justify-center px-6 py-10">
      <Marca tamanho="grande" />
      <AceitarConvite token={token} nome={convite?.nome ?? null} />
    </main>
  );
}
