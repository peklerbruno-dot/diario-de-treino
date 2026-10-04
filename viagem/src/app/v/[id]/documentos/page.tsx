import { bd } from "@/lib/bd";
import { exigirMembro } from "@/lib/auth";
import { temGemini } from "@/lib/leitor";
import { primeiroNome } from "@/lib/cores";
import { Cabecalho, Pagina, Secao, Vazio } from "@/componentes/pecas";
import { EnviarDocumento } from "@/componentes/enviar-documento";
import { apagarDocumento, editarDocumento } from "@/acoes/documentos";

export const maxDuration = 60;

const TIPOS: Record<string, { nome: string; emoji: string }> = {
  voo: { nome: "Voos", emoji: "✈️" },
  hospedagem: { nome: "Hospedagem", emoji: "🏨" },
  passeio: { nome: "Passeios e ingressos", emoji: "🎟️" },
  transporte: { nome: "Transporte", emoji: "🚌" },
  seguro: { nome: "Seguro", emoji: "🛡️" },
  outro: { nome: "Outros", emoji: "📄" },
};

const tamanho = (b: number) => (b > 1_000_000 ? `${(b / 1_000_000).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1000))} KB`);

export default async function Documentos({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirMembro(id);
  const [docs, membros, leitura] = await Promise.all([
    bd.documento.findMany({
      where: { viagemId: id, apagadoEm: null },
      select: { id: true, titulo: true, tipo: true, notas: true, mime: true, tamanho: true, enviadoPorId: true, criadoEm: true },
      orderBy: { criadoEm: "desc" },
    }),
    bd.membro.findMany({ where: { viagemId: id }, select: { id: true, nome: true } }),
    temGemini(),
  ]);
  const quem = (mid: string | null) => primeiroNome(membros.find((m) => m.id === mid)?.nome ?? "");

  return (
    <Pagina abas>
      <Cabecalho titulo="Documentos" voltar={`/v/${id}`} subtitulo="Passagens, reservas, ingressos e seguro — de todo mundo, num lugar só." />

      <div className="cartao p-4">
        <EnviarDocumento viagemId={id} temLeitura={leitura} />
      </div>
      <p className="mt-2 text-[13px] text-fosco">
        Só quem é da viagem abre. Os documentos que você já abriu ficam no celular e abrem sem internet — bom para o cartão de embarque.
        Evite guardar passaporte ou cartão de crédito aqui.
      </p>

      {docs.length === 0 ? (
        <div className="mt-6">
          <Vazio titulo="Nenhum documento ainda">Mande o PDF da passagem: eu leio e ponho o voo no roteiro.</Vazio>
        </div>
      ) : (
        Object.entries(TIPOS)
          .filter(([t]) => docs.some((d) => d.tipo === t))
          .map(([t, info]) => (
            <Secao key={t} titulo={`${info.emoji} ${info.nome}`}>
              <ul className="cartao divide-y divide-linha">
                {docs
                  .filter((d) => d.tipo === t)
                  .map((d) => (
                    <li key={d.id} className="px-4 py-3">
                      <a href={`/api/v/${id}/documentos/${d.id}`} target="_blank" rel="noreferrer" className="block">
                        <span className="block font-medium text-realce">{d.titulo}</span>
                        {d.notas && <span className="mt-0.5 block whitespace-pre-line text-[14px] text-grafite">{d.notas}</span>}
                        <span className="mt-0.5 block text-[12px] text-fosco">
                          {d.mime === "application/pdf" ? "PDF" : "Imagem"} · {tamanho(d.tamanho)}
                          {d.enviadoPorId && ` · ${quem(d.enviadoPorId)}`}
                        </span>
                      </a>
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[13px] text-fosco">Editar</summary>
                        <form action={editarDocumento} className="mt-2 space-y-2">
                          <input type="hidden" name="viagemId" value={id} />
                          <input type="hidden" name="documentoId" value={d.id} />
                          <input name="titulo" defaultValue={d.titulo} className="campo py-2" aria-label="Título" />
                          <select name="tipo" defaultValue={d.tipo} className="campo py-2" aria-label="Tipo">
                            {Object.entries(TIPOS).map(([v, i]) => <option key={v} value={v}>{i.emoji} {i.nome}</option>)}
                          </select>
                          <textarea name="notas" defaultValue={d.notas} rows={2} className="campo py-2" aria-label="Notas" placeholder="Localizador, endereço…" />
                          <button className="botao-leve w-full">Salvar</button>
                        </form>
                        <form action={apagarDocumento} className="mt-2">
                          <input type="hidden" name="viagemId" value={id} />
                          <input type="hidden" name="documentoId" value={d.id} />
                          <button className="text-[13px] text-vermelho">Apagar documento</button>
                        </form>
                      </details>
                    </li>
                  ))}
              </ul>
            </Secao>
          ))
      )}
    </Pagina>
  );
}
