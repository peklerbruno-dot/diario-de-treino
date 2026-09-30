import Link from "next/link";
import { notFound } from "next/navigation";
import { bd } from "@/lib/bd";
import { exigirMembro } from "@/lib/auth";
import { CATEGORIAS } from "@/lib/lugares";
import type { Sugestao } from "@/lib/leitor";
import { Aviso, Cabecalho, Pagina } from "@/componentes/pecas";
import { BotaoEnviar } from "@/componentes/formulario";
import { confirmarImportacao, descartarImportacao } from "@/acoes/lugares";
import { EscolhaDePasta } from "@/componentes/escolha-pasta";

const chave = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

export default async function Revisao({ params, searchParams }: { params: Promise<{ id: string; importacaoId: string }>; searchParams: Promise<{ pasta?: string }> }) {
  const { id, importacaoId } = await params;
  const { pasta } = await searchParams;
  await exigirMembro(id);
  const imp = await bd.importacao.findFirst({ where: { id: importacaoId, viagemId: id } });
  if (!imp) notFound();
  const [pastas, existentes] = await Promise.all([
    bd.pasta.findMany({ where: { viagemId: id }, orderBy: { criadoEm: "asc" } }),
    bd.lugar.findMany({ where: { viagemId: id, apagadoEm: null }, select: { nome: true } }),
  ]);
  const jaTem = new Set(existentes.map((l) => chave(l.nome)));
  const sugestoes = (imp.sugestoes as unknown as Sugestao[]) ?? [];
  const link = imp.entrada.startsWith("http") ? imp.entrada : null;

  // Sugere a pasta pela cidade mais comum entre as sugestões.
  const cidades = sugestoes.map((s) => chave(s.cidade)).filter(Boolean);
  const pastaPelaCidade = pastas.find((p) => cidades.some((c) => chave(p.nome).includes(c) || c.includes(chave(p.nome))));

  return (
    <Pagina abas>
      <Cabecalho titulo="Revisar" voltar={`/v/${id}/caixa`} subtitulo={imp.observacao || undefined} />
      {link && (
        <a href={link} target="_blank" rel="noreferrer" className="mb-4 block break-all text-[14px] text-realce">
          {link.replace(/^https?:\/\/(www\.)?/, "").slice(0, 70)}
        </a>
      )}

      {imp.estado === "falhou" && (
        <div className="space-y-3">
          <Aviso tom="erro">{imp.observacao}</Aviso>
          <Link href={`/v/${id}/adicionar${link ? `?texto=${encodeURIComponent(link)}` : ""}`} className="botao w-full">Tentar de novo</Link>
        </div>
      )}

      {imp.estado === "revisada" && <Aviso tom="ok">Já revisado. Os lugares escolhidos estão na lista.</Aviso>}

      {imp.estado === "pronta" && sugestoes.length === 0 && (
        <Aviso tom="atencao">Não achei nenhum lugar nesse post. {imp.observacao}</Aviso>
      )}

      {imp.estado === "pronta" && sugestoes.length > 0 && (
        <form action={confirmarImportacao} className="space-y-3">
          <input type="hidden" name="viagemId" value={id} />
          <input type="hidden" name="importacaoId" value={imp.id} />
          <p className="text-[15px] text-grafite">Desmarque o que não interessa. Dá para corrigir nome, cidade e tipo aqui.</p>
          {sugestoes.map((s, i) => {
            const repetido = jaTem.has(chave(s.nome));
            return (
              <div key={i} className="cartao p-3.5">
                <label className="flex items-start gap-3">
                  <input type="checkbox" name={`usar_${i}`} value="sim" defaultChecked={!repetido} className="mt-2.5 h-5 w-5 shrink-0 accent-[var(--realce)]" />
                  <span className="min-w-0 flex-1 space-y-2">
                    <input name={`nome_${i}`} defaultValue={s.nome} className="campo py-2 font-semibold" aria-label="Nome" />
                    <span className="grid grid-cols-2 gap-2">
                      <input name={`cidade_${i}`} defaultValue={s.cidade} className="campo py-2 text-[15px]" placeholder="Cidade" aria-label="Cidade" />
                      <select name={`categoria_${i}`} defaultValue={s.categoria} className="campo py-2 text-[15px]" aria-label="Tipo">
                        {CATEGORIAS.map((c) => <option key={c.valor} value={c.valor}>{c.emoji} {c.nome}</option>)}
                      </select>
                    </span>
                  </span>
                </label>
                <div className="mt-2 pl-8 text-[14px] text-fosco">
                  {s.descricao && <p className="text-grafite">{s.descricao}</p>}
                  {s.dicas && <p className="mt-1">💡 {s.dicas}</p>}
                  <p className="mt-1">
                    {s.lat != null ? "📍 Achei no mapa" : "Sem ponto no mapa — o “Como chegar” procura pelo nome"}
                    {repetido && <span className="ml-2 font-semibold text-ambar">· já está na lista</span>}
                  </p>
                </div>
              </div>
            );
          })}
          <div className="cartao p-4">
            <EscolhaDePasta pastas={pastas.map((p) => ({ id: p.id, nome: `${p.emoji} ${p.nome}` }))} inicial={pasta ?? pastaPelaCidade?.id ?? ""} />
          </div>
          <BotaoEnviar>Salvar os marcados</BotaoEnviar>
        </form>
      )}

      {imp.estado !== "revisada" && (
        <form action={descartarImportacao} className="mt-5 text-center">
          <input type="hidden" name="viagemId" value={id} />
          <input type="hidden" name="importacaoId" value={imp.id} />
          <button className="text-[15px] text-fosco">Descartar</button>
        </form>
      )}
      <p className="mt-2 text-center text-[13px] text-fosco">A leitura é automática e pode errar — confira antes de salvar.</p>
    </Pagina>
  );
}
