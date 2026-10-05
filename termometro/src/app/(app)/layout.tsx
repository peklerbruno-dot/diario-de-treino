import { Casca } from "@/componentes/casca";
import { exigirSessao } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LayoutDoApp({ children }: { children: React.ReactNode }) {
  const quem = await exigirSessao();
  return (
    <Casca usuario={{ id: quem.usuarioId, nome: quem.nome, ehDono: quem.ehDono }}>{children}</Casca>
  );
}
