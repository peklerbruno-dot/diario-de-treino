import Link from "next/link";
import { CartaoConversa, Secao, Vazio } from "@/componentes/cartao-conversa";
import { compromissos } from "@/lib/agenda";
import { bd } from "@/lib/bd";
import { DEPENDEM_DE_MIM, categoria } from "@/lib/categorias";
import { ORDEM, VISIVEL } from "@/lib/consultas";
import { FUSO, agoraPorExtenso, diasDesde, quando } from "@/lib/datas";

export const dynamic = "force-dynamic";

const DIAS_PARA_COBRAR = 3;

export default async function Painel() {
  const contas = await bd.conta.findMany({ orderBy: { criadoEm: "asc" } });
  if (!contas.length) {
    return (
      <div className="mt-8 rounded-cartao bg-cartao p-5 shadow-cartao">
        <h2 className="font-titulo text-2xl">Bem-vindo</h2>
        <p className="mt-2 text-grafite">
          Conecte suas contas Google (pessoal, CIP, USP) para a Central ler as caixas, a agenda e começar a triagem.
        </p>
        <Link href="/ajustes" className="mt-4 inline-block rounded-xl bg-destaque px-4 py-2.5 font-semibold text-destaque-tinta">
          Conectar contas
        </Link>
      </div>
    );
  }

  const agora = new Date();
  const fimDeAmanha = new Date(agora.getTime() + 2 * 86_400_000);
  const em14 = new Date(agora.getTime() + 14 * 86_400_000);
  const [paraMim, prazos, aguardando, contagem, agenda] = await Promise.all([
    bd.conversa.findMany({
      where: { ...VISIVEL, categoria: { in: DEPENDEM_DE_MIM } },
      include: { conta: true },
      orderBy: ORDEM,
      take: 15,
    }),
    bd.conversa.findMany({
      where: { ...VISIVEL, prazo: { not: null, lte: em14 } },
      include: { conta: true },
      orderBy: { prazo: "asc" },
      take: 8,
    }),
    bd.conversa.findMany({
      where: {
        ...VISIVEL,
        categoria: "aguardando",
        ultimaData: { lte: new Date(agora.getTime() - DIAS_PARA_COBRAR * 86_400_000) },
      },
      include: { conta: true },
      orderBy: { ultimaData: "asc" },
      take: 8,
    }),
    bd.conversa.groupBy({ by: ["categoria"], where: VISIVEL, _count: true }),
    compromissos(contas, agora, fimDeAmanha),
  ]);

  const n = (id: string) => contagem.find((c) => c.categoria === id)?._count ?? 0;
  const desconectadas = contas.filter((c) => c.erro);
  const ultima = contas
    .map((c) => c.ultimaSincronia)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const hoje = agora.toLocaleDateString("en-CA", { timeZone: FUSO });

  return (
    <>
      <p className="mt-4 text-sm text-grafite first-letter:uppercase">{agoraPorExtenso(agora)}</p>

      {desconectadas.map((c) => (
        <Link key={c.id} href="/ajustes" className="mt-3 block rounded-xl border border-atencao px-4 py-3 text-sm text-atencao">
          A conta {c.rotulo} ({c.email}) precisa ser reconectada. Toque aqui.
        </Link>
      ))}

      <div className="mt-4 grid grid-cols-4 gap-2">
        {(["responder", "acao", "agenda", "aguardando"] as const).map((id) => (
          <Link key={id} href={`/caixa?categoria=${id}`} className="rounded-cartao bg-cartao px-3 py-3 shadow-cartao">
            <p className="text-2xl font-semibold">{n(id)}</p>
            <p className="text-xs text-grafite">
              {categoria(id).icone} {categoria(id).nome}
            </p>
          </Link>
        ))}
      </div>

      <Secao titulo="Precisa de você" acao={<Link href="/caixa" className="text-sm text-destaque">Caixa toda</Link>}>
        {paraMim.length ? (
          paraMim.map((c) => <CartaoConversa key={c.id} c={c} mostrarCategoria />)
        ) : (
          <Vazio>Nada pendente. 🎉</Vazio>
        )}
      </Secao>

      {prazos.length > 0 && (
        <Secao titulo="Prazos nos próximos 14 dias">
          {prazos.map((c) => (
            <CartaoConversa key={c.id} c={c} mostrarCategoria />
          ))}
        </Secao>
      )}

      <Secao titulo="Hoje e amanhã">
        {agenda.length ? (
          agenda.map((e, i) => {
            const dia = e.inicio.toLocaleDateString("en-CA", { timeZone: FUSO });
            return (
              <a key={i} href={e.link} target="_blank" rel="noreferrer" className="flex gap-3 px-4 py-2.5 text-sm">
                <span className="w-24 shrink-0 text-grafite">
                  {dia === hoje ? "Hoje" : "Amanhã"}{" "}
                  {e.diaInteiro ? "" : e.inicio.toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="min-w-0 flex-1 truncate">{e.titulo}</span>
                <span className="shrink-0 text-xs text-fosco">{e.conta}</span>
              </a>
            );
          })
        ) : (
          <Vazio>Nenhum compromisso.</Vazio>
        )}
      </Secao>

      {aguardando.length > 0 && (
        <Secao titulo="Esperando resposta há dias">
          {aguardando.map((c) => (
            <Link key={c.id} href={`/conversa/${c.id}`} className="block px-4 py-3">
              <div className="flex justify-between text-xs text-fosco">
                <span className="rounded-md bg-linha px-1.5 py-0.5 font-semibold text-grafite">{c.conta.rotulo}</span>
                <span>há {diasDesde(c.ultimaData)} dias</span>
              </div>
              <p className="mt-1 truncate font-semibold">{c.remetente.replace(/^Para: /, "")}</p>
              <p className="truncate text-sm text-grafite">{c.resumo || c.assunto}</p>
            </Link>
          ))}
        </Secao>
      )}

      <p className="mt-6 text-center text-xs text-fosco">
        {ultima ? `Última atualização: ${quando(ultima)}` : "Ainda não atualizou. Toque em Atualizar."}
      </p>
    </>
  );
}
