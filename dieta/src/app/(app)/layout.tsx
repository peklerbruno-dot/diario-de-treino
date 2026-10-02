import { Casca } from "@/componentes/casca";
import { exigirSessao } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LayoutDoApp({ children }: { children: React.ReactNode }) {
  await exigirSessao();
  return <Casca>{children}</Casca>;
}
