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
          no Apple Pay e ligue <b>Executar imediatamente</b>. Toque em <b>Seguinte</b> e em{" "}
          <b>Criar nova automação vazia</b>.
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
            toque na etiqueta e escolha <b>Estabelecimento</b>.
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
          Toque em <b>OK</b>. Pronto: a automação já está valendo.
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
            se ela está ligada e com <b>Executar imediatamente</b>.
          </span>
        </Aviso>
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
