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
        — e depois ninguém anota. Com o atalho, lançar o almoço é bater duas vezes na traseira do
        iPhone e digitar o valor.
      </p>

      <div className="mt-4">
        <Aviso tom="atencao">
          <b>O que isto não é.</b> O iPhone não deixa nenhum app ler os seus pagamentos por Apple
          Pay, nem as notificações do banco, nem o Pix que caiu. Essa porta é fechada pela Apple,
          igual para todo aplicativo de finanças — inclusive os grandes. O atalho não adivinha o
          valor: ele encurta a distância entre gastar e anotar.
        </Aviso>
      </div>

      <section className="mt-6">
        <Subtitulo className="mb-2">Antes de começar</Subtitulo>
        <Cartao className="px-4 py-4">
          <p className="text-[14.5px] text-grafite">
            <b className="text-tinta">1. O endereço</b>, que é este aqui:
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
            Na aba <b>Atalhos</b>, toque no <b>+</b> no canto de cima, à direita.
          </Passo>

          <Passo n={2}>
            Toque em <b>Adicionar ação</b> e busque por <b>Pedir entrada</b>. Em <i>Pergunta</i>,
            escreva <Palavra>Quanto?</Palavra>. Em <i>Tipo de entrada</i>, escolha <b>Número</b>.
          </Passo>

          <Passo n={3}>
            <b>Adicionar ação</b> de novo, agora buscando <b>Obter conteúdo da URL</b>. Esta é a
            ação que faz o trabalho — os quatro ajustes dela estão logo abaixo.
          </Passo>
        </ol>

        <Cartao className="mt-3 px-4 py-4">
          <Sobrescrito>Dentro de “Obter conteúdo da URL”</Sobrescrito>

          <div className="mt-3 space-y-4 text-[14.5px] leading-relaxed text-grafite">
            <div>
              <b className="text-tinta">No campo do endereço</b>, cole isto:
              <ParaCopiar texto={endereco} />
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
              <span className="mt-2 block">E no texto ao lado, o seu código de acesso.</span>
            </div>

            <div>
              <b className="text-tinta">Corpo da solicitação</b>: escolha <b>JSON</b>. Depois{" "}
              <b>Adicionar novo campo</b> → <b>Texto</b>, com a chave:
              <ParaCopiar texto="valor" />
              <span className="mt-2 block">
                No conteúdo desse campo, toque uma vez e escolha a variável{" "}
                <b className="text-tinta">Entrada fornecida</b> — ela aparece na barrinha de
                sugestões logo acima do teclado. Não digite um número aqui: é essa variável que
                carrega o que você vai digitar na hora.
              </span>
            </div>
          </div>
        </Cartao>

        <ol className="mt-3 space-y-2.5">
          <Passo n={4}>
            <b>Adicionar ação</b> → <b>Obter valor do dicionário</b>. Em <i>Obter</i>, deixe{" "}
            <b>Valor</b>; em <i>para</i>, escreva <Palavra>recado</Palavra>; em <i>em</i>, deve
            estar <b>Conteúdo da URL</b>.
          </Passo>

          <Passo n={5}>
            <b>Adicionar ação</b> → <b>Mostrar notificação</b>, e no corpo dela escolha a variável{" "}
            <b>Valor do dicionário</b>. É isto que faz o celular avisar{" "}
            <i>“R$ 38,50 no diário. Saldo de hoje: R$ 1.497,43.”</i> sem você abrir nada.
          </Passo>

          <Passo n={6}>
            Toque no nome do atalho, lá em cima, e chame de <b>Gastei</b>. Depois <b>OK</b> /{" "}
            <b>Concluído</b>.
          </Passo>

          <Passo n={7}>
            Na primeira vez que rodar, o iPhone pergunta se pode enviar dados para esse endereço.
            Toque em <b>Permitir</b> e, se oferecer, em <b>Sempre permitir</b>.
          </Passo>
        </ol>
      </section>

      <section className="mt-6">
        <Subtitulo className="mb-2">Como disparar</Subtitulo>
        <Cartao className="px-4 py-1">
          <Jeito titulo="Dois toques na traseira" destaque>
            Ajustes do iPhone → <b>Acessibilidade</b> → <b>Toque</b> → role até o fim →{" "}
            <b>Toque na parte traseira</b> → <b>Toque duplo</b> → escolha <b>Gastei</b>. É o mais
            rápido de todos, e o único que funciona com o celular ainda no bolso do outro.
          </Jeito>
          <Jeito titulo="Ícone na tela de início">
            No atalho, três pontinhos → botão de compartilhar → <b>Adicionar à Tela de Início</b>.
          </Jeito>
          <Jeito titulo="Siri">
            Diga <i>“E aí Siri, Gastei”</i>. O nome do atalho é a frase.
          </Jeito>
        </Cartao>
      </section>

      <section className="mt-6">
        <Subtitulo className="mb-2">Fazer mais de um</Subtitulo>
        <p className="mb-2 text-[14.5px] leading-relaxed text-grafite">
          Vale ter três, para não escolher o tipo toda vez. Duplique o atalho (três pontinhos →{" "}
          <b>Duplicar</b>) e acrescente um campo no JSON, com a chave <Palavra>tipo</Palavra>:
        </p>
        <Cartao className="px-4 py-1">
          <Jeito titulo="Gastei">nada a mudar — sem tipo, é gasto do dia a dia.</Jeito>
          <Jeito titulo="Recebi">
            texto <Palavra>entrada</Palavra>.
          </Jeito>
          <Jeito titulo="Paguei conta">
            texto <Palavra>saída</Palavra>.
          </Jeito>
        </Cartao>
        <p className="mt-2 px-1 text-[12.5px] leading-snug text-fosco">
          Outros campos, todos opcionais: <b>nota</b> (o que era o valor), <b>data</b> no formato
          2026-09-15 para lançar um dia que já passou, e <b>rendaPropria</b> com o texto <b>sim</b>{" "}
          numa entrada que é dinheiro seu. O valor aceita soma igual ao app: mandar 195+15+83 cria
          três lançamentos.
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
          <Jeito titulo="“Faltou o valor”">
            O campo do JSON precisa se chamar <Palavra>valor</Palavra>, e o conteúdo dele precisa
            ser a variável <b>Entrada fornecida</b> — não um número digitado.
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
function useEndereco(): string {
  const [endereco, setEndereco] = useState("");
  useEffect(() => setEndereco(`${window.location.origin}/api/lancar`), []);
  return endereco;
}

/** Um pedaço de texto que precisa ser copiado sem erro de digitação. */
function ParaCopiar({ texto }: { texto: string }) {
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
function Palavra({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-[6px] bg-papel px-1.5 py-[1px] text-[13.5px] text-tinta">
      {children}
    </code>
  );
}

function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-folha bg-cartao px-4 py-3 shadow-baixa">
      <span className="tabular mt-[1px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-heroi text-[12px] font-bold text-heroi-tinta">
        {n}
      </span>
      <span className="text-[14.5px] leading-relaxed text-grafite">{children}</span>
    </li>
  );
}

function Jeito({
  titulo,
  destaque,
  children,
}: {
  titulo: string;
  destaque?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-linha py-3 last:border-b-0">
      <p className="text-[14.5px] font-semibold">
        {titulo}
        {destaque && (
          <span className="ml-2 rounded-full bg-saldo px-[7px] py-[2px] align-[1px] text-[9.5px] font-bold uppercase tracking-wide text-white">
            o mais rápido
          </span>
        )}
      </p>
      <p className="mt-1 text-[14px] leading-relaxed text-grafite">{children}</p>
    </div>
  );
}
