import { notFound } from "next/navigation";
import { atividade as buscarAtividade, equipeAtiva } from "@/lib/consultas";
import { Topo } from "@/componentes/pecas";
import { FormularioDeAtividade } from "../../formulario";

export const dynamic = "force-dynamic";

export default async function EditarAtividade({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [a, equipe] = await Promise.all([buscarAtividade(id), equipeAtiva()]);
  if (!a) notFound();

  return (
    <>
      <Topo titulo="Editar atividade" chamada={a.titulo} />
      <FormularioDeAtividade equipe={equipe} atividade={a} />
    </>
  );
}
