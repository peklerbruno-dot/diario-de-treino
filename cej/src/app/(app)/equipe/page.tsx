import { alternarPessoa, cadastrarPessoa, gerarConvite, mudarPapel, trocarChaveDaAgenda } from "./acoes";
import { TrocarSenha } from "./senha";
import { exigirPessoa } from "@/lib/auth";
import { equipe as buscarEquipe } from "@/lib/consultas";
import { enderecoDoSistema } from "@/lib/endereco";
import { porBarras } from "@/lib/datas";
import { NOME_DO_PAPEL } from "@/lib/tipos";
import { Aviso, Botao, Cartao, Campo, Selecao, Selo, Sobrescrito, Subtitulo, Texto, Topo } from "@/componentes/pecas";

export const dynamic = "force-dynamic";

/**
 * A equipe.
 *
 * Quem é da coordenação cadastra, promove, desativa e gera links de primeiro
 * acesso. Quem é da equipe vê a lista e mexe na própria conta — que é
 * informação que todo mundo deveria ter à mão de qualquer jeito.
 */
export default async function Equipe({
  searchParams,
}: {
  searchParams: Promise<{ convite?: string; para?: string; erro?: string }>;
}) {
  const { convite, para, erro } = await searchParams;
  const [pessoa, lista, endereco] = await Promise.all([
    exigirPessoa(),
    buscarEquipe(true),
    enderecoDoSistema(),
  ]);

  const manda = pessoa.papel === "COORDENACAO";
  const convidada = convite && para ? lista.find((p) => p.id === para) : null;

  return (
    <>
      <Topo
        titulo="Equipe"
        chamada="Quem tem acesso ao sistema. Cada pessoa entra com o próprio e-mail — é o que faz um encaminhamento ter dono e uma ata ter autora."
      />

      {erro && (
        <div className="mb-5">
          <Aviso tom="erro">{erro}</Aviso>
        </div>
      )}

      {convidada && (
        <Cartao className="mb-5 p-5 ring-2 ring-verde/50">
          <Sobrescrito>Link de primeiro acesso de {convidada.nome}</Sobrescrito>
          <p className="mt-2 max-w-leitura text-[14.5px] leading-relaxed text-grafite">
            Mande este endereço para {convidada.nome.split(" ")[0]} por WhatsApp, e-mail ou como
            preferir. Ele vale por sete dias, serve uma vez só, e é lá que ela escolhe a própria
            senha. <b className="text-tinta">Copie agora</b> — esta é a única vez que ele aparece
            (depois é só gerar outro).
          </p>
          <p className="mt-3 break-all rounded-folha bg-papel px-3.5 py-2.5 font-mono text-[12.5px]">
            {`${endereco}/definir-senha?convite=${convite}`}
          </p>
        </Cartao>
      )}

      <div className="space-y-5">
        <Cartao como="section">
          <h2 className="sobrescrito border-b border-linha px-4 py-2.5">
            {lista.length} {lista.length === 1 ? "pessoa" : "pessoas"}
          </h2>
          <ul>
            {lista.map((p) => (
              <li
                key={p.id}
                className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-linha px-4 py-3 last:border-b-0 ${
                  p.ativa ? "" : "opacity-60"
                }`}
              >
                <div className="min-w-[200px] flex-1">
                  <p className="text-[15px] font-medium">
                    {p.nome}
                    {p.id === pessoa.id && <span className="ml-2 text-[12px] text-fosco">você</span>}
                  </p>
                  <p className="text-[13px] text-fosco">{p.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  {p.papel === "COORDENACAO" && <Selo cor="var(--tinta-azul)">Coordenação</Selo>}
                  {!p.ativa && <Selo cor="var(--fosco)">Desativada</Selo>}
                  {p.ativa && !p.senha && <Selo cor="var(--tinta-ambar)">Sem senha ainda</Selo>}
                </div>

                <p className="tabular w-[150px] text-right text-[12.5px] text-fosco">
                  {p.ultimoAcesso ? `entrou em ${porBarras(p.ultimoAcesso.toISOString().slice(0, 10))}` : "nunca entrou"}
                </p>

                {manda && (
                  <div className="nao-imprime flex flex-wrap items-center gap-1.5">
                    <form action={gerarConvite}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="rounded-pilula bg-papel px-3 py-1.5 text-[12.5px] text-grafite hover:bg-linha">
                        {p.senha ? "Link para nova senha" : "Gerar link de acesso"}
                      </button>
                    </form>

                    <form action={mudarPapel}>
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        type="hidden"
                        name="papel"
                        value={p.papel === "COORDENACAO" ? "MEMBRO" : "COORDENACAO"}
                      />
                      <button className="rounded-pilula bg-papel px-3 py-1.5 text-[12.5px] text-grafite hover:bg-linha">
                        {p.papel === "COORDENACAO" ? "Tirar da coordenação" : "Pôr na coordenação"}
                      </button>
                    </form>

                    <form action={alternarPessoa}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="rounded-pilula bg-papel px-3 py-1.5 text-[12.5px] text-grafite hover:bg-linha">
                        {p.ativa ? "Desativar" : "Reativar"}
                      </button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Cartao>

        {manda && (
          <Cartao como="section">
            <div className="border-b border-linha px-4 py-3">
              <Subtitulo>Cadastrar alguém</Subtitulo>
              <p className="mt-0.5 max-w-leitura text-[13.5px] leading-relaxed text-grafite">
                A conta nasce sem senha. Você recebe um link de primeiro acesso para mandar à
                pessoa, e é ela quem escolhe a senha — você nunca precisa saber nenhuma.
              </p>
            </div>
            <form action={cadastrarPessoa} className="grid gap-4 p-4 sm:grid-cols-[2fr_2fr_1fr_auto] sm:items-end">
              <Campo rotulo="Nome">
                <Texto nome="nome" obrigatorio />
              </Campo>
              <Campo rotulo="E-mail">
                <Texto nome="email" tipo="email" obrigatorio />
              </Campo>
              <Campo rotulo="Papel">
                <Selecao
                  nome="papel"
                  valor="MEMBRO"
                  opcoes={[
                    { valor: "MEMBRO", rotulo: NOME_DO_PAPEL.MEMBRO },
                    { valor: "COORDENACAO", rotulo: NOME_DO_PAPEL.COORDENACAO },
                  ]}
                />
              </Campo>
              <div className="pb-[2px]">
                <Botao tipo="primario">Cadastrar</Botao>
              </div>
            </form>
          </Cartao>
        )}

        <Cartao como="section">
          <div className="border-b border-linha px-4 py-3">
            <Subtitulo>A sua conta</Subtitulo>
          </div>
          <TrocarSenha />

          <div className="border-t border-linha px-4 py-4">
            <Sobrescrito>A sua chave de calendário</Sobrescrito>
            <p className="mt-1.5 max-w-leitura text-[13.5px] leading-relaxed text-grafite">
              É o endereço secreto que leva a agenda do Centro para dentro do seu Google Agenda —
              ele fica no rodapé da tela Calendário. Se ele foi parar onde não devia, troque a
              chave: o endereço antigo deixa de funcionar na hora, e você assina de novo com o novo.
            </p>
            <form action={trocarChaveDaAgenda} className="mt-3">
              <input type="hidden" name="id" value={pessoa.id} />
              <Botao>Trocar a minha chave</Botao>
            </form>
          </div>
        </Cartao>
      </div>
    </>
  );
}
