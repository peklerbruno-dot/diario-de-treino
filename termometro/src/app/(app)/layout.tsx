import { Casca } from "@/componentes/casca";
import { exigirSessao } from "@/lib/auth";
import { bd } from "@/lib/bd";

export const dynamic = "force-dynamic";

export default async function LayoutDoApp({ children }: { children: React.ReactNode }) {
  const quem = await exigirSessao();
  const pessoa = await bd.usuario.findUnique({
    where: { id: quem.usuarioId },
    select: { nome: true },
  });
  return (
    <Casca usuario={{ id: quem.usuarioId, nome: pessoa?.nome ?? "BP", ehDono: quem.ehDono }}>
      {children}
    </Casca>
  );
}
