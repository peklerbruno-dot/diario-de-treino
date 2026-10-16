import { Titulo } from "@/componentes/pecas";
import { bd } from "@/lib/bd";
import { quando } from "@/lib/datas";
import { googleConfigurado } from "@/lib/google";
import { iaConfigurada } from "@/lib/ia";
import { adicionarInstrucao, refazerTriagem, renomearConta, salvarEstilo, salvarResumo } from "../acoes";
import { lerAjuste } from "@/lib/ajustes";
import { contaDoResumo } from "@/lib/resumo";
import { AprenderEstilo, EnviarResumoAgora, RemoverConta, RemoverInstrucao } from "./botoes";

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
  const [resumoLigado, contaResumo] = [(await lerAjuste("resumo.ligado", "1")) === "1", await contaDoResumo(contas)];

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
        <h2 className="mb-2 text-[13px] font-semibold text-fosco">Contas</h2>
        <div className="mt-2 space-y-3">
          {contas.map((c) => (
            <div key={c.id} className="border-b border-linha py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{c.email}</p>
                  <p className="text-[13px] text-fosco">
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
        <p className="mt-2 text-[13px] text-fosco">
          Na tela do Google, escolha a conta e deixe todas as permissões marcadas. Repita para cada conta (pessoal, CIP,
          USP). A Central lê e cria rascunhos; o único e-mail que ela envia é o resumo da manhã, para você mesmo.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="mb-2 text-[13px] font-semibold text-fosco">Resumo da manhã</h2>
        <p className="mb-3 text-[15px] text-grafite">
          Todo dia, a partir das 7h, um e-mail curto com a agenda, o que fazer e quem te deve resposta. Ele vai da conta escolhida para ela mesma.
        </p>
        <form action={salvarResumo} className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <label className="flex items-center gap-2 text-[15px]">
            <input type="checkbox" name="ligado" defaultChecked={resumoLigado} className="h-4 w-4 accent-[var(--destaque)]" />
            Ligado
          </label>
          <label className="flex items-center gap-2 text-[15px] text-grafite">
            Receber em
            <select name="conta" defaultValue={contaResumo?.id} className={`${campo} py-1`}>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.rotulo} ({c.email})
                </option>
              ))}
            </select>
          </label>
          <button className="rounded-md border border-linha px-3 py-1.5 text-sm font-medium hover:bg-realce">Salvar</button>
        </form>
        <div className="mt-3">
          <EnviarResumoAgora />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-2 text-[13px] font-semibold text-fosco">Regras da triagem</h2>
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
        <p className="mt-2 text-[13px] text-fosco">
          Além das regras, cada vez que você corrige a categoria de uma conversa a Central aprende com isso ({correcoes}{" "}
          {correcoes === 1 ? "correção" : "correções"} até agora).
        </p>
        <form action={refazerTriagem} className="mt-2 px-1">
          <button className="text-sm font-semibold text-destaque">Refazer a triagem com as regras atuais</button>
          <span className="text-[13px] text-fosco"> (vale na próxima atualização)</span>
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
