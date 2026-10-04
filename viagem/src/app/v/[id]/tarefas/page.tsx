import { bd } from "@/lib/bd";
import { exigirMembro } from "@/lib/auth";
import { curta, hoje } from "@/lib/datas";
import { primeiroNome } from "@/lib/cores";
import { Avatar, Cabecalho, Pagina, Secao } from "@/componentes/pecas";
import { BotaoEnviar } from "@/componentes/formulario";
import { apagarTarefa, atribuirTarefa, criarTarefa, marcarTarefa, sugerirTarefas } from "@/acoes/tarefas";
import { EnviarAoMudar } from "@/componentes/enviar-ao-mudar";

export default async function Tarefas({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ minhas?: string }> }) {
  const { id } = await params;
  const { minhas } = await searchParams;
  const { eu } = await exigirMembro(id);
  const [tarefas, membros] = await Promise.all([
    bd.tarefa.findMany({ where: { viagemId: id }, orderBy: [{ feita: "asc" }, { prazo: "asc" }, { criadoEm: "asc" }] }),
    bd.membro.findMany({ where: { viagemId: id, saiuEm: null }, orderBy: { criadoEm: "asc" } }),
  ]);
  const visiveis = minhas ? tarefas.filter((t) => t.responsavelId === eu.id) : tarefas;
  const abertas = visiveis.filter((t) => !t.feita);
  const feitas = visiveis.filter((t) => t.feita);
  const dia = hoje();
  const membro = (mid: string | null) => membros.find((m) => m.id === mid);

  const linha = (t: (typeof tarefas)[number]) => {
    const resp = membro(t.responsavelId);
    const atrasada = !t.feita && t.prazo && t.prazo < dia;
    return (
      <li key={t.id} className="flex items-start gap-3 px-4 py-3">
        <form action={marcarTarefa}>
          <input type="hidden" name="viagemId" value={id} />
          <input type="hidden" name="tarefaId" value={t.id} />
          <input type="hidden" name="feita" value={t.feita ? "nao" : "sim"} />
          <button
            aria-label={t.feita ? "Desmarcar" : "Marcar como feita"}
            className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-md border-2 ${t.feita ? "border-verde bg-verde text-white" : "border-regua"}`}
          >
            {t.feita ? "✓" : ""}
          </button>
        </form>
        <div className="min-w-0 flex-1">
          <p className={t.feita ? "text-fosco line-through" : ""}>{t.texto}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-fosco">
            <form action={atribuirTarefa} className="flex items-center gap-1">
              <input type="hidden" name="viagemId" value={id} />
              <input type="hidden" name="tarefaId" value={t.id} />
              {resp && <Avatar nome={resp.nome} cor={resp.cor} tamanho={18} />}
              <EnviarAoMudar name="responsavelId" defaultValue={t.responsavelId ?? ""} className="bg-transparent text-[13px] text-fosco" aria-label="Responsável">
                <option value="">sem dono</option>
                {membros.map((m) => <option key={m.id} value={m.id}>{m.id === eu.id ? "eu" : primeiroNome(m.nome)}</option>)}
              </EnviarAoMudar>
            </form>
            {t.prazo && <span className={atrasada ? "font-semibold text-vermelho" : ""}>até {curta(t.prazo)}</span>}
          </div>
        </div>
        <form action={apagarTarefa}>
          <input type="hidden" name="viagemId" value={id} />
          <input type="hidden" name="tarefaId" value={t.id} />
          <button aria-label="Apagar tarefa" className="px-1 text-fosco">×</button>
        </form>
      </li>
    );
  };

  return (
    <Pagina abas>
      <Cabecalho
        titulo="Tarefas"
        voltar={`/v/${id}`}
        subtitulo={`${tarefas.filter((t) => !t.feita).length} por fazer · ${tarefas.filter((t) => t.feita).length} feitas`}
      />

      <form action={criarTarefa} className="cartao space-y-3 p-4">
        <input type="hidden" name="viagemId" value={id} />
        <textarea name="texto" required rows={2} className="campo" placeholder={"Comprar chip\nReservar o passeio de barco (uma por linha)"} />
        <div className="grid grid-cols-2 gap-2">
          <select name="responsavelId" className="campo" defaultValue="" aria-label="Quem faz">
            <option value="">Quem faz? (ninguém ainda)</option>
            {membros.map((m) => <option key={m.id} value={m.id}>{m.id === eu.id ? "Eu" : m.nome}</option>)}
          </select>
          <input name="prazo" type="date" className="campo" aria-label="Prazo" />
        </div>
        <BotaoEnviar>Adicionar</BotaoEnviar>
      </form>

      <div className="mt-4 flex gap-2">
        <a href={`/v/${id}/tarefas`} className={`pilula ${!minhas ? "pilula-ativa" : ""}`}>Todas</a>
        <a href={`/v/${id}/tarefas?minhas=1`} className={`pilula ${minhas ? "pilula-ativa" : ""}`}>As minhas</a>
      </div>

      <Secao titulo="Por fazer">
        {abertas.length === 0 ? (
          <div className="cartao p-4 text-[15px] text-fosco">
            {tarefas.length === 0 ? (
              <form action={sugerirTarefas} className="space-y-2">
                <input type="hidden" name="viagemId" value={id} />
                <p>Nada ainda. Quer começar com o que todo grupo indo ao México precisa resolver?</p>
                <BotaoEnviar className="botao-leve w-full">Sugerir tarefas para o México</BotaoEnviar>
              </form>
            ) : (
              "Tudo feito. 🎉"
            )}
          </div>
        ) : (
          <ul className="cartao divide-y divide-linha">{abertas.map(linha)}</ul>
        )}
      </Secao>

      {feitas.length > 0 && (
        <Secao titulo="Feitas">
          <ul className="cartao divide-y divide-linha">{feitas.map(linha)}</ul>
        </Secao>
      )}
    </Pagina>
  );
}
