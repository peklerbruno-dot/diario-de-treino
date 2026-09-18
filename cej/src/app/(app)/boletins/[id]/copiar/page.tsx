import Link from "next/link";
import { notFound } from "next/navigation";
import { marcarEnviadoPelaMao } from "../../acoes";
import { Copiavel } from "./copiavel";
import { exigirPessoa } from "@/lib/auth";
import { boletim as buscarBoletim, quemRecebe } from "@/lib/consultas-contatos";
import { montarBoletim } from "@/lib/boletim";
import { enderecoDoSistema } from "@/lib/endereco";
import { Aviso, Botao, BotaoLink, Cartao, Sobrescrito, Subtitulo, Topo } from "@/componentes/pecas";

export const dynamic = "force-dynamic";

/**
 * Mandar o boletim pela mão.
 *
 * Enquanto o disparo do sistema não está ligado — o que depende de um domínio, e
 * de uma decisão que não é só técnica —, o boletim não precisa ficar parado. O
 * sistema faz a parte que ele faz melhor: guarda o texto, monta a lista de
 * atividades com data e local certos, e recorta o segmento. O Gmail faz a parte
 * dele: entregar.
 *
 * O aviso do Cco não é zelo. Uma lista de duzentos e-mails no campo "Para" é a
 * base inteira do Centro exposta para cada uma dessas duzentas pessoas — um
 * vazamento de dado pessoal cometido com um clique, e irreversível.
 */
export default async function CopiarBoletim({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pessoa = await exigirPessoa();

  const b = await buscarBoletim(id);
  if (!b) notFound();

  const [destinatarios, endereco] = await Promise.all([
    quemRecebe({ vinculo: b.filtroVinculo, etiquetaId: b.filtroEtiquetaId }),
    enderecoDoSistema(),
  ]);

  const { texto: corpoEmTexto } = montarBoletim({
    assunto: b.assunto,
    corpo: b.corpo,
    atividades: b.atividades.map(({ atividade: a }) => ({
      titulo: a.titulo, tipo: a.tipo, dia: a.dia, diaFinal: a.diaFinal, hora: a.hora,
      local: a.local, resumo: a.resumo,
      linkDeInscricao:
        a.inscricaoAberta && a.chavePublica
          ? `${endereco}/inscricao/${a.chavePublica}`
          : a.linkDeInscricao,
    })),
    destinatario: { nome: pessoa.nome, email: pessoa.email, chave: "copia" },
    endereco,
    pelaMao: true,
  });

  const emails = destinatarios.map((d) => d.email).join(", ");
  const demais = destinatarios.length > 300;

  return (
    <>
      <Topo
        titulo="Mandar pela sua mão"
        chamada={`"${b.assunto}" — o texto e a lista prontos para colar no Gmail, enquanto o disparo do sistema não está ligado.`}
        acao={<BotaoLink href={`/boletins/${b.id}`}>Voltar ao boletim</BotaoLink>}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-5">
          <Cartao className="p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Subtitulo>1. Os destinatários</Subtitulo>
              <span className="tabular text-[14px] text-grafite">
                {destinatarios.length} {destinatarios.length === 1 ? "pessoa" : "pessoas"}
              </span>
            </div>

            <div className="my-3">
              <Aviso tom="atencao">
                <b>Cole no campo Cco, nunca no Para.</b> No campo &ldquo;Para&rdquo;, cada uma
                destas pessoas passa a ver o e-mail de todas as outras — é a base do Centro
                entregue de mão beijada, com um clique, e não há como desfazer.
              </Aviso>
            </div>

            {destinatarios.length === 0 ? (
              <p className="text-[14px] text-fosco">
                Ninguém neste segmento tem consentimento registrado.{" "}
                <Link href="/contatos" className="text-realce hover:underline">Ver a base</Link>.
              </p>
            ) : (
              <Copiavel rotulo="E-mails, separados por vírgula" valor={emails} linhas={5} fonteMono />
            )}

            {demais && (
              <p className="mt-3 text-[13px] leading-relaxed text-ambar">
                São mais de 300 endereços. O Gmail de uma conta comum recusa por volta de 500
                destinatários por dia, e uma mensagem só com centenas em Cco costuma cair no spam.
                Divida em duas ou três levas, em dias diferentes — ou, melhor, é o sinal de que vale
                ligar o disparo do sistema.
              </p>
            )}
          </Cartao>

          <Cartao className="p-5">
            <Subtitulo>2. O assunto</Subtitulo>
            <div className="mt-3">
              <Copiavel rotulo="Assunto" valor={b.assunto} linhas={2} />
            </div>
          </Cartao>
        </div>

        <div className="space-y-5">
          <Cartao className="p-5">
            <Subtitulo>3. A mensagem</Subtitulo>
            <p className="mt-1 text-[13.5px] leading-relaxed text-grafite">
              Duas versões. A com formatação fica melhor; a de texto simples funciona em qualquer
              lugar e nunca chega desmontada.
            </p>

            <div className="mt-4 rounded-folha bg-papel p-4">
              <Sobrescrito>Com formatação</Sobrescrito>
              <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[13.5px] leading-relaxed text-grafite">
                <li>
                  <a
                    href={`/api/boletim/${b.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-realce hover:underline"
                  >
                    Abra o boletim numa aba nova ↗
                  </a>
                </li>
                <li>Selecione tudo — <b>Ctrl+A</b>, ou <b>⌘+A</b> no Mac.</li>
                <li>Copie e cole no corpo do e-mail, no Gmail.</li>
              </ol>
              <p className="mt-2 text-[12.5px] leading-relaxed text-fosco">
                É preciso passar pela aba: copiar daqui levaria o código da página, e o Gmail
                colaria as letras em vez do desenho.
              </p>
            </div>

            <div className="mt-4">
              <Copiavel rotulo="Ou o texto simples" valor={corpoEmTexto} linhas={12} />
            </div>
          </Cartao>

          <Cartao className="p-5">
            <Subtitulo>4. Depois de mandar</Subtitulo>
            <p className="mt-1.5 text-[14px] leading-relaxed text-grafite">
              Marque aqui. O sistema não tem como saber que o e-mail saiu do seu Gmail — e sem essa
              marca, daqui a um mês ninguém sabe se este boletim foi ou não foi.
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-fosco">
              Fica guardado o que eu sei de verdade: que você marcou, quando, e que havia{" "}
              {destinatarios.length} {destinatarios.length === 1 ? "pessoa" : "pessoas"} no segmento
              hoje. Não invento uma confirmação de entrega por pessoa, que quem entregou foi outro
              programa.
            </p>

            {b.estado === "RASCUNHO" ? (
              <form action={marcarEnviadoPelaMao} className="mt-4">
                <input type="hidden" name="id" value={b.id} />
                <Botao tipo="primario">Marcar como enviado</Botao>
              </form>
            ) : (
              <p className="mt-4 text-[14px] font-medium text-verde">Já está marcado como enviado.</p>
            )}
          </Cartao>

          <Cartao className="p-5">
            <Sobrescrito>Sobre quem pedir para sair</Sobrescrito>
            <p className="mt-2 text-[14px] leading-relaxed text-grafite">
              Esta versão pede que a pessoa <b>responda com a palavra SAIR</b>, em vez de trazer o
              link de um clique. Num Cco a mensagem é uma só para todo mundo, e um link pessoal ali
              descadastraria a pessoa errada.
            </p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-fosco">
              Quando alguém responder pedindo, abra a ficha dela em Contatos e clique em{" "}
              <b>Descadastrado</b>. O sistema passa a mantê-la fora de todos os envios — inclusive
              se a planilha antiga for importada de novo.
            </p>
          </Cartao>
        </div>
      </div>
    </>
  );
}
