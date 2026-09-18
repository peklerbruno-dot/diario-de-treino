import Link from "next/link";
import { notFound } from "next/navigation";
import {
  apagarBoletim, desmarcarEnviadoPelaMao, enviarTeste, prepararEnvio, refazerFalhas,
} from "../acoes";
import { EnvioEmAndamento } from "./envio";
import { Redacao } from "./redacao";
import { exigirPessoa } from "@/lib/auth";
import {
  andamentoDoEnvio, atividadesAnunciaveis, boletim as buscarBoletim,
  etiquetas as buscarEtiquetas, quemRecebe,
} from "@/lib/consultas-contatos";
import { montarBoletim } from "@/lib/boletim";
import { enderecoDoSistema } from "@/lib/endereco";
import { porQueNaoConfigurado } from "@/lib/email";
import { NOME_DO_VINCULO, type VinculoDoContato } from "@/lib/contatos";
import { porBarras } from "@/lib/datas";
import { Aviso, Botao, BotaoLink, Cartao, Selo, Sobrescrito, Subtitulo, Titulo } from "@/componentes/pecas";

export const dynamic = "force-dynamic";

export default async function PaginaDoBoletim({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; recado?: string }>;
}) {
  const { id } = await params;
  const { erro, recado } = await searchParams;
  const pessoa = await exigirPessoa();

  const b = await buscarBoletim(id);
  if (!b) notFound();

  const [atividades, marcas, destinatarios, andamento, endereco] = await Promise.all([
    atividadesAnunciaveis(),
    buscarEtiquetas(),
    quemRecebe({ vinculo: b.filtroVinculo, etiquetaId: b.filtroEtiquetaId }),
    andamentoDoEnvio(id),
    enderecoDoSistema(),
  ]);

  const impedimento = porQueNaoConfigurado();
  const etiqueta = b.filtroEtiquetaId ? marcas.find((m) => m.id === b.filtroEtiquetaId) : null;

  // A pré-visualização é montada para você mesmo: é o seu nome e a sua chave
  // que entram, para o link de descadastro do exemplo não ser o de um estranho.
  const previa = montarBoletim({
    assunto: b.assunto,
    corpo: b.corpo,
    atividades: b.atividades.map(({ atividade: a }) => ({
      titulo: a.titulo, tipo: a.tipo, dia: a.dia, diaFinal: a.diaFinal, hora: a.hora,
      local: a.local, resumo: a.resumo,
      linkDeInscricao:
        a.inscricaoAberta && a.chavePublica ? `${endereco}/inscricao/${a.chavePublica}` : a.linkDeInscricao,
    })),
    destinatario: { nome: pessoa.nome, email: pessoa.email, chave: "previa" },
    endereco,
  });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Sobrescrito>Boletim</Sobrescrito>
            <Selo
              cor={
                b.estado === "ENVIADO" ? "var(--tinta-verde)"
                  : b.estado === "ENVIANDO" ? "var(--tinta-ambar)" : "var(--fosco)"
              }
            >
              {b.estado === "ENVIADO"
                ? b.enviadoPelaMao
                  ? "Enviado pela mão"
                  : "Enviado"
                : b.estado === "ENVIANDO"
                  ? "Enviando"
                  : "Rascunho"}
            </Selo>
          </div>
          <Titulo className="mt-1.5">{b.assunto}</Titulo>
          {b.enviadoEm && (
            <p className="mt-1.5 text-[14px] text-grafite">
              {b.enviadoPelaMao ? (
                <>
                  Marcado como enviado pela mão em{" "}
                  {porBarras(b.enviadoEm.toISOString().slice(0, 10))}, quando havia{" "}
                  {b.quantosNoSegmento} {b.quantosNoSegmento === 1 ? "pessoa" : "pessoas"} no
                  segmento.
                </>
              ) : (
                <>
                  Enviado em {porBarras(b.enviadoEm.toISOString().slice(0, 10))} para{" "}
                  {andamento.enviados} {andamento.enviados === 1 ? "pessoa" : "pessoas"}.
                </>
              )}
            </p>
          )}
        </div>
        <BotaoLink href="/boletins">Todos os boletins</BotaoLink>
      </div>

      {erro && <div className="mb-5"><Aviso tom="erro">{erro}</Aviso></div>}
      {recado && <div className="mb-5"><Aviso tom="bom">{recado}</Aviso></div>}

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-5">
          {b.estado === "RASCUNHO" ? (
            <Redacao
              boletim={{
                id: b.id, assunto: b.assunto, corpo: b.corpo,
                filtroVinculo: b.filtroVinculo, filtroEtiquetaId: b.filtroEtiquetaId,
                escolhidas: b.atividades.map((a) => a.atividadeId),
              }}
              atividades={atividades}
              etiquetas={marcas.map((m) => ({ id: m.id, nome: m.nome, quantos: m._count.contatos }))}
            />
          ) : (
            <Cartao className="p-5">
              <Subtitulo>O que foi enviado</Subtitulo>
              <p className="escrito mt-2 max-w-leitura text-[15px] leading-relaxed">{b.corpo}</p>
              <p className="mt-4 border-t border-linha pt-3 text-[13px] leading-relaxed text-fosco">
                Um boletim enviado não muda mais: ele já está na caixa das pessoas, e editá-lo aqui
                só criaria uma segunda versão da verdade. Para mandar outra coisa, comece um novo.
                {b.enviadoPelaMao && " Se a marca foi um engano, dá para voltar atrás ao lado."}
              </p>
            </Cartao>
          )}

          <Cartao como="section">
            <div className="border-b border-linha px-4 py-3">
              <Subtitulo>Como vai chegar</Subtitulo>
              <p className="mt-0.5 text-[13px] leading-relaxed text-grafite">
                Uma aproximação. Quem decide de verdade é o Gmail, o Outlook e o Mail do iPhone, e
                cada um decide diferente — por isso vale mandar o teste para você antes.
              </p>
            </div>
            <iframe
              title="Pré-visualização do boletim"
              srcDoc={previa.html}
              className="h-[520px] w-full rounded-b-cartao border-0 bg-white"
            />
          </Cartao>
        </div>

        <div className="space-y-5">
          <Cartao className="p-4">
            <Sobrescrito>Para quem vai</Sobrescrito>
            <p className="tabular mt-1 font-titulo text-[30px] font-semibold leading-none">
              {b.estado === "RASCUNHO" ? destinatarios.length : andamento.total}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-fosco">
              {b.filtroVinculo || etiqueta ? (
                <>
                  {b.filtroVinculo && <>Vínculo: {NOME_DO_VINCULO[b.filtroVinculo as VinculoDoContato]}. </>}
                  {etiqueta && <>Etiqueta: {etiqueta.nome}. </>}
                </>
              ) : (
                "A base inteira. "
              )}
              Só entram os contatos ativos e com consentimento registrado.
            </p>
            {b.estado === "RASCUNHO" && destinatarios.length === 0 && (
              <p className="mt-2 text-[13px] leading-relaxed text-ambar">
                Ninguém atende a este segmento hoje.{" "}
                <Link href="/contatos" className="text-realce underline">Ver a base</Link>.
              </p>
            )}
          </Cartao>

          {b.estado === "RASCUNHO" && (
            <Cartao className="p-4">
              <Sobrescrito>Enviar</Sobrescrito>

              {impedimento ? (
                <div className="mt-2">
                  <Aviso tom="atencao">
                    <b>O envio ainda não está ligado.</b>
                    <br />
                    {impedimento}
                  </Aviso>
                </div>
              ) : (
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-grafite">
                  Mande o teste para você primeiro. Depois, fechar a lista congela quem vai receber —
                  quem se cadastrar no meio do envio não entra, e quem sair não recebe.
                </p>
              )}

              <div className="mt-3 space-y-2">
                <form action={enviarTeste}>
                  <input type="hidden" name="id" value={b.id} />
                  <Botao disabled={Boolean(impedimento)} className="w-full">
                    Mandar um teste para {pessoa.email}
                  </Botao>
                </form>

                <form action={prepararEnvio}>
                  <input type="hidden" name="id" value={b.id} />
                  <Botao
                    tipo="primario"
                    disabled={Boolean(impedimento) || destinatarios.length === 0}
                    className="w-full"
                  >
                    Enviar para {destinatarios.length}{" "}
                    {destinatarios.length === 1 ? "pessoa" : "pessoas"}
                  </Botao>
                </form>
              </div>

              {/* O caminho da mão: enquanto o disparo não está ligado, ele é o
                  principal; depois, continua sendo a saída de emergência. */}
              <div className="mt-4 border-t border-linha pt-3.5">
                <Sobrescrito>{impedimento ? "Por enquanto" : "Ou"}</Sobrescrito>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-grafite">
                  {impedimento
                    ? "O boletim não precisa esperar. O sistema prepara o texto e a lista do segmento; você cola no Gmail e manda."
                    : "Mandar pelo Gmail, com o texto e a lista prontos — útil quando alguma coisa impede o disparo."}
                </p>
                <BotaoLink href={`/boletins/${b.id}/copiar`} className="mt-3 w-full">
                  Preparar para mandar pela mão
                </BotaoLink>
              </div>
            </Cartao>
          )}

          {b.estado !== "RASCUNHO" && b.enviadoPelaMao && (
            <Cartao className="p-4">
              <Sobrescrito>Enviado pela mão</Sobrescrito>
              <p className="mt-2 text-[14px] leading-relaxed text-grafite">
                Este boletim saiu pelo e-mail de alguém da equipe, e não pelo sistema. Por isso não
                há aqui uma lista de quem recebeu: quem entregou foi outro programa, e afirmar
                entrega que eu não vi seria inventar.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <BotaoLink href={`/boletins/${b.id}/copiar`}>Ver o que foi preparado</BotaoLink>
              </div>
              <details className="mt-3 text-[13px] text-fosco">
                <summary className="cursor-pointer">Marquei sem querer</summary>
                <p className="mt-2 leading-relaxed">
                  Volta a ser rascunho, editável, como se nada tivesse acontecido. Só o que foi
                  marcado à mão volta atrás — o que o sistema enviou, saiu.
                </p>
                <form action={desmarcarEnviadoPelaMao} className="mt-2.5">
                  <input type="hidden" name="id" value={b.id} />
                  <Botao>Voltar para rascunho</Botao>
                </form>
              </details>
            </Cartao>
          )}

          {b.estado !== "RASCUNHO" && !b.enviadoPelaMao && (
            <Cartao className="p-4">
              <Sobrescrito>Andamento</Sobrescrito>
              <div className="mt-3">
                <EnvioEmAndamento boletimId={b.id} pendentes={andamento.pendentes} />
              </div>

              <dl className="mt-4 space-y-1.5 border-t border-linha pt-3 text-[14px]">
                <Linha rotulo="Enviados">{andamento.enviados}</Linha>
                <Linha rotulo="Na fila">{andamento.pendentes}</Linha>
                <Linha rotulo="Falharam">{andamento.falhas.length}</Linha>
              </dl>

              {andamento.falhas.length > 0 && (
                <div className="mt-3 border-t border-linha pt-3">
                  <p className="text-[13px] leading-relaxed text-grafite">
                    Não chegaram, e por quê:
                  </p>
                  <ul className="mt-1.5 space-y-1 text-[12.5px] text-fosco">
                    {andamento.falhas.slice(0, 6).map((f) => (
                      <li key={f.id}>
                        <b>{f.contato.email}</b> — {f.erro}
                      </li>
                    ))}
                  </ul>
                  <form action={refazerFalhas} className="mt-3">
                    <input type="hidden" name="id" value={b.id} />
                    <Botao>Tentar de novo os que falharam</Botao>
                  </form>
                </div>
              )}
            </Cartao>
          )}

          {b.estado === "RASCUNHO" && (
            <details className="rounded-folha px-4 py-3 text-[13.5px] text-fosco ring-1 ring-regua">
              <summary className="cursor-pointer">Apagar este rascunho</summary>
              <form action={apagarBoletim} className="mt-3">
                <input type="hidden" name="id" value={b.id} />
                <Botao tipo="perigo">Apagar</Botao>
              </form>
            </details>
          )}
        </div>
      </div>
    </>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-grafite">{rotulo}</dt>
      <dd className="tabular font-medium">{children}</dd>
    </div>
  );
}
