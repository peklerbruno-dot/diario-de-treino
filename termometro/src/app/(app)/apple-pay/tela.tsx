"use client";

import Link from "next/link";
import { Aviso, Sobrescrito, Titulo } from "@/componentes/pecas";
import { ParaCopiar, Palavra, Passo, useEndereco } from "../atalho/tela";

/**
 * Só o Apple Pay, e nada mais.
 *
 * A tela do atalho tem tudo — voz, toque na traseira, diagnóstico — e quem
 * chega querendo uma coisa só se perde nela. Esta é o caminho curto: copiar o
 * endereço, montar a automação, pagar uma compra pequena e ver o que aparece.
 * A categoria fica para depois, de propósito: antes de enfeitar, é preciso
 * saber se o banco manda o valor para o iPhone.
 */
export function TelaDoApplePay() {
  const endereco = useEndereco();

  return (
    <div className="pb-4">
      <Sobrescrito>Automatizar</Sobrescrito>
      <Titulo className="mt-0.5">Apple Pay</Titulo>

      <p className="mt-2 text-[15px] leading-relaxed text-grafite">
        Pagou com o Apple Pay, o valor entra sozinho no Diário, com o nome da loja. Montar leva uns
        três minutos e é uma vez só. Pede o iOS 17 ou mais novo.
      </p>

      <ol className="mt-5 space-y-2.5">
        <Passo n={1}>
          <b>Copie este endereço.</b> Termina em <Palavra>?valor=</Palavra> mesmo, sem nada depois.
          <ParaCopiar texto={endereco} />
        </Passo>

        <Passo n={2}>
          Abra o app <b>Atalhos</b> do iPhone. Na aba <b>Automação</b>, toque no <b>+</b> e escolha{" "}
          <b>Carteira</b> (em alguns iPhones se chama <b>Transação</b>). Marque o cartão que você usa
          no Apple Pay. Toque em <b>Seguinte</b> e em <b>Criar nova automação vazia</b>.
        </Passo>

        <Passo n={3}>
          Busque a ação <b>Obter conteúdo da URL</b> e monte assim:
          <span className="mt-2 block">
            <b>Endereço:</b> cole o que você copiou. Logo depois do <Palavra>=</Palavra>, escolha{" "}
            <b>Entrada do atalho</b> na barra de sugestões do teclado, toque na etiqueta azul que
            apareceu e escolha <b>Valor</b>.
          </span>
          <span className="mt-2 block">
            Depois escreva <Palavra>&amp;nota=</Palavra> e escolha <b>Entrada do atalho</b> de novo;
            toque na etiqueta e escolha o nome da loja (<b>Comerciante</b> ou <b>Estabelecimento</b>,
            conforme o iPhone). É ele que faz o app aprender a categoria.
          </span>
          <span className="mt-2 block">
            Toque em <b>Mostrar mais</b>. Em <b>Método</b>, troque para <Palavra>POST</Palavra>. Em{" "}
            <b>Cabeçalhos</b>, adicione um: a chave é <Palavra>x-codigo</Palavra> e, no texto ao
            lado, o seu código de acesso (o que você digita para entrar no app).
          </span>
        </Passo>

        <Passo n={4}>
          Acrescente a ação <b>Mostrar notificação</b> e, no texto dela, escolha{" "}
          <b>Conteúdo da URL</b>. É o que mostra se deu certo.
        </Passo>

        <Passo n={5}>
          Falta escolher como ela roda. Procure, <b>rolando a tela até o fim</b>, as opções{" "}
          <b>Executar imediatamente</b> e <b>Executar após confirmação</b> (ou <i>Perguntar antes de
          executar</i>), e marque <b>Executar imediatamente</b>. Ela fica ou na tela onde você
          escolhe as ações, ou na tela de resumo que aparece depois de tocar em{" "}
          <b>Seguinte</b>, conforme a versão do iOS. Toque em <b>OK</b>.
          <span className="mt-1.5 block text-[13.5px] text-fosco">
            Só achou “perguntar antes”? Funciona também: depois de pagar, o iPhone mostra uma
            notificação, e você toca nela para lançar.
          </span>
        </Passo>
      </ol>

      <section className="mt-6">
        <Aviso>
          <b>Teste com uma compra pequena.</b> Pague com o Apple Pay e veja o que o iPhone mostra:
          <span className="mt-2 block">
            • <i>“R$ … no diário. Saldo de hoje …”</i> — <b>funcionou.</b> O valor chegou e já está
            lançado.
          </span>
          <span className="mt-1.5 block">
            • <i>“Faltou o valor”</i> — o seu banco não manda o valor para o iPhone. Nada foi
            lançado; para esse cartão, o botão <b>Gastei</b> continua sendo o caminho.
          </span>
          <span className="mt-1.5 block">
            • <b>Nada aparece</b> — a automação não rodou. Em <b>Atalhos → Automação</b>, confira
            se ela está ligada.
          </span>
        </Aviso>
      </section>

      <section className="mt-6">
        <h2 className="text-[17px] font-semibold">A categoria vem sozinha</h2>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-fosco">
          Compra de uma loja nova entra sem categoria. Abra{" "}
          <Link href="/classificar" className="text-saldo underline">
            Classificar
          </Link>{" "}
          e escolha uma vez o que ela é (Uber → Transporte). Da próxima vez que você pagar ali, o
          lançamento já nasce com a categoria, e a notificação diz qual foi. Se mudar de ideia, o
          app segue a sua decisão mais recente.
        </p>
      </section>

      <p className="mt-5 text-[14px] leading-relaxed text-fosco">
        Funcionou e você quer escolher a categoria na hora? Está no{" "}
        <Link href="/atalho" className="text-saldo underline">
          guia completo do atalho
        </Link>
        , em <i>Depois do Apple Pay</i>.
      </p>
    </div>
  );
}
