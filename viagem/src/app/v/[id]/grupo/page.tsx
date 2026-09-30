import { headers } from "next/headers";
import { exigirMembro } from "@/lib/auth";
import { membrosDaViagem } from "@/lib/consultas";
import { periodo } from "@/lib/datas";
import { temGemini } from "@/lib/leitor";
import { temGoogle } from "@/lib/localizar";
import { Aviso, Avatar, Cabecalho, Pagina, Secao } from "@/componentes/pecas";
import { Compartilhar, Copiar } from "@/componentes/copiar";
import { FormularioDeViagem } from "@/componentes/formulario-viagem";
import { FormularioDeCambio } from "@/componentes/formulario-cambio";
import { adicionarMembro, alternarOrganizacao, desvincularConta, removerMembro, renomearMembro, trocarChaveDoAtalho, trocarConvite } from "@/acoes/viagem";

export default async function Grupo({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nova?: string }> }) {
  const { id } = await params;
  const { nova } = await searchParams;
  const { eu, viagem, pessoa } = await exigirMembro(id);
  const membros = await membrosDaViagem(id);

  const h = await headers();
  const origem = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const convite = `${origem}/convite/${viagem.convite}`;
  const atalho = `${origem}/api/atalho?chave=${pessoa.chaveDoAtalho}&viagem=${viagem.id}`;

  return (
    <Pagina abas>
      <Cabecalho titulo="Grupo" subtitulo={`${viagem.nome} · ${periodo(viagem.inicio, viagem.fim)}`} />

      {nova && <Aviso tom="ok">Viagem criada! Agora mande o convite no grupo do WhatsApp.</Aviso>}

      <Secao titulo="Convite">
        <div className="cartao space-y-3 p-4">
          <p className="text-[15px] text-grafite">Quem abrir este link cria a conta e entra na viagem. Quem já está nas contas escolhe o próprio nome.</p>
          <Compartilhar texto={`Bora organizar a viagem “${viagem.nome}” aqui:`} url={convite} />
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-folha bg-linha px-2 py-2 text-[13px]">{convite}</code>
            <Copiar valor={convite} />
          </div>
          {eu.organiza && (
            <form action={trocarConvite}>
              <input type="hidden" name="viagemId" value={id} />
              <button className="text-[14px] text-fosco">Trocar o link (o antigo para de funcionar)</button>
            </form>
          )}
        </div>
      </Secao>

      <Secao titulo={`Quem vai · ${membros.length}`}>
        <ul className="cartao divide-y divide-linha">
          {membros.map((m) => (
            <li key={m.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar nome={m.nome} cor={m.cor} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{m.nome}{m.id === eu.id && " (você)"}</span>
                  <span className="block text-[13px] text-fosco">
                    {m.organiza ? "organiza" : m.pessoaId ? "tem conta" : "ainda sem conta — entra pelo convite"}
                  </span>
                </span>
              </div>
              {(m.id === eu.id || eu.organiza) && (
                <details className="mt-2 pl-11">
                  <summary className="cursor-pointer text-[14px] text-realce">Mudar</summary>
                  <form action={renomearMembro} className="mt-2 flex gap-2">
                    <input type="hidden" name="viagemId" value={id} />
                    <input type="hidden" name="membroId" value={m.id} />
                    <input name="nome" defaultValue={m.nome} className="campo flex-1 py-2" aria-label="Nome" />
                    <button className="botao-leve min-h-[40px]">Salvar</button>
                  </form>
                  {eu.organiza && m.id !== eu.id && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-[14px]">
                      {m.pessoaId && (
                        <form action={alternarOrganizacao}>
                          <input type="hidden" name="viagemId" value={id} />
                          <input type="hidden" name="membroId" value={m.id} />
                          <button className="text-realce">{m.organiza ? "Tirar da organização" : "Tornar organizador(a)"}</button>
                        </form>
                      )}
                      {m.pessoaId && (
                        <form action={desvincularConta}>
                          <input type="hidden" name="viagemId" value={id} />
                          <input type="hidden" name="membroId" value={m.id} />
                          <button className="text-realce">Soltar a conta (esqueceu a senha)</button>
                        </form>
                      )}
                      <form action={removerMembro}>
                        <input type="hidden" name="viagemId" value={id} />
                        <input type="hidden" name="membroId" value={m.id} />
                        <button className="text-vermelho">Tirar da viagem</button>
                      </form>
                    </div>
                  )}
                </details>
              )}
            </li>
          ))}
        </ul>
        <form action={adicionarMembro} className="mt-3 flex gap-2">
          <input type="hidden" name="viagemId" value={id} />
          <input name="nome" required minLength={2} className="campo flex-1" placeholder="Pôr alguém nas contas" aria-label="Nome" />
          <button className="botao">Pôr</button>
        </form>
        <p className="mt-1 text-[13px] text-fosco">Para quem não vai criar conta: entra nas divisões do mesmo jeito.</p>
      </Secao>

      <Secao titulo="Câmbio">
        <div className="cartao p-4">
          <FormularioDeCambio viagemId={id} moedaBase={viagem.moedaBase} cambios={(viagem.cambios as Record<string, number>) ?? {}} />
        </div>
      </Secao>

      <Secao titulo="Mandar posts direto do Instagram">
        <div id="atalho" className="cartao space-y-3 p-4 text-[15px]">
          <p><strong>Android:</strong> instale o app (menu do Chrome → “Instalar app”). Aí, no Instagram, Compartilhar → Viagem.</p>
          <p><strong>iPhone:</strong> o Safari não deixa sites aparecerem na folha de compartilhar, então o caminho é um atalho de 1 minuto no app Atalhos. Ele manda o link do reel (ou os prints) para cá, e o post aparece na caixa de entrada, já lido.</p>
          <ol className="list-decimal space-y-1 pl-5 text-grafite">
            <li>App <strong>Atalhos</strong> → <strong>+</strong> → nome “Mandar pra Viagem”. Nos detalhes (ⓘ), ligue <strong>Mostrar na Folha de Compartilhamento</strong>, aceitando <em>URLs, Texto e Imagens</em>.</li>
            <li>Ação <strong>Obter Conteúdo de URL</strong>, com o endereço abaixo. Método <strong>POST</strong>, Corpo da solicitação <strong>Formulário</strong>, com um campo <code>conteudo</code> = <em>Entrada do Atalho</em>.</li>
            <li>(Opcional) ação <strong>Mostrar Notificação</strong> com o <em>Conteúdo de URL</em>, para ver a resposta.</li>
          </ol>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-folha bg-linha px-2 py-2 text-[13px]">{atalho}</code>
            <Copiar valor={atalho} />
          </div>
          <p className="text-[13px] text-fosco">Esse endereço é pessoal (tem a sua chave): não mande no grupo. Cada um copia o seu, aqui nesta tela.</p>
          <form action={trocarChaveDoAtalho}>
            <input type="hidden" name="viagemId" value={id} />
            <button className="text-[14px] text-fosco">Gerar outra chave (o atalho antigo para de funcionar)</button>
          </form>
        </div>
      </Secao>

      {eu.organiza && (
        <Secao titulo="Viagem">
          <div className="cartao p-4">
            <FormularioDeViagem viagem={viagem} />
          </div>
        </Secao>
      )}

      <Secao titulo="Sobre">
        <div className="cartao space-y-1 p-4 text-[14px] text-fosco">
          <p>Leitura de posts e prints: {temGemini() ? "ligada (Gemini)" : "desligada — falta GEMINI_API_KEY"}.</p>
          <p>Busca de lugares: {temGoogle() ? "Google Places" : "OpenStreetMap (grátis). Com GOOGLE_MAPS_API_KEY, acha mais restaurantes."}</p>
          <p>Você entrou como {pessoa.email}.</p>
          <form action="/sair" method="post" className="pt-2">
            <button className="font-semibold text-vermelho">Sair</button>
          </form>
        </div>
      </Secao>
    </Pagina>
  );
}
