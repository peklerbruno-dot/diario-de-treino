import { descadastrar, recadastrar } from "@/app/acoes-publicas";
import { bd } from "@/lib/bd";
import { PaginaPublica } from "@/componentes/publico";
import { Botao } from "@/componentes/pecas";

export const dynamic = "force-dynamic";

/**
 * Sair da lista.
 *
 * Um clique, sem login e sem pergunta. A tela abre já com o botão à mão e, se a
 * pessoa já saiu, diz isso e oferece voltar — porque o engano mais comum aqui é
 * clicar sem querer no link do rodapé.
 *
 * Nenhuma tela do sistema é mais importante para a entrega dos e-mails do que
 * esta: quem não acha como sair marca a mensagem como spam, e a marcação de
 * spam estraga a entrega de tudo o que o Centro mandar depois, para todo mundo.
 */
export default async function Descadastrar({ params }: { params: Promise<{ chave: string }> }) {
  const { chave } = await params;

  const contato = await bd.contato.findUnique({
    where: { chave },
    select: { nome: true, email: true, estado: true },
  });

  if (!contato) {
    return (
      <PaginaPublica>
        <h1 className="font-titulo text-[27px] font-semibold tracking-tight">Link não encontrado</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-grafite">
          Este endereço não corresponde a nenhum cadastro. Se você quer parar de receber os nossos
          e-mails, responda a qualquer mensagem do Centro pedindo — nós tiramos você da lista.
        </p>
      </PaginaPublica>
    );
  }

  if (contato.estado === "DESCADASTRADO") {
    return (
      <PaginaPublica>
        <h1 className="font-titulo text-[27px] font-semibold tracking-tight">Você saiu da lista</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-grafite">
          Não vamos mais mandar boletins para <b className="text-tinta">{contato.email}</b>.
        </p>
        <form action={recadastrar} className="mt-6">
          <input type="hidden" name="chave" value={chave} />
          <Botao>Clicou sem querer? Voltar para a lista</Botao>
        </form>
      </PaginaPublica>
    );
  }

  return (
    <PaginaPublica>
      <h1 className="font-titulo text-[27px] font-semibold tracking-tight">
        Não quer mais receber?
      </h1>
      <p className="mt-3 text-[16px] leading-relaxed text-grafite">
        Um clique e paramos de mandar boletins para <b className="text-tinta">{contato.email}</b>.
        Sem perguntas e sem formulário.
      </p>
      <form action={descadastrar} className="mt-6">
        <input type="hidden" name="chave" value={chave} />
        <Botao tipo="primario">Sair da lista</Botao>
      </form>
      <p className="mt-5 text-[13.5px] leading-relaxed text-fosco">
        Isso não apaga a sua inscrição em atividades que você já fez, nem o seu certificado. Só
        interrompe os boletins.
      </p>
    </PaginaPublica>
  );
}
