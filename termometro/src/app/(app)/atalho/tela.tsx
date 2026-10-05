"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Aviso, Botao, Cartao, Sobrescrito, Subtitulo, Titulo } from "@/componentes/pecas";

/**
 * O passo a passo de montar o atalho, dentro do próprio app.
 *
 * Ele existia só num arquivo do repositório — o que é o mesmo que não existir
 * para quem nunca vai abrir o GitHub. Aqui o endereço já vem preenchido, cada
 * palavra que precisa ser digitada com exatidão tem botão de copiar, e a tela
 * se abre no aparelho em que o atalho vai ser montado.
 */
export function TelaDoAtalho() {
  const endereco = useEndereco();

  return (
    <div className="pb-4">
      <Sobrescrito>Automatizar</Sobrescrito>
      <Titulo className="mt-0.5">Atalho do iPhone</Titulo>

      <p className="mt-2 text-[15px] leading-relaxed text-grafite">
        O problema nunca foi o app estar longe. É que quinze segundos bastam para deixar para depois
        — e depois ninguém anota. Com o atalho, lançar o almoço é dizer{" "}
        <i>“E aí Siri, Lançar gasto”</i> e falar o valor, sem tirar o celular do bolso.
      </p>

      <Link
        href="/apple-pay"
        className="mt-4 flex items-center justify-between gap-3 rounded-folha bg-cartao px-4 py-3 shadow-baixa"
      >
        <span>
          <span className="block text-[16px] font-semibold">Quer lançar sozinho pelo Apple Pay?</span>
          <span className="block text-[13.5px] text-grafite">Um passo a passo curto, só para isso.</span>
        </span>
        <span aria-hidden className="text-[20px] text-fosco">
          ›
        </span>
      </Link>

      <div className="mt-4">
        <Aviso tom="atencao">
          <b>O que o app não faz sozinho.</b> O iPhone não deixa nenhum aplicativo ler os seus
          pagamentos, as notificações do banco ou o Pix que caiu: essa porta é fechada pela Apple,
          igual para todo app de finanças. Mas o app <b>Atalhos</b>, que é da própria Apple, pode
          rodar um atalho logo depois de cada pagamento por Apple Pay — com o valor e o
          estabelecimento na mão. É por essa porta que dá para o app perguntar a categoria na hora:
          veja <b>Depois do Apple Pay</b>, mais abaixo. O atalho não adivinha o que você comprou: ele
          encurta a distância entre gastar e anotar.
        </Aviso>
      </div>

      <section className="mt-6">
        <Subtitulo className="mb-2">Antes de começar</Subtitulo>
        <Cartao className="px-4 py-4">
          <p className="text-[14.5px] text-grafite">
            <b className="text-tinta">1. O endereço</b>, que é este aqui — e ele termina em{" "}
            <Palavra>?valor=</Palavra> mesmo, sem nada depois do igual:
          </p>
          <ParaCopiar texto={endereco} />
          <p className="mt-4 text-[14.5px] leading-relaxed text-grafite">
            <b className="text-tinta">2. O seu código de acesso</b> — o mesmo que você digita para
            entrar no app. Ele não aparece nesta tela de propósito: é a chave do seu dinheiro, e
            tela é coisa que se mostra sem querer.
          </p>
        </Cartao>
      </section>

      <section className="mt-6">
        <Subtitulo className="mb-2">Montar o atalho</Subtitulo>
        <p className="mb-3 text-[14px] leading-relaxed text-fosco">
          No iPhone, abra o app <b className="text-grafite">Atalhos</b>. Vem instalado; se você
          apagou, está de graça na App Store.
        </p>

        <ol className="space-y-2.5">
          <Passo n={1}>
            Na aba <b>Atalhos</b>, toque no <b>+</b> no canto de cima, à direita. As ações se
            acrescentam pela barra <b>Buscar</b>, no rodapé da tela.
          </Passo>

          <Passo n={2}>
            Busque por <b>Pedir entrada</b>. O cartão nasce escrito{" "}
            <i>
              “Pedir <b>Texto</b> com <b>Texto</b>”
            </i>{" "}
            — são duas palavras iguais que fazem coisas diferentes, e é aí que confunde.
            <span className="mt-1.5 block">
              Toque no <b>segundo</b> “Texto”, o mais clarinho, depois da palavra <i>com</i>: é a
              pergunta. Escreva <Palavra>Quanto?</Palavra>. Depois toque no <b>primeiro</b>, o azul
              forte: é o tipo. Escolha <b>Número</b>.
            </span>
          </Passo>

          <Passo n={3}>
            Busque por <b>Pedir entrada</b> <b>de novo</b>. Neste segundo, a pergunta é{" "}
            <Palavra>Qual categoria?</Palavra> e o tipo fica em <b>Texto</b> — você vai falar uma
            palavra, não um número.
            <span className="mt-1.5 block">
              Não precisa acertar o nome exato: “mercado”, “conta de luz”, “saude” sem acento — o
              app acha a categoria mais parecida e diz na notificação qual escolheu.
            </span>
          </Passo>

          <Passo n={4}>
            Busque por <b>Obter conteúdo da URL</b>. Esta é a ação que faz o trabalho — os ajustes
            dela estão logo abaixo.
          </Passo>
        </ol>

        <Cartao className="mt-3 px-4 py-4">
          <Sobrescrito>Dentro de “Obter conteúdo da URL”</Sobrescrito>

          <div className="mt-3 space-y-4 text-[14.5px] leading-relaxed text-grafite">
            <div>
              <b className="text-tinta">No campo do endereço</b>, cole isto:
              <ParaCopiar texto={endereco} />
              <span className="mt-2 block">
                Depois, <b className="text-tinta">sem sair do campo</b>, toque logo depois do sinal
                de igual e escolha a variável <b className="text-tinta">Entrada fornecida</b> — ela
                aparece na barrinha de sugestões acima do teclado, e vira uma etiqueta azul grudada
                no fim. É ela que carrega o valor; não digite um número aqui.
              </span>
              <span className="mt-2 block">
                Ainda no mesmo campo, <b className="text-tinta">depois da etiqueta</b>, escreva{" "}
                <Palavra>&amp;categoria=</Palavra> e escolha a segunda{" "}
                <b className="text-tinta">Entrada fornecida</b> — a do passo 3. Vão ficar{" "}
                <b>duas etiquetas azuis</b>, e a barrinha de sugestões mostra as duas; a segunda é a
                da categoria.
              </span>
              <span className="mt-2 block text-[13.5px] text-fosco">
                No fim o campo lê: <span className="tabular">…/api/lancar?valor=</span>
                <span className="rounded bg-saldo/15 px-1 text-saldo">valor</span>
                <span className="tabular">&amp;categoria=</span>
                <span className="rounded bg-saldo/15 px-1 text-saldo">categoria</span>
              </span>
            </div>

            <div>
              <b className="text-tinta">Toque em “Mostrar mais”</b> (ou no <b>›</b> ao lado do
              endereço) para abrir o resto das opções. Elas ficam escondidas, e é por isso que quase
              todo mundo trava aqui.
            </div>

            <div>
              <b className="text-tinta">Método</b>: troque de <Palavra>GET</Palavra> para{" "}
              <Palavra>POST</Palavra>. Esse é o erro mais comum — o padrão vem errado para o que a
              gente precisa.
            </div>

            <div>
              <b className="text-tinta">Cabeçalhos</b> → <b>Adicionar novo cabeçalho</b>. A chave se
              escreve exatamente assim, tudo em minúsculo:
              <ParaCopiar texto="x-codigo" />
              <span className="mt-2 block">
                E no texto ao lado, o seu código de acesso. É a única coisa que vai no cabeçalho, e
                não no endereço: endereço fica gravado em registro de servidor, e o código é a chave
                do seu dinheiro.
              </span>
            </div>

            <div className="text-[13.5px] text-fosco">
              <b>Corpo da solicitação</b> pode ficar em <b>Nenhum</b>. Ele não é mais usado — o
              valor vai no endereço agora, e era montar esse corpo que fazia o atalho ter o dobro de
              ajustes.
            </div>
          </div>
        </Cartao>

        <ol className="mt-3 space-y-2.5">
          <Passo n={5}>
            Busque por <b>Obter valor do dicionário</b>. O cartão vem escrito{" "}
            <i>
              “Obter <b>Valor</b> para <b>chave</b> em <b>Dicionário</b>”
            </i>
            . Toque em <i>chave</i> e escreva <Palavra>recado</Palavra>; o resto já vem certo, e em{" "}
            <i>Dicionário</i> ele preenche <b>Conteúdo da URL</b> sozinho.
          </Passo>

          <Passo n={6}>
            Busque por <b>Mostrar notificação</b>. O cartão vem com um texto de exemplo —{" "}
            <b>apague esse texto</b> e escolha, na barrinha de sugestões, a variável{" "}
            <b>Valor do Dicionário</b>. É isto que faz o celular avisar{" "}
            <i>“R$ 38,50 no diário. Saldo de hoje: R$ 1.497,43.”</i> sem você abrir nada.
          </Passo>

          <Passo n={7}>
            O iPhone batiza o atalho sozinho, com o nome da primeira ação — costuma ficar{" "}
            <i>“Pedir Entrada”</i>. Toque nesse nome lá em cima, na setinha <b>⌄</b> ao lado,
            escolha <b>Renomear</b> e chame de <b>Lançar gasto</b>. Este é o passo mais importante
            para quem vai usar a voz: <b>o nome é a frase que a Siri escuta</b>.
            <br />
            <span className="mt-1.5 block">
              Duas palavras, e nenhuma delas um comando que o iPhone já conhece — é essa a regra que
              faz a Siri achar. Um nome de uma palavra só, ainda mais sendo verbo comum (“Gastei”,
              “Paguei”, “Anotar”), ela ouve como o começo de uma frase e sai procurando na internet,
              em vez de rodar o atalho.
            </span>
          </Passo>

          <Passo n={8}>
            <b>Teste antes de chamar a Siri</b>, que é mais fácil de consertar se algo estiver
            torto: toque no <b>▶</b> no rodapé do editor e digite <Palavra>1</Palavra> quando ele
            perguntar. Na primeira vez o iPhone pergunta se pode enviar dados para esse endereço —
            toque em <b>Permitir</b> e, se oferecer, em <b>Sempre permitir</b>.
            <span className="mt-1.5 block">
              Tem de aparecer a notificação <i>“R$ 1,00 no diário. Saldo de hoje: …”</i>. Esse real
              de teste some em dois toques: no app, aba <b>Hoje</b>, toque no lançamento e apague.
            </span>
          </Passo>
        </ol>
      </section>

      <section className="mt-6">
        <Subtitulo className="mb-2">Depois do Apple Pay</Subtitulo>
        <p className="mb-3 text-[14px] leading-relaxed text-fosco">
          Você paga, e o iPhone já abre a pergunta: <i>“Qual foi o gasto?”</i>. Um toque na categoria
          e o valor que você acabou de pagar entra no Diário — sem digitar número nenhum. Usa o
          atalho de cima como base, com a mesma chamada ao app. Pede o iOS 17 ou mais novo.
        </p>

        <ol className="space-y-2.5">
          <Passo n={1}>
            No app <b>Atalhos</b>, abra a aba <b>Automação</b>, toque no <b>+</b> e escolha{" "}
            <b>Carteira</b> (em alguns iPhones aparece como <b>Transação</b>). Marque os cartões que
            você usa no Apple Pay — ou deixe todos. Toque em <b>Seguinte</b> e depois em{" "}
            <b>Criar nova automação vazia</b>. A opção <b>Executar imediatamente</b> fica no fim da
            tela (ou na tela de resumo, depois de <b>Seguinte</b>): role até achar.
          </Passo>

          <Passo n={2}>
            Busque por <b>Lista</b> e escreva nela as suas categorias, uma por item:{" "}
            <Palavra>Mercado</Palavra>, <Palavra>Comida</Palavra>, <Palavra>Transporte</Palavra>,{" "}
            <Palavra>Lazer</Palavra>… Não precisa acertar o nome exato; o app acha a mais parecida.
            Depois busque por <b>Escolher da lista</b>. Ela aparece sozinha escolhendo os itens da
            lista de cima.
          </Passo>

          <Passo n={3}>
            Busque por <b>Obter conteúdo da URL</b>. No endereço, cole o mesmo de antes:
            <ParaCopiar texto={endereco} />
            <span className="mt-2 block">
              Depois do <Palavra>=</Palavra>, toque na barrinha de sugestões e escolha{" "}
              <b>Entrada do atalho</b>. Toque na etiqueta azul que nasceu e escolha a propriedade{" "}
              <b>Valor</b> (em inglês, <i>Amount</i>): é o valor do pagamento.
            </span>
            <span className="mt-2 block">
              Em seguida escreva <Palavra>&amp;categoria=</Palavra> e escolha a variável{" "}
              <b>Item escolhido</b>. Por fim, <Palavra>&amp;nota=</Palavra> e a propriedade{" "}
              <b>Estabelecimento</b> (<i>Merchant</i>) da <b>Entrada do atalho</b> — assim o nome da
              loja fica anotado no lançamento.
            </span>
          </Passo>

          <Passo n={4}>
            Ainda em <b>Obter conteúdo da URL</b>, toque em <b>Mostrar mais</b>:{" "}
            <b>Método POST</b> e um cabeçalho com a chave <Palavra>x-codigo</Palavra> e, no texto ao
            lado, o seu código de acesso. É exatamente o que você fez no atalho de cima.
          </Passo>

          <Passo n={5}>
            Acrescente <b>Obter valor do dicionário</b> (chave <Palavra>recado</Palavra>) e{" "}
            <b>Mostrar notificação</b> com esse valor, como nos passos 5 e 6 de cima. Toque em{" "}
            <b>OK</b> para guardar a automação.
          </Passo>
        </ol>

        <div className="mt-3">
          <Aviso>
            <b>Teste com uma compra pequena</b> — não tem como testar no botão ▶, porque o valor só
            existe quando o pagamento acontece de verdade. Depois de pagar, o iPhone mostra a lista de
            categorias (se estiver bloqueado, toque na notificação que aparece).
            <span className="mt-2 block">
              <b>Três cuidados.</b> Primeiro: os bancos brasileiros nem sempre mandam o valor para o
              iPhone nessa automação. Se o valor vier vazio, o app responde <i>“Faltou o valor”</i> e
              não lança nada — nada se perde nem se duplica, mas aí esse cartão não serve para isto, e
              o botão <b>Gastei</b> continua valendo. Segundo: a Apple tem relatos de essa automação
              demorar ou falhar às vezes; trate-a como um ajudante, não como garantia. Terceiro: só
              pagamento por <b>Apple Pay</b> dispara; Pix e cartão de plástico não.
            </span>
          </Aviso>
        </div>
      </section>

      <section className="mt-6">
        <Subtitulo className="mb-2">Falando com a Siri</Subtitulo>
        <p className="mb-3 text-[14.5px] leading-relaxed text-grafite">
          Não precisa configurar nada a mais: todo atalho já vira comando de voz sozinho, com o
          próprio nome. A conversa é esta, e são três tempos.
        </p>

        <Cartao className="px-4 py-4">
          <Fala quem="você">E aí Siri, Lançar gasto</Fala>
          <Fala quem="siri">Quanto?</Fala>
          <Fala quem="você">trinta e nove</Fala>
          <Fala quem="siri">Qual categoria?</Fala>
          <Fala quem="você">mercado</Fala>
          <Fala quem="siri">R$ 39 no diário em Mercado. Saldo de hoje: R$ 1.497.</Fala>
        </Cartao>

        <p className="mt-3 text-[14px] leading-relaxed text-grafite">
          As perguntas <i>“Quanto?”</i> e <i>“Qual categoria?”</i> são os passos 2 e 3 do atalho:
          quando ele roda pela voz, a Siri fala cada pergunta e escuta a resposta. E a última frase
          é a confirmação — ela diz o valor, a categoria e o saldo que sobrou — é assim que um
          “farmácia” ouvido como “farmássia” aparece na hora, em vez de virar um total errado que só
          se descobre no fim do mês.
        </p>

        <div className="mt-3">
          <Aviso>
            <b>Nos iPhones mais novos</b> basta dizer <i>“Siri, Lançar gasto”</i>, sem o “E aí”. Se
            ela não responder ao chamado, veja em Ajustes do iPhone → <b>Siri</b> se a escuta por
            voz está ligada.
          </Aviso>
        </div>
      </section>

      <section className="mt-6">
        <Subtitulo className="mb-2">Perguntar sem lançar nada</Subtitulo>
        <Cartao className="px-4 py-1">
          <Jeito titulo="“E aí Siri, como estou de dinheiro?”">
            Um quarto atalho, mais simples que os outros: só uma ação <b>Obter Conteúdo de URL</b>{" "}
            com o método <b>GET</b>, o endereço{" "}
            <code>{endereco.replace("/api/lancar?valor=", "/api/saldo")}</code>, e o mesmo cabeçalho{" "}
            <code>x-codigo</code>. Depois, <b>Mostrar Notificação</b> com o campo{" "}
            <code>recado</code>. A resposta é uma frase: quanto você tem, em quanto o mês fecha se
            nada mudar, e quanto dá por dia até lá.
          </Jeito>
        </Cartao>
      </section>

      <section className="mt-6">
        <Subtitulo className="mb-2">Se a Siri não achar o atalho</Subtitulo>
        <p className="mb-3 text-[14.5px] leading-relaxed text-grafite">
          Ela procurou na internet, disse que não conhece, ou fez outra coisa. Antes de mexer em
          qualquer ajuste, faça este teste — ele parte o problema no meio:
        </p>

        <Cartao className="px-5 py-4">
          <Sobrescrito>O teste dos cinco segundos</Sobrescrito>
          <p className="mt-1.5 text-[15px] leading-relaxed">
            <b>Segure o botão lateral</b> do iPhone até a Siri aparecer, e diga só o nome do atalho
            — sem “E aí Siri” na frente.
          </p>
        </Cartao>

        <ol className="mt-3 space-y-2.5">
          <Ramo resposta="Funcionou assim">
            O atalho está certo; o que não está chegando é o chamado por voz. Vá em Ajustes do
            iPhone → <b>Siri</b> e ligue <b>“Escutar ‘E aí Siri’”</b> (ou “Ouvir ‘Siri’ ou ‘E aí
            Siri’”, conforme a versão). Enquanto isso, o botão lateral já resolve.
          </Ramo>
          <Ramo resposta="Também não funcionou">
            O problema é o <b>nome</b>. Abra o atalho, toque no nome lá em cima e troque para{" "}
            <b>Lançar gasto</b> — duas palavras, nenhuma delas um comando que o iPhone já conhece.
            Nome de uma palavra só, ainda mais sendo verbo comum (“Gastei”, “Paguei”, “Anotar”), a
            Siri ouve como o começo de uma frase e sai procurando na internet. O nome novo vira a
            frase nova, na hora, sem configurar mais nada.
          </Ramo>
          <Ramo resposta="Ela nem abriu">
            Veja em Ajustes do iPhone → <b>Siri</b> se o <b>Idioma</b> está em{" "}
            <b>Português (Brasil)</b>. Com a Siri em inglês, nome em português ela não reconhece.
          </Ramo>
        </ol>

        <p className="mt-3 px-1 text-[12.5px] leading-snug text-fosco">
          Ainda assim nada? Confira se o atalho está mesmo salvo: ele tem de aparecer na lista da
          aba <b>Atalhos</b>, não só na tela de edição. E, se você deu <b>Duplicar</b>, o iPhone
          costuma acrescentar um “2” no fim do nome — aí a frase mudou sem você notar.
        </p>
      </section>

      <section className="mt-6">
        <Subtitulo className="mb-2">Para ela entender o valor</Subtitulo>
        <Cartao className="px-4 py-1">
          <Jeito titulo="Diga o número, e só ele">
            As formas mais seguras são <i>“trinta e oito reais e cinquenta centavos”</i> e{" "}
            <i>“trinta e oito vírgula cinquenta”</i>. Valor redondo, sem centavos, pode ser só{" "}
            <i>“trinta e oito”</i>. Se a Siri entender alguma coisa com duas leituras possíveis, o
            app <b>recusa e explica</b>, em vez de chutar e colocar dinheiro errado no seu saldo — e
            de todo jeito a confirmação no fim lê o valor de volta, então o erro aparece na hora.
          </Jeito>
          <Jeito titulo="A categoria não precisa ser o nome exato">
            “mercado”, “conta de luz”, “saude” sem acento — o app acha a mais parecida e diz na
            notificação qual escolheu. Se não achar nenhuma, <b>o valor entra mesmo assim</b>, sem
            categoria, e a notificação avisa: perder o gasto porque a Siri ouviu errado desfaria
            justamente o que o atalho veio resolver.
          </Jeito>
          <Jeito titulo="Se ela escrever o número errado">
            Confira o <i>Tipo de entrada</i> do passo 2: precisa estar em <b>Número</b>. Em{" "}
            <b>Texto</b> a Siri manda a frase inteira, e a chance de confusão é maior.
          </Jeito>

          <Jeito titulo="Para ela dizer o saldo em voz alta">
            Acrescente no fim do atalho a ação <b>Falar texto</b>, com a variável{" "}
            <b>Valor do dicionário</b> — a mesma do passo 5. Aí dá para lançar de mãos ocupadas, sem
            olhar a tela. Só lembre que ela vai dizer o seu saldo em voz alta, onde você estiver.
          </Jeito>
        </Cartao>
      </section>

      <section className="mt-6">
        <Subtitulo className="mb-2">Sem falar, quando não dá</Subtitulo>
        <Cartao className="px-4 py-1">
          <Jeito titulo="Dois toques na traseira">
            Ajustes do iPhone → <b>Acessibilidade</b> → <b>Toque</b> → role até o fim →{" "}
            <b>Toque na parte traseira</b> → <b>Toque duplo</b> → escolha <b>Lançar gasto</b>. Para
            reunião, cinema, fila.
          </Jeito>
          <Jeito titulo="Ícone na tela de início">
            No atalho, três pontinhos → botão de compartilhar → <b>Adicionar à Tela de Início</b>.
          </Jeito>
        </Cartao>
        <p className="mt-2 px-1 text-[12.5px] leading-snug text-fosco">
          Os três jeitos disparam o mesmo atalho. Ligar um não desliga os outros.
        </p>
      </section>

      <section className="mt-6">
        <Subtitulo className="mb-2">Fazer mais de um</Subtitulo>
        <p className="mb-2 text-[14.5px] leading-relaxed text-grafite">
          Um para cada coluna, para não ter de dizer o tipo toda vez. Duplique o atalho (três
          pontinhos → <b>Duplicar</b>), mude o nome e acrescente um pedaço ao <b>fim</b> do
          endereço, depois da segunda etiqueta:
        </p>
        <Cartao className="px-4 py-1">
          <Jeito titulo="“E aí Siri, Lançar gasto”">
            nada a mudar — sem tipo, é o gasto do dia a dia, que é a maioria.
          </Jeito>
          <Jeito titulo="“E aí Siri, Lançar saída”">
            acrescente <Palavra>&amp;tipo=saida</Palavra> no fim. É a conta grande e prevista:
            fatura, aluguel, parcela.
          </Jeito>
          <Jeito titulo="“E aí Siri, Lançar entrada”">
            acrescente <Palavra>&amp;tipo=entrada</Palavra> no fim.
          </Jeito>
        </Cartao>
        <p className="mt-2 px-1 text-[12.5px] leading-snug text-fosco">
          Do mesmo jeito, no fim do endereço: <Palavra>&amp;nota=almoço</Palavra> para nomear o
          lançamento, <Palavra>&amp;data=2026-09-15</Palavra> para um dia que já passou, e{" "}
          <Palavra>&amp;rendaPropria=sim</Palavra> numa entrada que é dinheiro seu. O valor aceita
          soma igual ao app: 195+15+83 cria três lançamentos.
        </p>
      </section>

      <section className="mt-6">
        <Subtitulo className="mb-2">Se der errado</Subtitulo>
        <Cartao className="px-4 py-1">
          <Jeito titulo="“Não foi possível conectar”, ou nada acontece">
            O <b>Método</b> ficou em GET. Precisa ser <b>POST</b>.
          </Jeito>
          <Jeito titulo="“Código de acesso inválido”">
            O cabeçalho precisa se chamar <Palavra>x-codigo</Palavra>, tudo minúsculo, e o texto
            precisa ser o mesmo código com que você entra no app.
          </Jeito>
          <Jeito titulo="“Não entendi o valor”">
            A Siri ouviu uma forma com mais de uma leitura possível. Repita dizendo{" "}
            <i>“trinta e oito reais e cinquenta centavos”</i>, ou confira se o{" "}
            <i>Tipo de entrada</i> do passo 2 está em <b>Número</b>. O app prefere recusar a
            adivinhar: valor errado no saldo é bem pior do que uma pergunta repetida.
          </Jeito>
          <Jeito titulo="“Faltou o valor”">
            A variável <b>Entrada fornecida</b> não ficou colada no fim do endereço. Toque no campo
            do endereço e confira: depois do <Palavra>?valor=</Palavra> tem de haver uma etiqueta
            azul, e não um espaço vazio nem um número digitado à mão.
          </Jeito>
          <Jeito titulo="Lançou, mas não aparece no app">
            Aparece na próxima sincronização: abra o app e espere um instante. Para forçar,{" "}
            <b>Ajustes → Sincronizar agora</b>.
          </Jeito>
          <Jeito titulo="Lancei o valor errado">
            Abra o app, toque no dia, toque no lançamento e corrija ou apague. O atalho é só uma
            porta de entrada; quem manda continua sendo você.
          </Jeito>
        </Cartao>
      </section>

      <div className="mt-6">
        <Link
          href="/ajustes"
          className="inline-flex min-h-[46px] items-center rounded-folha bg-cartao px-4 text-[16px] shadow-baixa"
        >
          Voltar para Ajustes
        </Link>
      </div>
    </div>
  );
}

/**
 * O endereço é montado a partir de onde o app está sendo servido, e não escrito
 * à mão: continua certo se um dia o endereço do site mudar.
 */
export function useEndereco(): string {
  const [endereco, setEndereco] = useState("");
  useEffect(() => setEndereco(`${window.location.origin}/api/lancar?valor=`), []);
  return endereco;
}

/** Um pedaço de texto que precisa ser copiado sem erro de digitação. */
export function ParaCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem permissão para a área de transferência: o texto está à vista e o
      // "select-all" faz um toque selecionar tudo.
    }
  }

  return (
    <div className="mt-1.5 flex items-center gap-2">
      <code className="tabular min-w-0 flex-1 select-all break-all rounded-folha bg-papel px-3 py-2 text-[13.5px] text-tinta">
        {texto || "…"}
      </code>
      <Botao onClick={copiar} className="shrink-0 !min-h-[38px] !px-3 !text-[14px]">
        {copiado ? "Copiado" : "Copiar"}
      </Botao>
    </div>
  );
}

/** Uma palavra que precisa ser digitada exatamente assim. */
export function Palavra({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-[6px] bg-papel px-1.5 py-[1px] text-[13.5px] text-tinta">
      {children}
    </code>
  );
}

export function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-folha bg-cartao px-4 py-3 shadow-baixa">
      <span className="tabular mt-[1px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-heroi text-[12px] font-bold text-heroi-tinta">
        {n}
      </span>
      <span className="text-[14.5px] leading-relaxed text-grafite">{children}</span>
    </li>
  );
}

/** Uma linha do diálogo com a Siri, para a conversa caber na cabeça de uma vez. */
function Fala({ quem, children }: { quem: "você" | "siri"; children: React.ReactNode }) {
  const seu = quem === "você";
  return (
    <p className={`flex gap-2 py-1.5 ${seu ? "" : "pl-5"}`}>
      <span className={`sobrescrito mt-[3px] w-[34px] shrink-0 ${seu ? "" : "!text-saldo"}`}>
        {seu ? "você" : "Siri"}
      </span>
      <span className={`text-[14.5px] leading-snug ${seu ? "font-medium" : "text-grafite"}`}>
        {children}
      </span>
    </p>
  );
}

/** Um ramo do diagnóstico: a resposta que o teste deu, e o que fazer com ela. */
function Ramo({ resposta, children }: { resposta: string; children: React.ReactNode }) {
  return (
    <li className="rounded-folha bg-cartao px-4 py-3 shadow-baixa">
      <p className="text-[14.5px] font-semibold">{resposta}</p>
      <p className="mt-1 text-[14px] leading-relaxed text-grafite">{children}</p>
    </li>
  );
}

function Jeito({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-linha py-3 last:border-b-0">
      <p className="text-[14.5px] font-semibold">{titulo}</p>
      <p className="mt-1 text-[14px] leading-relaxed text-grafite">{children}</p>
    </div>
  );
}
