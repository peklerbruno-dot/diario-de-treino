import { NextResponse } from "next/server";
import { usuarioDoPedido } from "@/lib/auth";
import { bd } from "@/lib/bd";
import { camposDoEndereco, hojeNoFuso, lerPedidoDoAtalho, recadoDoAtalho } from "@/lib/atalho";
import { categoriaDaLoja } from "@/lib/categoria-da-loja";
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

const naoAutorizado = () =>
  NextResponse.json({ erro: "Código de acesso inválido." }, { status: 401 });

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
      return NextResponse.json({ erro: "O corpo do pedido não é JSON." }, { status: 400 });
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
  if (!leitura.ok) return NextResponse.json({ erro: leitura.erro }, { status: 400 });

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
      fixoId: null,
      criadoEm: new Date(l.criadoEm!),
      atualizadoEm: new Date(l.atualizadoEm!),
    })),
  });

  const data = lancamentos[0].data;

  const { saldoDoDiaCents: saldoDoDia } = await saldoNoServidor(data, usuarioId);

  return NextResponse.json({
    ok: true,
    recado: recadoDoAtalho(lancamentos, saldoDoDia, {
      nome: lancamentos[0].categoria
        ? nomeDaCategoria(categorias, lancamentos[0].categoria)
        : undefined,
      naoAchada: leitura.categoriaNaoAchada,
    }),
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
      'Opcionais: "tipo" (entrada, saída ou diário), "categoria" (o nome, como se fala), ' +
      '"data" (AAAA-MM-DD) e "nota". Sem "categoria", a nota (o nome da loja) busca a categoria que ela já teve. ' +
      'Em vez de "valor", dá para mandar "texto": uma frase com o valor dentro, como a ' +
      'notificação do banco — o app tira o número dela. ' +
      "O código só é lido do cabeçalho ou do corpo, nunca do endereço.",
  });
}
