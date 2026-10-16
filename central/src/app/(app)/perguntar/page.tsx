import { Suspense } from "react";
import { CampoDePergunta } from "@/componentes/campo-de-pergunta";
import { perguntar } from "@/lib/perguntar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function Perguntar({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const pergunta = (q ?? "").trim().slice(0, 300);
  return (
    <div className="mx-auto max-w-[680px]">
      <h1 className="mb-6 text-[28px] font-semibold tracking-tight">Pergunte à Central</h1>
      <CampoDePergunta inicial={pergunta} />
      {pergunta ? (
        <Suspense key={pergunta} fallback={<p className="mt-8 text-[15px] text-fosco">Procurando nos seus e-mails…</p>}>
          <Resultado pergunta={pergunta} />
        </Suspense>
      ) : (
        <p className="mt-6 text-[15px] text-fosco">
          Pergunte em português sobre qualquer coisa nos seus e-mails. Ex.: “o que a Nancy disse sobre a banca?”, “quando é a
          exibição do filme do Freud?”, “quanto custou a passagem do Sorj?”.
        </p>
      )}
    </div>
  );
}

async function Resultado({ pergunta }: { pergunta: string }) {
  try {
    const r = await perguntar(pergunta);
    return (
      <div className="mt-8">
        <p className="whitespace-pre-wrap text-[16px] leading-relaxed">{r.texto}</p>
        {r.fontes.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-2 text-[13px] font-semibold text-fosco">Fontes</h2>
            <ol>
              {r.fontes.map((f) => (
                <li key={f.n}>
                  <a href={f.link} target="_blank" rel="noreferrer" className="-mx-3 flex items-center gap-3 rounded-lg px-3 py-1.5 hover:bg-realce">
                    <span className="numeros w-6 shrink-0 text-[13px] text-fosco">[{f.n}]</span>
                    <span className="min-w-0 flex-1 truncate text-[15px]">{f.assunto}</span>
                    <span className="shrink-0 text-[13px] text-fosco">{f.conta}</span>
                  </a>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[13px] text-fosco">Busca usada: {r.busca}</p>
          </div>
        )}
      </div>
    );
  } catch (e) {
    return <p className="mt-8 text-[15px] text-fosco">Não deu para responder agora: {(e as Error).message}</p>;
  }
}
