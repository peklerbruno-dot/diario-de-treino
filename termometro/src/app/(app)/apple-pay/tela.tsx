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
          <b>Carteira</b> (em alguns iPhones se chama <b>Transação</b>). Marque o cartão que você
          usa no Apple Pay. Toque em <b>Seguinte</b> e em <b>Criar nova automação vazia</b>.
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
            toque na etiqueta e escolha o nome da loja (<b>Comerciante</b> ou <b>Estabelecimento</b>
            , conforme o iPhone). É ele que faz o app aprender a categoria.
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
          <b>Executar imediatamente</b> e <b>Executar após confirmação</b> (ou{" "}
          <i>Perguntar antes de executar</i>), e marque <b>Executar imediatamente</b>. Ela fica ou
          na tela onde você escolhe as ações, ou na tela de resumo que aparece depois de tocar em{" "}
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
            • <b>Nada aparece</b> — a automação não rodou. Em <b>Atalhos → Automação</b>, confira se
            ela está ligada.
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

      <section className="mt-6">
        <h2 className="text-[17px] font-semibold">Crédito, débito e NuPay (pela notificação)</h2>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-fosco">
          O Apple Pay só avisa o que passa pelo Wallet. Compra no crédito sem o celular, débito e
          NuPay chegam pela <b>notificação do Nubank</b>, que traz o valor e a loja:{" "}
          <i>“Compra de R$ 17,00 em ACADEMIA CEMI”</i> ou{" "}
          <i>“R$ 53,58 no débito com NuPay APROVADO em KeetaBR.”</i> O app lê o valor e a loja do
          texto e decide sozinho o que é: compra vira gasto, “Recebemos sua transferência” vira
          entrada, e o resto (promoção, fatura) não é lançado. Se a notificação disser “crédito”, a
          compra vai para a{" "}
          <Link href="/fatura" className="text-saldo underline">
            fatura do cartão
          </Link>{" "}
          e não mexe no saldo de agora.
        </p>
        <ol className="mt-3 space-y-3">
          <Passo n={1}>
            Em <b>Atalhos → Automação → +</b>, escolha <b>Notificação</b>. Em <b>App</b>, marque o{" "}
            <b>Nubank</b>. Em <b>Adicionar Filtro</b>, escolha <b>Mensagem contém</b> e escreva{" "}
            <Palavra>R$</Palavra>. Marque <b>Executar imediatamente</b>.
          </Passo>
          <Passo n={2}>
            Ação <b>Obter conteúdo da URL</b>: endereço copiado acima, mas no fim, no lugar de{" "}
            <Palavra>valor=</Palavra>, escreva <Palavra>texto=</Palavra> e escolha a variável{" "}
            <b>Notificação</b>. Método <Palavra>POST</Palavra>, e o cabeçalho{" "}
            <Palavra>x-codigo</Palavra> com o seu código.
          </Passo>
          <Passo n={3}>
            Depois, <b>Obter valor do dicionário</b> (chave <Palavra>recado</Palavra>) e{" "}
            <b>Mostrar notificação</b> com esse valor.
          </Passo>
        </ol>
        <Aviso>
          <b>Já tem o atalho do Apple Pay para o cartão do Nubank?</b> Desligue-o: a notificação do
          Nubank também avisa as compras pelo Apple Pay, e os dois juntos lançariam a mesma compra
          duas vezes. Mantenha o do Apple Pay só para cartões de outros bancos.
        </Aviso>
        <p className="mt-3 text-[14px] leading-relaxed text-fosco">
          <b className="text-grafite">Salário que cai e já estava previsto</b> não duplica mais: o
          app confirma o previsto com o valor e o dia reais. E um gasto real num dia{" "}
          <b className="text-grafite">substitui</b> a previsão do diário daquele dia (os R$ 60), em
          vez de somar a ela.
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
