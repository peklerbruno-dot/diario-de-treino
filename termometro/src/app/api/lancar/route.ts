import { NextResponse } from "next/server";
import { usuarioDoPedido } from "@/lib/auth";
import { bd } from "@/lib/bd";
import { camposDoEndereco, hojeNoFuso, lerPedidoDoAtalho, recadoDoAtalho } from "@/lib/atalho";
import { categoriaDaLoja } from "@/lib/categoria-da-loja";
import { confirmadoCom, janelaDeBusca, previstoParaConfirmar } from "@/lib/conciliar";
import { CHAVE_DAS_CATEGORIAS, lerCategorias, nomeDaCategoria } from "@/lib/categorias";
import { saldoNoServidor } from "@/lib/saldo-no-servidor";

/**
 * A porta de trás: um lançamento, sem abrir o app.
 *
 * É por aqui que entra o atalho do iPhone — aquele que você dispara pedindo à
 * Siri, ou com dois toques na traseira do aparelho. O pedido mínimo é
 * `POST /api/lancar?valor=38,50`; sem tipo é gasto do dia a dia, sem data é
 * hoje. O mesmo vale em corpo JSON, `{"valor": "38,50"}`, para quem já montou o
 * atalho assim.
 *
 * A porta não tem cookie: quem bate manda o código de acesso no cabeçalho
 * `x-codigo`. Vai no cabeçalho, e não no endereço, de propósito — endereço fica
 * gravado em registro de servidor e em histórico de navegador, e o código é a
 * chave do seu dinheiro. Por isso o valor pode vir no endereço e o código não:
 * são segredos de tamanhos diferentes.
 *
 * A resposta traz o saldo do dia já calculado, para a notificação do atalho
 * dizer o que aconteceu sem você precisar conferir em lugar nenhum.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Todo erro volta também em `recado`: é o campo que a notificação do atalho
 * mostra. Sem isso, quando algo falhava a notificação aparecia em branco, e a
 * pessoa via que deu errado sem saber por quê.
 */
const recusa = (erro: string, status: number) =>
  NextResponse.json({ erro, recado: erro }, { status });

const naoAutorizado = () => recusa("Código de acesso inválido.", 401);

export async function POST(pedido: Request) {
  const doCabecalho = pedido.headers.get("x-codigo");

  // O valor pode vir no endereço ("?valor=38,50") ou no corpo JSON. O endereço é
  // o caminho curto, que deixa o atalho com quatro ajustes em vez de sete; o
  // corpo continua valendo para quem já montou assim. Corpo ganha do endereço.
  let corpo: Record<string, unknown> = camposDoEndereco(pedido.url);
  const texto = await pedido.text();
  if (texto.trim()) {
    try {
      corpo = { ...corpo, ...(JSON.parse(texto) as Record<string, unknown>) };
    } catch {
      return recusa("O corpo do pedido não é JSON.", 400);
    }
  }

  // O código pode vir no cabeçalho ou no corpo: o app Atalhos preenche os dois
  // com a mesma facilidade, e quem já está com sessão aberta não precisa de
  // nenhum dos dois.
  const doCorpo = typeof corpo.codigo === "string" ? corpo.codigo : null;
  // O código diz não só SE pode, mas DE QUEM é o lançamento: cada pessoa tem o
  // seu, e o atalho da Siri de um amigo lança no Diário dele.
  const usuarioId = await usuarioDoPedido(doCabecalho, doCorpo);
  if (!usuarioId) return naoAutorizado();

  // A lista de categorias vive no banco, e é o servidor que traduz o que foi
  // falado ("mercado", "conta de luz") no identificador que o lançamento guarda.
  const guardadas = await bd.ajuste.findUnique({
    where: { usuarioId_chave: { usuarioId, chave: CHAVE_DAS_CATEGORIAS } },
  });
  const categorias = lerCategorias(guardadas?.valor);

  const leitura = lerPedidoDoAtalho(corpo, { hoje: hojeNoFuso(), categorias });
  if (!leitura.ok) return recusa(leitura.erro, 400);

  const { lancamentos } = leitura;

  // Sem categoria dita, vale a que a loja já teve: o Apple Pay manda o nome do
  // lugar como nota, e quem já classificou "Uber" uma vez não classifica de novo.
  // Categoria dita (ou "não achei") nunca é trocada por palpite.
  let aprendida = false;
  if (!leitura.categoriaNaoAchada && !lancamentos[0].categoria && lancamentos[0].nota) {
    const historico = await bd.lancamento.findMany({
      where: { usuarioId, apagadoEm: null, categoria: { not: null }, nota: { not: null } },
      select: { nota: true, categoria: true, tipo: true },
      orderBy: { atualizadoEm: "desc" },
      take: 1500,
    });
    const id = categoriaDaLoja(lancamentos[0].nota, lancamentos[0].tipo, historico, categorias);
    if (id) {
      for (const l of lancamentos) l.categoria = id;
      aprendida = true;
    }
  }

  // Duas automações podem ouvir a mesma notificação (a do Pix recebido e a das
  // compras), e o mesmo aviso pode chegar duas vezes. Se o mesmo valor, no mesmo
  // dia, acabou de ser lançado a partir de uma notificação, não repete. Só vale
  // para lançamento vindo de notificação (`texto`): quem digita dois cafés de R$ 8
  // seguidos quer dois lançamentos.
  const veioDaNotificacao =
    String(corpo.valor ?? "").trim() === "" && String(corpo.texto ?? "").trim() !== "";
  if (veioDaNotificacao && lancamentos.length === 1) {
    const alvo = lancamentos[0];
    const corte = new Date(Date.now() - 3 * 60 * 1000);
    const repetido = await bd.lancamento.findFirst({
      where: {
        usuarioId,
        apagadoEm: null,
        previsto: false,
        tipo: alvo.tipo,
        valorCents: alvo.valorCents,
        data: alvo.data,
        OR: [{ criadoEm: { gte: corte } }, { atualizadoEm: { gte: corte } }],
        // Entrada confirmada leva a nota do previsto ("Salário"); só o gasto compara a loja.
        ...(alvo.tipo === "DIARIO" && alvo.nota
          ? { nota: { equals: alvo.nota, mode: "insensitive" as const } }
          : {}),
      },
      select: { id: true },
    });
    if (repetido) {
      return NextResponse.json({
        ok: true,
        recado: "Esse lançamento acabou de entrar, então não repeti.",
        duplicado: true,
      });
    }
  }

  // O salário que caiu de verdade é o salário que já estava previsto: em vez de
  // somar um valor novo ao previsto, o previsto é confirmado com o valor e o
  // dia reais. Só com um lançamento só — "195+15" são gastos, não um salário.
  let confirmado: string | null = null;
  if (lancamentos.length === 1 && lancamentos[0].tipo !== "DIARIO") {
    const alvo = lancamentos[0];
    const janela = janelaDeBusca(alvo.data);
    const candidatos = await bd.lancamento.findMany({
      where: {
        usuarioId,
        apagadoEm: null,
        previsto: true,
        fixoId: { not: null },
        tipo: alvo.tipo,
        data: { gte: janela.de, lte: janela.ate },
      },
    });
    const achado = previstoParaConfirmar(
      alvo,
      candidatos.map((c) => ({
        id: c.id,
        data: c.data,
        tipo: c.tipo,
        valorCents: c.valorCents,
        nota: c.nota,
        previsto: c.previsto,
        fixoId: c.fixoId,
      })),
    );
    if (achado) {
      await bd.lancamento.update({
        where: { id: achado.id },
        data: { data: alvo.data, valorCents: alvo.valorCents, previsto: false, atualizadoEm: new Date() },
      });
      confirmado = achado.nota?.trim() || "o previsto";
      // O que fica no recado e no saldo é o previsto já confirmado.
      lancamentos[0] = confirmadoCom(
        { ...achado, categoria: achado.categoria ?? null },
        alvo,
        new Date().toISOString(),
      );
    }
  }

  if (!confirmado) {
    await bd.lancamento.createMany({
      data: lancamentos.map((l) => ({
        id: l.id,
        usuarioId,
        data: l.data,
        tipo: l.tipo,
        valorCents: l.valorCents,
        nota: l.nota ?? null,
        categoria: l.categoria ?? null,
        previsto: false,
        rendaPropria: !!l.rendaPropria,
        investimento: !!l.investimento,
        apartamento: !!l.apartamento,
        credito: !!l.credito,
        fixoId: null,
        criadoEm: new Date(l.criadoEm!),
        atualizadoEm: new Date(l.atualizadoEm!),
      })),
    });
  }

  const data = lancamentos[0].data;

  const { saldoDoDiaCents: saldoDoDia } = await saldoNoServidor(data, usuarioId);

  const recado = recadoDoAtalho(lancamentos, saldoDoDia, {
    nome: lancamentos[0].categoria
      ? nomeDaCategoria(categorias, lancamentos[0].categoria)
      : undefined,
    naoAchada: leitura.categoriaNaoAchada,
  });

  return NextResponse.json({
    ok: true,
    recado: confirmado
      ? recado.replace(" Saldo de hoje", ` Confirmei “${confirmado}”, que já estava previsto. Saldo de hoje`)
      : recado,
    confirmouPrevisto: confirmado !== null,
    categoriaAprendida: aprendida,
    quantos: lancamentos.length,
    data,
    tipo: lancamentos[0].tipo,
    totalCents: lancamentos.reduce((soma, l) => soma + l.valorCents, 0),
    saldoDoDiaCents: saldoDoDia,
  });
}

/** Um GET aqui só existe para dizer que a porta está de pé, e como bater nela. */
export function GET() {
  return NextResponse.json({
    comoUsar:
      'POST em /api/lancar?valor=38,50&categoria=mercado com o cabeçalho "x-codigo". ' +
      'O mesmo vale em corpo JSON: {"valor":"38,50"}. ' +
      'Opcionais: "tipo" (entrada, saída ou diário), "credito" (1: compra no cartão de crédito, vai para a fatura), "categoria" (o nome, como se fala), ' +
      '"data" (AAAA-MM-DD) e "nota". Sem "categoria", a nota (o nome da loja) busca a categoria que ela já teve. ' +
      'Em vez de "valor", dá para mandar "texto": uma frase com o valor dentro, como a ' +
      'notificação do banco — o app tira o número dela e, sem "tipo", decide se é compra (débito, ' +
      'crédito, NuPay) ou Pix recebido; outra coisa não é lançada. ' +
      "O código só é lido do cabeçalho ou do corpo, nunca do endereço.",
  });
}
