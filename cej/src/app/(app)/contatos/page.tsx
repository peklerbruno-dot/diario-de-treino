import Link from "next/link";
import { buscarContatos, contagemDaBase, etiquetas as buscarEtiquetas, quantosContatos } from "@/lib/consultas-contatos";
import { NOME_DO_ESTADO_DO_CONTATO, NOME_DO_VINCULO, VINCULOS, type EstadoDoContato, type VinculoDoContato } from "@/lib/contatos";
import { BotaoLink, Cartao, Selo, Sobrescrito, Topo, Vazio } from "@/componentes/pecas";

export const dynamic = "force-dynamic";

/**
 * A base de contatos.
 *
 * O número que a tela põe em primeiro lugar não é quantos contatos existem, e
 * sim **quantos podem receber boletim** — porque é esse que decide o alcance de
 * verdade, e é sempre menor do que se imagina. Uma base de mil pessoas sem
 * consentimento registrado tem alcance zero, e é melhor saber disso antes de
 * escrever o boletim do que depois.
 */
export default async function Contatos({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; vinculo?: string; etiquetaId?: string; estado?: string }>;
}) {
  const filtro = await searchParams;
  const [lista, marcas, contagem, quantos] = await Promise.all([
    buscarContatos(filtro),
    buscarEtiquetas(),
    contagemDaBase(),
    quantosContatos(filtro),
  ]);

  const filtrando = Boolean(filtro.busca || filtro.vinculo || filtro.etiquetaId || filtro.estado);
  const parametros = new URLSearchParams(
    Object.entries(filtro).filter(([, v]) => v) as [string, string][],
  ).toString();

  return (
    <>
      <Topo
        titulo="Contatos"
        chamada="Para quem o Centro faz o que faz: quem assiste, quem se inscreve, quem acompanha. É desta base que o boletim sai."
        acao={
          <>
            <BotaoLink href="/contatos/importar">Importar planilha</BotaoLink>
            <BotaoLink href="/contatos/novo" tipo="primario">Novo contato</BotaoLink>
          </>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Numero rotulo="Podem receber boletim" valor={contagem.comConsentimento} destaque />
        <Numero rotulo="Contatos na base" valor={contagem.total} />
        <Numero
          rotulo="Sem consentimento"
          valor={contagem.ativos - contagem.comConsentimento}
          detalhe="ficam de fora dos envios"
        />
        <Numero rotulo="Saíram da lista" valor={contagem.descadastrados} />
      </div>

      <form className="nao-imprime mb-5 flex flex-wrap items-end gap-2.5">
        <label className="min-w-[180px] flex-1">
          <span className="sobrescrito">Procurar</span>
          <input
            name="busca"
            defaultValue={filtro.busca ?? ""}
            placeholder="nome, e-mail ou instituição"
            className="mt-1 w-full rounded-folha border border-regua bg-cartao px-3 py-2 outline-none focus:border-realce"
          />
        </label>
        <Filtro nome="vinculo" rotulo="Vínculo" valor={filtro.vinculo} vazio="Todos"
          opcoes={VINCULOS.map((v) => ({ valor: v, rotulo: NOME_DO_VINCULO[v] }))} />
        <Filtro nome="etiquetaId" rotulo="Etiqueta" valor={filtro.etiquetaId} vazio="Todas"
          opcoes={marcas.map((e) => ({ valor: e.id, rotulo: `${e.nome} (${e._count.contatos})` }))} />
        <Filtro nome="estado" rotulo="Situação" valor={filtro.estado} vazio="Todas"
          opcoes={(["ATIVO", "DESCADASTRADO", "INVALIDO"] as EstadoDoContato[]).map((e) => ({
            valor: e, rotulo: NOME_DO_ESTADO_DO_CONTATO[e],
          }))} />
        <button type="submit" className="min-h-[40px] rounded-folha bg-cartao px-4 text-[15px] shadow-baixa hover:bg-linha">
          Filtrar
        </button>
        {filtrando && (
          <Link href="/contatos" className="pb-2.5 text-[14px] text-realce hover:underline">limpar</Link>
        )}
      </form>

      {lista.length === 0 ? (
        <Vazio acao={<BotaoLink href="/contatos/importar" tipo="primario">Importar a planilha que vocês já têm</BotaoLink>}>
          {filtrando ? "Nenhum contato com esses filtros." : "A base ainda está vazia."}
        </Vazio>
      ) : (
        <Cartao como="section">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-linha px-4 py-2.5">
            <h2 className="sobrescrito">
              {quantos} {quantos === 1 ? "contato" : "contatos"}
              {lista.length < quantos && ` · mostrando os ${lista.length} primeiros`}
            </h2>
            <a href={`/api/contatos?${parametros}`} className="text-[13px] text-realce hover:underline">
              baixar esta lista em planilha
            </a>
          </div>
          <ul>
            {lista.map((c) => (
              <li key={c.id} className="border-b border-linha last:border-b-0">
                <Link href={`/contatos/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-linha/60">
                  <span className="min-w-[200px] flex-1">
                    <span className="block text-[15px] font-medium">{c.nome}</span>
                    <span className="block text-[13px] text-fosco">
                      {c.email}
                      {c.instituicao ? ` · ${c.instituicao}` : ""}
                    </span>
                  </span>

                  <span className="flex flex-wrap items-center gap-1.5">
                    {c.etiquetas.slice(0, 3).map((e) => (
                      <Selo key={e.etiquetaId} cor="var(--fosco)">{e.etiqueta.nome}</Selo>
                    ))}
                    {c.etiquetas.length > 3 && (
                      <span className="text-[12px] text-fosco">+{c.etiquetas.length - 3}</span>
                    )}
                  </span>

                  <span className="w-[150px] text-right text-[12.5px] text-fosco">
                    {NOME_DO_VINCULO[c.vinculo as VinculoDoContato]}
                  </span>

                  <span className="w-[120px] text-right">
                    {c.estado !== "ATIVO" ? (
                      <Selo cor="var(--tinta-vermelha)">
                        {NOME_DO_ESTADO_DO_CONTATO[c.estado as EstadoDoContato]}
                      </Selo>
                    ) : c.consentimentoEm ? (
                      <Selo cor="var(--tinta-verde)">recebe</Selo>
                    ) : (
                      <Selo cor="var(--tinta-ambar)">sem consentimento</Selo>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </>
  );
}

function Numero({
  rotulo, valor, detalhe, destaque,
}: { rotulo: string; valor: number; detalhe?: string; destaque?: boolean }) {
  return (
    <Cartao className={`p-4 ${destaque ? "ring-2 ring-realce/30" : ""}`}>
      <Sobrescrito>{rotulo}</Sobrescrito>
      <p className="tabular mt-1 font-titulo text-[30px] font-semibold leading-none">{valor}</p>
      {detalhe && <p className="mt-1.5 text-[12.5px] text-fosco">{detalhe}</p>}
    </Cartao>
  );
}

function Filtro({
  nome, rotulo, valor, vazio, opcoes,
}: {
  nome: string; rotulo: string; valor?: string; vazio: string;
  opcoes: { valor: string; rotulo: string }[];
}) {
  return (
    <label>
      <span className="sobrescrito">{rotulo}</span>
      <select
        name={nome}
        defaultValue={valor ?? ""}
        className="mt-1 block rounded-folha border border-regua bg-cartao px-3 py-2 outline-none focus:border-realce"
      >
        <option value="">{vazio}</option>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>{o.rotulo}</option>
        ))}
      </select>
    </label>
  );
}
