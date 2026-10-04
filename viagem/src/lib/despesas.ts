import "server-only";
import { bd } from "./bd";
import { novoId } from "./ids";
import { ehData, hoje } from "./datas";
import { ehMoeda, formatar, lerValor } from "./dinheiro";
import { conferirPagadores, dividir, ErroDeDivisao, type Entrada, type Modo } from "./contas";
import { avisarViagem } from "./avisos";
import { contasDaViagem } from "./consultas";
import { acompanharOrcamento, lerOrcamento, type Linha } from "./orcamento";
import { infoCategoriaDeDespesa } from "./contas";

const MODOS_VALIDOS: Modo[] = ["igual", "exato", "porcentagem", "cotas"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Salvar uma despesa. Os campos são os do formulário:
 *   - valor, moeda, cambio, descricao, data, categoria, modo;
 *   - pagador=<id>, ou pagador=varios e pago_<id> para cada um que pagou;
 *   - por pessoa, conforme o modo: inc_<id> (igual), val_<id> (exato),
 *     pct_<id> (porcentagem) ou cota_<id> (cotas);
 *   - idCliente: o id que o celular sorteou para uma despesa lançada sem
 *     internet. Reenviar a mesma não duplica.
 * A conta é refeita aqui, com a mesma função que a tela usou para mostrar a
 * prévia — a tela só sugere, quem decide é `dividir`.
 *
 * Serve à ação do formulário e à fila do modo sem internet (/api/v/[id]/despesas).
 */
export async function gravarDespesa(
  ctx: { viagemId: string; euId: string; moedaBase: string; cambios: unknown },
  campo: (nome: string) => string,
): Promise<{ erro: string } | { id: string }> {
  const { viagemId, euId } = ctx;
  const texto = (n: string) => (campo(n) ?? "").trim();

  const descricao = texto("descricao").slice(0, 140);
  if (!descricao) return { erro: "Escreva o que foi (jantar, táxi, hotel…)." };
  const valor = lerValor(texto("valor"));
  if (valor == null || valor <= 0) return { erro: "Escreva o valor." };
  if (valor > 100_000_000_00) return { erro: "Valor alto demais — confira os zeros." };

  const moeda = texto("moeda") || ctx.moedaBase;
  if (!ehMoeda(moeda)) return { erro: "Moeda desconhecida." };
  const cambio = moeda === ctx.moedaBase ? 1 : Number(texto("cambio").replace(",", "."));
  if (!(cambio > 0)) return { erro: `Diga quanto vale 1 ${moeda} em ${ctx.moedaBase}.` };

  const data = texto("data") || hoje();
  if (!ehData(data)) return { erro: "Data inválida." };
  const modo = texto("modo") as Modo;
  if (!MODOS_VALIDOS.includes(modo)) return { erro: "Escolha como dividir." };

  const membros = await bd.membro.findMany({ where: { viagemId }, select: { id: true, saiuEm: true } });
  const ids = new Set(membros.map((m) => m.id));

  let pagadores: Entrada[];
  const pagador = texto("pagador");
  if (pagador === "varios") {
    pagadores = membros
      .map((m) => ({ membroId: m.id, valor: lerValor(texto(`pago_${m.id}`)) ?? 0 }))
      .filter((p) => p.valor > 0);
  } else {
    if (!ids.has(pagador)) return { erro: "Diga quem pagou." };
    pagadores = [{ membroId: pagador, valor }];
  }

  const entradas: Entrada[] = [];
  for (const m of membros) {
    if (modo === "igual") {
      if (texto(`inc_${m.id}`) === "sim") entradas.push({ membroId: m.id, valor: 1 });
    } else if (modo === "exato") {
      const v = lerValor(texto(`val_${m.id}`));
      if (v) entradas.push({ membroId: m.id, valor: v });
    } else {
      const bruto = texto(`${modo === "porcentagem" ? "pct" : "cota"}_${m.id}`).replace(",", ".");
      const n = bruto ? Number(bruto) : 0;
      if (!Number.isFinite(n) || n < 0) return { erro: "Há um número inválido na divisão." };
      if (n > 0) entradas.push({ membroId: m.id, valor: n });
    }
  }

  let partes;
  try {
    pagadores = conferirPagadores(valor, pagadores);
    partes = dividir(modo, valor, entradas);
  } catch (e) {
    if (e instanceof ErroDeDivisao) return { erro: e.message };
    throw e;
  }

  const campos = {
    descricao,
    categoria: texto("categoria") || "outro",
    data,
    valor,
    moeda,
    cambio,
    modo,
    notas: texto("notas").slice(0, 1000),
  };
  const linhas = {
    pagadores: { create: pagadores.map((p) => ({ membroId: p.membroId, valor: p.valor })) },
    partes: { create: partes.map((p) => ({ membroId: p.membroId, valor: p.valor, peso: p.peso })) },
  };

  let id = texto("despesaId");
  if (id) {
    const existe = await bd.despesa.findFirst({ where: { id, viagemId, apagadoEm: null }, select: { id: true } });
    if (!existe) return { erro: "Essa despesa não existe mais." };
    await bd.$transaction([
      bd.pagadorDespesa.deleteMany({ where: { despesaId: id } }),
      bd.parteDespesa.deleteMany({ where: { despesaId: id } }),
      bd.despesa.update({ where: { id }, data: { ...campos, ...linhas } }),
    ]);
  } else {
    const idCliente = texto("idCliente");
    id = UUID.test(idCliente) ? idCliente : novoId();
    // Já chegou antes (a fila reenviou depois de uma queda): não duplica.
    if (await bd.despesa.findUnique({ where: { id }, select: { id: true } })) return { id };
    await bd.despesa.create({ data: { id, viagemId, ...campos, criadoPorId: euId, ...linhas } });

    const quem = await bd.membro.findUnique({ where: { id: euId }, select: { nome: true } });
    await avisarViagem(
      viagemId,
      {
        titulo: `💸 ${descricao}`,
        corpo: `${(quem?.nome ?? "Alguém").split(" ")[0]} lançou ${formatar(valor, moeda)}.`,
        url: `/v/${viagemId}/contas`,
        marca: `despesa-${id}`,
      },
      { para: [...new Set([...pagadores, ...partes].map((p) => p.membroId))], exceto: euId },
    );
  }

  if (!texto("despesaId")) await avisarSeCruzouOrcamento(viagemId, ctx.moedaBase, Math.round(valor * cambio), campos.categoria);

  // O câmbio usado vira a sugestão da próxima despesa nessa moeda.
  if (moeda !== ctx.moedaBase) {
    const cambios = { ...((ctx.cambios as Record<string, number>) ?? {}), [moeda]: cambio };
    await bd.viagem.update({ where: { id: viagemId }, data: { cambios } });
  }
  return { id };
}

/**
 * Se a despesa que acabou de entrar fez o grupo passar de 80% (ou de 100%)
 * do orçamento — no total ou na categoria —, avisa todo mundo. Só na hora de
 * cruzar a linha: a despesa seguinte, já acima, não avisa de novo.
 */
async function avisarSeCruzouOrcamento(viagemId: string, moedaBase: string, valorNaBase: number, categoria: string) {
  const viagem = await bd.viagem.findUnique({ where: { id: viagemId }, select: { orcamento: true } });
  const orcamento = lerOrcamento(viagem?.orcamento);
  if (!orcamento.total && !orcamento.categorias?.[categoria]) return;
  const c = await contasDaViagem(viagemId);
  const porCategoria = new Map(c.porCategoria);
  const agora = acompanharOrcamento(orcamento, { total: c.totalDoGrupo, porCategoria, consumoPorPessoa: new Map() });
  const antesCat = new Map(porCategoria);
  antesCat.set(categoria, (antesCat.get(categoria) ?? 0) - valorNaBase);
  const antes = acompanharOrcamento(orcamento, { total: c.totalDoGrupo - valorNaBase, porCategoria: antesCat, consumoPorPessoa: new Map() });

  const cruzou = (a: Linha | null | undefined, d: Linha | null | undefined) => d && a && d.estado !== "ok" && d.estado !== a.estado;
  const alvos: { nome: string; linha: Linha }[] = [];
  if (cruzou(antes.total, agora.total)) alvos.push({ nome: "do orçamento total", linha: agora.total! });
  const cat = (x: typeof agora) => x.categorias.find((l) => l.chave === categoria);
  if (cruzou(cat(antes), cat(agora))) alvos.push({ nome: `de ${infoCategoriaDeDespesa(categoria).nome.toLowerCase()}`, linha: cat(agora)! });

  for (const a of alvos) {
    const pct = Math.round(a.linha.fracao * 100);
    await avisarViagem(viagemId, {
      titulo: a.linha.estado === "estourou" ? "🚨 Orçamento estourado" : "⚠️ Orçamento chegando no limite",
      corpo: `Já foram ${pct}% ${a.nome}: ${formatar(a.linha.gasto, moedaBase)} de ${formatar(a.linha.limite, moedaBase)}.`,
      url: `/v/${viagemId}/contas`,
    });
  }
}
