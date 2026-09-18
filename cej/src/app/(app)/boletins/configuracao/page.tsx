import Link from "next/link";
import { TesteDeEnvio } from "./teste";
import { exigirPessoa } from "@/lib/auth";
import { resumoDaConfiguracao } from "@/lib/email";
import { Aviso, BotaoLink, Cartao, Sobrescrito, Subtitulo, Topo } from "@/componentes/pecas";

export const dynamic = "force-dynamic";

/**
 * Como está o envio.
 *
 * Existe para um momento específico: o dia em que alguém cadastra as variáveis
 * e precisa saber se funcionou. Sem esta tela, a única forma de descobrir seria
 * escrever um boletim de mentira e apertar enviar — e, se desse errado, o erro
 * viria no meio de uma tela que fala de outra coisa.
 *
 * Quando dá errado, a recusa do serviço aparece **inteira**, sem resumo: é
 * sempre ela que diz o que fazer ("domain is not verified", "Invalid API key"),
 * e reescrevê-la com minhas palavras só faria a pessoa ter que ir procurar a
 * original em outro lugar.
 */
export default async function ConfiguracaoDoEnvio() {
  const pessoa = await exigirPessoa();
  const c = resumoDaConfiguracao();

  return (
    <>
      <Topo
        titulo="Como está o envio"
        chamada="O que o sistema precisa para mandar boletins, e se ele já tem. Tudo o mais funciona sem isto — só o disparo depende desta página."
        acao={<BotaoLink href="/boletins">Voltar aos boletins</BotaoLink>}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-5">
          <Cartao className="p-5">
            <Sobrescrito>Situação</Sobrescrito>
            <p
              className={`mt-1.5 font-titulo text-[24px] font-semibold tracking-tight ${
                c.pronto ? "text-verde" : "text-ambar"
              }`}
            >
              {c.pronto ? "O envio está ligado" : "O envio ainda não está ligado"}
            </p>

            {c.impedimento && (
              <div className="mt-3">
                <Aviso tom="atencao">{c.impedimento}</Aviso>
              </div>
            )}

            <dl className="mt-4 space-y-2.5 border-t border-linha pt-3.5 text-[14px]">
              <Linha rotulo="Chave do serviço" ok={c.chaveCadastrada}>
                {c.chaveCadastrada ? "cadastrada" : "falta cadastrar"}
              </Linha>
              <Linha rotulo="Os boletins saem de" ok={Boolean(c.remetente)}>
                {c.remetente ?? "falta cadastrar"}
              </Linha>
              <Linha rotulo="Respostas vão para" ok={Boolean(c.responderPara)}>
                {c.responderPara ?? "ninguém — as respostas se perdem"}
              </Linha>
            </dl>

            <p className="mt-3 text-[12.5px] leading-relaxed text-fosco">
              A chave nunca aparece aqui, nem pela metade. O que esta tela sabe é se ela existe.
            </p>
          </Cartao>

          <Cartao className="p-5">
            <Subtitulo>Conferir</Subtitulo>
            <p className="mt-1 mb-4 text-[13.5px] leading-relaxed text-grafite">
              {c.pronto
                ? "Uma mensagem de verdade, pelo mesmo caminho dos boletins. É a única prova que vale."
                : "Assim que as variáveis estiverem cadastradas, este botão liga."}
            </p>
            <TesteDeEnvio meuEmail={pessoa.email} pronto={c.pronto} />
          </Cartao>
        </div>

        <div className="space-y-5">
          <Cartao className="p-5">
            <Subtitulo>O que precisa ser feito, uma vez só</Subtitulo>
            <ol className="mt-3 space-y-3.5 text-[14.5px] leading-relaxed text-grafite">
              <Passo numero={1} feito={false}>
                <b className="text-tinta">Um domínio do Centro.</b> Um endereço próprio, tipo
                <code className="mx-1">cej-usp.org</code>, por volta de R$ 50 por ano. É de onde os
                boletins vão sair. Não dá para mandar em massa como <code>@usp.br</code> sem que a
                TI da USP autorize — e o domínio próprio não depende de ninguém.
              </Passo>
              <Passo numero={2} feito={false}>
                <b className="text-tinta">Três registros de DNS.</b> O Resend mostra as três linhas;
                é copiar e colar onde o domínio foi registrado. São elas que fazem o Gmail aceitar
                o boletim em vez de mandá-lo para o spam.
              </Passo>
              <Passo numero={3} feito={c.chaveCadastrada}>
                <b className="text-tinta">A chave, na Vercel.</b> <code>RESEND_API_KEY</code>.
              </Passo>
              <Passo numero={4} feito={Boolean(c.remetente)}>
                <b className="text-tinta">De quem o e-mail vem.</b> <code>EMAIL_REMETENTE</code>,
                no formato <code>Centro de Estudos Judaicos &lt;boletim@cej-usp.org&gt;</code>.
              </Passo>
              <Passo numero={5} feito={Boolean(c.responderPara)}>
                <b className="text-tinta">Para onde vão as respostas.</b>{" "}
                <code>EMAIL_RESPONDER_PARA</code>, com o e-mail <code>@usp.br</code> do Centro —
                assim quem responder responde para a caixa de sempre.
              </Passo>
            </ol>

            <p className="mt-4 border-t border-linha pt-3.5 text-[13.5px] leading-relaxed text-grafite">
              O passo a passo com as telas de cada serviço está em{" "}
              <code>cej/docs/BOLETIM.md</code>, no repositório.
            </p>
          </Cartao>

          <Cartao className="p-5">
            <Sobrescrito>Se um dia a USP autorizar</Sobrescrito>
            <p className="mt-2 text-[14px] leading-relaxed text-grafite">
              Passar a mandar como <code>@usp.br</code> é trocar duas variáveis e publicar de novo.
              Nada mais muda: os links de descadastro que já foram para a caixa das pessoas
              continuam valendo, a base não é tocada, e o calendário no Google Agenda de cada um
              segue igual.
            </p>
          </Cartao>

          <p className="text-[13.5px] leading-relaxed text-fosco">
            {c.pronto ? (
              <>
                Mesmo com o envio ligado, dá para segmentar a base e{" "}
                <Link href="/contatos" className="text-realce hover:underline">
                  baixar a lista em planilha
                </Link>{" "}
                — para uma convocação que precise sair de outro lugar.
              </>
            ) : (
              <>
                Enquanto o envio não estiver ligado, dá para segmentar a base e{" "}
                <Link href="/contatos" className="text-realce hover:underline">
                  baixar a lista em planilha
                </Link>{" "}
                para mandar por onde vocês já mandam hoje.
              </>
            )}
          </p>
        </div>
      </div>
    </>
  );
}

function Linha({
  rotulo,
  ok,
  children,
}: {
  rotulo: string;
  ok: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-grafite">{rotulo}</dt>
      <dd className={`text-right ${ok ? "" : "text-ambar"}`}>
        {/* O sinal acompanha a cor: quem não distingue as duas continua lendo. */}
        <span aria-hidden className="mr-1.5">
          {ok ? "✓" : "—"}
        </span>
        {children}
      </dd>
    </div>
  );
}

function Passo({
  numero,
  feito,
  children,
}: {
  numero: number;
  feito: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        className={`mt-[1px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
          feito ? "bg-verde text-white" : "bg-linha text-grafite"
        }`}
      >
        {feito ? "✓" : numero}
      </span>
      <span>{children}</span>
    </li>
  );
}
