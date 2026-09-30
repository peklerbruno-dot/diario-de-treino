import { notFound } from "next/navigation";
import { bd } from "@/lib/bd";
import { exigirMembro } from "@/lib/auth";
import { Cabecalho, Pagina } from "@/componentes/pecas";
import { apagarPasta, editarPasta } from "@/acoes/lugares";

export default async function EditarPasta({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ id?: string }> }) {
  const { id } = await params;
  const { id: pastaId = "" } = await searchParams;
  await exigirMembro(id);
  const pasta = await bd.pasta.findFirst({ where: { id: pastaId, viagemId: id } });
  if (!pasta) notFound();
  return (
    <Pagina abas>
      <Cabecalho titulo="Pasta" voltar={`/v/${id}/lugares?pasta=${pasta.id}`} />
      <form action={editarPasta} className="cartao space-y-4 p-5">
        <input type="hidden" name="viagemId" value={id} />
        <input type="hidden" name="pastaId" value={pasta.id} />
        <div className="flex gap-2">
          <input name="emoji" className="campo w-16 text-center" defaultValue={pasta.emoji} aria-label="Emoji" />
          <input name="nome" required className="campo flex-1" defaultValue={pasta.nome} aria-label="Nome" />
        </div>
        <button className="botao w-full">Salvar</button>
      </form>
      <form action={apagarPasta} className="mt-6">
        <input type="hidden" name="viagemId" value={id} />
        <input type="hidden" name="pastaId" value={pasta.id} />
        <button className="text-[15px] text-vermelho">Apagar a pasta (os lugares ficam, sem pasta)</button>
      </form>
    </Pagina>
  );
}
