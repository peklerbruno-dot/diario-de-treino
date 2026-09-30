import { bd } from "@/lib/bd";
import { exigirMembro } from "@/lib/auth";
import { Cabecalho, Pagina } from "@/componentes/pecas";
import { FormularioDeLugar } from "@/componentes/formulario-lugar";

export default async function NovoLugar({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pasta?: string }> }) {
  const { id } = await params;
  const { pasta } = await searchParams;
  await exigirMembro(id);
  const pastas = await bd.pasta.findMany({ where: { viagemId: id }, orderBy: { criadoEm: "asc" } });
  return (
    <Pagina abas>
      <Cabecalho titulo="Novo lugar" voltar={`/v/${id}/adicionar`} subtitulo="Preenchendo à mão." />
      <div className="cartao p-5">
        <FormularioDeLugar viagemId={id} pastas={pastas} pastaInicial={pasta} />
      </div>
    </Pagina>
  );
}
