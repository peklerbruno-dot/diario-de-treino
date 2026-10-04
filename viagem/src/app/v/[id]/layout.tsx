import { exigirMembro } from "@/lib/auth";
import { importacoesPendentes } from "@/lib/consultas";
import { Abas } from "@/componentes/abas";
import { Fila } from "@/componentes/fila";

export default async function LayoutDaViagem({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirMembro(id);
  const pendentes = await importacoesPendentes(id);
  return (
    <>
      <Fila viagemId={id} />
      {children}
      <Abas viagemId={id} pendentes={pendentes} />
    </>
  );
}
