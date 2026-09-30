import { notFound } from "next/navigation";
import { bd } from "@/lib/bd";
import { exigirMembro } from "@/lib/auth";
import { Cabecalho, Pagina } from "@/componentes/pecas";
import { FormularioDeLugar } from "@/componentes/formulario-lugar";

export default async function EditarLugar({ params }: { params: Promise<{ id: string; lugarId: string }> }) {
  const { id, lugarId } = await params;
  await exigirMembro(id);
  const [lugar, pastas] = await Promise.all([
    bd.lugar.findFirst({ where: { id: lugarId, viagemId: id, apagadoEm: null } }),
    bd.pasta.findMany({ where: { viagemId: id }, orderBy: { criadoEm: "asc" } }),
  ]);
  if (!lugar) notFound();
  return (
    <Pagina abas>
      <Cabecalho titulo="Editar lugar" voltar={`/v/${id}/lugares/${lugarId}`} />
      <div className="cartao p-5">
        <FormularioDeLugar viagemId={id} pastas={pastas} lugar={lugar} />
      </div>
    </Pagina>
  );
}
