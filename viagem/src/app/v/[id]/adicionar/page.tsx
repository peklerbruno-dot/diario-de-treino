export const maxDuration = 60;

import Link from "next/link";
import { exigirMembro } from "@/lib/auth";
import { temGemini } from "@/lib/leitor";
import { Cabecalho, Pagina } from "@/componentes/pecas";
import { Adicionar } from "@/componentes/adicionar";

export default async function PaginaAdicionar({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ texto?: string; pasta?: string }> }) {
  const { id } = await params;
  const { texto = "", pasta } = await searchParams;
  await exigirMembro(id);
  return (
    <Pagina abas>
      <Cabecalho titulo="Adicionar" voltar={`/v/${id}/lugares`} subtitulo="O app lê o post e sugere os lugares. Você confirma quais entram." />
      <div className="cartao p-5">
        <Adicionar viagemId={id} textoInicial={texto} temLeitura={temGemini()} />
      </div>
      <div className="mt-5 space-y-2 text-[15px]">
        <Link href={`/v/${id}/lugares/novo${pasta ? `?pasta=${pasta}` : ""}`} className="block text-realce">Preencher um lugar à mão →</Link>
        <Link href={`/v/${id}/grupo#atalho`} className="block text-realce">Mandar direto do Instagram, sem copiar link (atalho do iPhone) →</Link>
      </div>
    </Pagina>
  );
}
