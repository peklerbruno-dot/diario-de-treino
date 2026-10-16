import { Titulo } from "@/componentes/pecas";
import { bd } from "@/lib/bd";
import { quando } from "@/lib/datas";
import { googleConfigurado } from "@/lib/google";
import { iaConfigurada } from "@/lib/ia";
import { adicionarInstrucao, refazerTriagem, renomearConta, salvarEstilo } from "../acoes";
import { AprenderEstilo, RemoverConta, RemoverInstrucao } from "./botoes";

export const dynamic = "force-dynamic";

type Busca = Promise<{ conectada?: string; erro?: string }>;

const campo = "rounded-md border border-linha bg-superficie px-3 py-1.5 outline-none focus:border-destaque";

export default async function Ajustes({ searchParams }: { searchParams: Busca }) {
  const { conectada, erro } = await searchParams;
  const [contas, instrucoes, correcoes] = await Promise.all([
    bd.conta.findMany({ orderBy: { criadoEm: "asc" } }),
    bd.instrucao.findMany({ orderBy: { criadoEm: "asc" } }),
    bd.correcao.count(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <Titulo>Ajustes</Titulo>
      {conectada && <p className="mt-4 rounded-md border border-ok px-4 py-3 text-sm text-ok">Conta {conectada} conectada. A Central já está lendo a caixa dela.</p>}
      {erro && <p className="mt-4 rounded-md border border-atencao px-4 py-3 text-sm text-atencao">{erro}</p>}

      {(!googleConfigurado() || !iaConfigurada()) && (
        <p className="mt-4 rounded-md border border-alerta px-4 py-3 text-sm text-alerta">
          Falta configurar na Vercel:{" "}
          {[!googleConfigurado() && "GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET", !iaConfigurada() && "GEMINI_API_KEY"]
            .filter(Boolean)
            .join(" e ")}
          . Veja docs/COLOCAR-NO-AR.md.
        </p>
      )}

      <section className="mt-6">
        <h2 className="mb-1 border-b border-linha pb-1.5 text-mini font-semibold uppercase tracking-[0.08em] text-fosco">Contas</h2>
        <div className="mt-2 space-y-3">
          {contas.map((c) => (
            <div key={c.id} className="border-b border-linha py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{c.email}</p>
                  <p className="text-mini text-fosco">
                    {c.ultimaSincronia ? `Atualizada ${quando(c.ultimaSincronia)}` : "Ainda não atualizada"}
                  </p>
                </div>
                <RemoverConta id={c.id} email={c.email} />
              </div>
              {c.erro && (
                <p className="mt-2 text-sm text-atencao">
                  {c.erro}{" "}
                  <a href="/api/google/conectar" className="font-semibold underline">
                    Reconectar
                  </a>
                </p>
              )}
              <form action={renomearConta} className="mt-3 flex gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input name="rotulo" defaultValue={c.rotulo} className={`${campo} w-32`} aria-label="Rótulo" />
                <button className="rounded-md border border-linha px-3 py-1.5 text-sm font-medium hover:bg-realce">Renomear</button>
              </form>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-grafite">
                  Estilo de escrita {c.estilo ? "✓" : "(ainda não aprendido)"}
                </summary>
                <form action={salvarEstilo} className="mt-2">
                  <input type="hidden" name="id" value={c.id} />
                  <textarea
                    key={c.estilo ?? ""}
                    name="estilo"
                    defaultValue={c.estilo ?? ""}
                    rows={8}
                    placeholder="Como você escreve nesta conta. Use o botão abaixo para a Central aprender com os seus e-mails enviados, e ajuste à vontade."
                    className={`${campo} w-full text-sm`}
                  />
                  <div className="mt-2 flex gap-2">
                    <button className="rounded-md border border-linha px-3 py-1.5 text-sm font-medium hover:bg-realce">Salvar estilo</button>
                    <AprenderEstilo id={c.id} />
                  </div>
                </form>
              </details>
            </div>
          ))}
        </div>
        <a
          href="/api/google/conectar"
          className="mt-3 inline-block rounded-md bg-destaque px-4 py-2 font-semibold text-destaque-tinta"
        >
          + Conectar conta Google
        </a>
        <p className="mt-2 text-mini text-fosco">
          Na tela do Google, escolha a conta e deixe todas as permissões marcadas. Repita para cada conta (pessoal, CIP,
          USP). A Central lê e cria rascunhos, mas nunca envia nada sozinha.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-1 border-b border-linha pb-1.5 text-mini font-semibold uppercase tracking-[0.08em] text-fosco">Regras da triagem</h2>
        <p className="mt-1 text-sm text-grafite">
          Escreva como você decide. Ex.: “Tudo da Nancy (nrozench@usp.br) é prioridade alta”, “Boletim do CEJ com [Teste] no
          assunto é ruído”.
        </p>
        <div className="divide-y divide-linha">
          {instrucoes.map((i) => (
            <div key={i.id} className="flex items-start gap-3 py-2.5 text-sm">
              <span className="flex-1">{i.texto}</span>
              <RemoverInstrucao id={i.id} />
            </div>
          ))}
          <form action={adicionarInstrucao} className="flex gap-2 py-3">
            <input name="texto" placeholder="Nova regra…" className={`${campo} min-w-0 flex-1`} />
            <button className="rounded-md border border-linha px-3 py-1.5 text-sm font-medium hover:bg-realce">Adicionar</button>
          </form>
        </div>
        <p className="mt-2 text-mini text-fosco">
          Além das regras, cada vez que você corrige a categoria de uma conversa a Central aprende com isso ({correcoes}{" "}
          {correcoes === 1 ? "correção" : "correções"} até agora).
        </p>
        <form action={refazerTriagem} className="mt-2 px-1">
          <button className="text-sm font-semibold text-destaque">Refazer a triagem com as regras atuais</button>
          <span className="text-mini text-fosco"> (vale na próxima atualização)</span>
        </form>
      </section>

      <p className="mt-10 text-center text-sm">
        <a href="/sair" className="text-fosco underline">
          Sair
        </a>
      </p>
    </div>
  );
}
