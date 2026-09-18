import { notFound } from "next/navigation";
import { reuniao as buscarReuniao } from "@/lib/consultas";
import { Topo } from "@/componentes/pecas";
import { FormularioDeReuniao } from "../../formulario";

export const dynamic = "force-dynamic";

export default async function EditarReuniao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await buscarReuniao(id);
  if (!r) notFound();

  return (
    <>
      <Topo titulo="Editar reunião" chamada={r.titulo} />
      <FormularioDeReuniao reuniao={r} />
    </>
  );
}
