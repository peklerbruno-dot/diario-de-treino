import { NextResponse } from "next/server";
import { z } from "zod";
import { temSessao } from "@/lib/auth";
import { bd } from "@/lib/bd";
import { diasNoMes } from "@/lib/datas";
import { TETO_CENTS } from "@/lib/dinheiro";

/**
 * A sincronização inteira: um endereço só, que recebe o que mudou no aparelho e
 * devolve o que mudou no servidor.
 *
 * Duas regras, e o resto decorre delas:
 *
 * 1. Quem escreveu por último ganha. Cada linha carrega `atualizadoEm`, o
 *    relógio de quem a escreveu; uma alteração mais velha nunca sobrescreve uma
 *    mais nova, mesmo chegando depois (é o que acontece quando o celular passa
 *    o dia sem sinal e sobe tudo à noite).
 *
 * 2. Apagar é marcar `apagadoEm`, nunca sumir com a linha. Uma linha que some
 *    não tem como ser levada para o outro aparelho, e voltaria do túmulo na
 *    próxima sincronização.
 *
 * O "desde" é o relógio do servidor, não o do celular: um aparelho adiantado
 * que mandasse o próprio relógio esconderia de si mesmo tudo o que o outro
 * escreveu no meio.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tipo = z.enum(["ENTRADA", "SAIDA", "DIARIO"]);
const dataDeCaderno = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "data precisa ser AAAA-MM-DD")
  .refine((d) => {
    // "2026-02-31" passa no regex e some de todas as telas: dinheiro gravado
    // que nenhum mês mostra. Dia de caderno tem que existir no calendário.
    const [ano, mes, dia] = d.split("-").map(Number);
    return (
      ano >= 2000 && ano <= 2100 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasNoMes(ano, mes)
    );
  }, "esse dia não existe no calendário");

/**
 * O teto protege o banco: a coluna é um inteiro de 32 bits, e um valor acima
 * dele derrubava o pedido inteiro com 500 — travando a sincronização do
 * aparelho para sempre. Acima do teto a linha é recusada com nome e motivo.
 */
const valorComTeto = z.number().int().finite().min(-TETO_CENTS).max(TETO_CENTS);
const instante = z.string().datetime();

const zLancamento = z.object({
  id: z.string().min(1).max(64),
  data: dataDeCaderno,
  tipo,
  valorCents: valorComTeto,
  nota: z.string().max(500).nullish(),
  categoria: z.string().max(80).nullish(),
  previsto: z.boolean().default(false),
  rendaPropria: z.boolean().default(false),
  investimento: z.boolean().default(false),
  apartamento: z.boolean().default(false),
  fixoId: z.string().max(64).nullish(),
  criadoEm: instante,
  atualizadoEm: instante,
  apagadoEm: instante.nullish(),
});

const zFixo = z.object({
  id: z.string().min(1).max(64),
  tipo,
  dia: z.number().int().min(0).max(31),
  repeticao: z.string().max(40).nullish(),
  valorCents: valorComTeto,
  nota: z.string().max(500).nullish(),
  categoria: z.string().max(80).nullish(),
  rendaPropria: z.boolean().default(false),
  investimento: z.boolean().default(false),
  apartamento: z.boolean().default(false),
  ativo: z.boolean().default(true),
  criadoEm: instante,
  atualizadoEm: instante,
  apagadoEm: instante.nullish(),
});

const zAjuste = z.object({
  chave: z.string().min(1).max(64),
  valor: z.string().max(20000),
  atualizadoEm: instante,
});

/**
 * O envelope valida só a forma geral; cada linha é validada SOZINHA depois.
 *
 * Antes, uma linha inválida derrubava o pedido inteiro com 400 — e como o
 * aparelho manda todos os pendentes juntos e só limpa a fila no sucesso, uma
 * única linha envenenada travava a sincronização para sempre: nada mais subia.
 * Agora as linhas boas entram, e as recusadas voltam com nome e motivo para o
 * aparelho tirar da fila e avisar.
 */
const zCorpo = z.object({
  desde: instante.nullish(),
  lancamentos: z.array(z.unknown()).max(2000).default([]),
  fixos: z.array(z.unknown()).max(500).default([]),
  ajustes: z.array(z.unknown()).max(100).default([]),
});

export interface Recusado {
  id: string;
  motivo: string;
}

function peneirar<E extends z.ZodTypeAny>(
  brutos: unknown[],
  esquema: E,
  identidade: (bruto: unknown) => string,
  recusados: Recusado[],
): z.output<E>[] {
  const bons: z.output<E>[] = [];
  for (const bruto of brutos) {
    const lido = esquema.safeParse(bruto);
    if (lido.success) {
      bons.push(lido.data);
    } else {
      const issue = lido.error.issues[0];
      const onde = issue?.path?.join(".") ?? "";
      recusados.push({
        id: identidade(bruto),
        motivo: onde ? `${onde}: ${issue.message}` : (issue?.message ?? "linha inválida"),
      });
    }
  }
  return bons;
}

const idDe = (campo: string) => (bruto: unknown) =>
  typeof bruto === "object" && bruto !== null && campo in bruto
    ? String((bruto as Record<string, unknown>)[campo]).slice(0, 64)
    : "(sem id)";

type Lancamento = z.infer<typeof zLancamento>;
type Fixo = z.infer<typeof zFixo>;
type Ajuste = z.infer<typeof zAjuste>;

const emData = (s: string | null | undefined) => (s ? new Date(s) : null);

export async function POST(pedido: Request) {
  if (!(await temSessao())) {
    return NextResponse.json({ erro: "Sem sessão." }, { status: 401 });
  }

  let corpo: z.infer<typeof zCorpo>;
  try {
    corpo = zCorpo.parse(await pedido.json());
  } catch (erro) {
    const detalhe = erro instanceof z.ZodError ? erro.issues : String(erro);
    return NextResponse.json({ erro: "Pedido malformado.", detalhe }, { status: 400 });
  }

  const recusados: Recusado[] = [];
  await gravarLancamentos(peneirar(corpo.lancamentos, zLancamento, idDe("id"), recusados));
  await gravarFixos(peneirar(corpo.fixos, zFixo, idDe("id"), recusados));
  await gravarAjustes(peneirar(corpo.ajustes, zAjuste, idDe("chave"), recusados));

  const desde = emData(corpo.desde) ?? new Date(0);
  const [lancamentos, fixos, ajustes] = await Promise.all([
    bd.lancamento.findMany({ where: { servidorEm: { gt: desde } } }),
    bd.fixo.findMany({ where: { servidorEm: { gt: desde } } }),
    bd.ajuste.findMany({ where: { servidorEm: { gt: desde } } }),
  ]);

  // O novo marcador é o relógio mais recente que veio do banco, e não o de
  // agora: se uma linha for gravada entre a consulta e a resposta, ela não pode
  // ficar para trás do marcador e sumir do próximo pedido.
  const marcadores = [
    ...lancamentos.map((l) => l.servidorEm),
    ...fixos.map((f) => f.servidorEm),
    ...ajustes.map((a) => a.servidorEm),
  ];
  // O marcador nunca avança até "agora": duas linhas gravadas no mesmo
  // instante por aparelhos diferentes podiam ficar uma de cada lado da
  // consulta, e a que ficou de fora nunca mais era vista — o marcador já tinha
  // passado dela. Segurando o marcador cinco segundos atrás do relógio, a
  // fresta é relida no próximo pedido; reler é inócuo, o aparelho descarta o
  // que já tem.
  const maisNovo = marcadores.length
    ? Math.max(...marcadores.map((d) => d.getTime()))
    : desde.getTime();
  const ate = new Date(Math.max(desde.getTime(), Math.min(maisNovo, Date.now() - 5000)));

  return NextResponse.json({
    recusados,
    ate: ate.toISOString(),
    lancamentos: lancamentos.map(limparLancamento),
    fixos: fixos.map(limparFixo),
    ajustes: ajustes.map((a) => ({
      chave: a.chave,
      valor: a.valor,
      atualizadoEm: a.atualizadoEm.toISOString(),
    })),
  });
}

/**
 * Grava em bloco: primeiro descobre o que já existe e com que relógio, depois
 * cria de uma vez o que é novo e atualiza só o que ficou para trás.
 *
 * Uma importação traz oitocentas linhas de uma vez. Uma gravação por linha
 * seriam oitocentas idas ao banco — e um banco que dorme, como o da Vercel,
 * cobra caro por cada ida.
 */
async function gravarLancamentos(entrando: Lancamento[]) {
  if (entrando.length === 0) return;

  const existentes = await bd.lancamento.findMany({
    where: { id: { in: entrando.map((l) => l.id) } },
    select: { id: true, atualizadoEm: true },
  });
  const relogio = new Map(existentes.map((l) => [l.id, l.atualizadoEm.getTime()]));

  const novos: Lancamento[] = [];
  const mudados: Lancamento[] = [];
  for (const l of entrando) {
    const anterior = relogio.get(l.id);
    if (anterior === undefined) novos.push(l);
    else if (new Date(l.atualizadoEm).getTime() > anterior) mudados.push(l);
    // Chegou mais velho do que o que está no banco: é eco de uma alteração já
    // superada, e passar por cima dela seria desfazer o trabalho do outro
    // aparelho.
  }

  if (novos.length) {
    await bd.lancamento.createMany({
      data: novos.map((l) => ({
        id: l.id,
        data: l.data,
        tipo: l.tipo,
        valorCents: l.valorCents,
        nota: l.nota ?? null,
        categoria: l.categoria ?? null,
        previsto: l.previsto,
        rendaPropria: l.rendaPropria,
        investimento: l.investimento,
        apartamento: l.apartamento,
        fixoId: l.fixoId ?? null,
        criadoEm: new Date(l.criadoEm),
        atualizadoEm: new Date(l.atualizadoEm),
        apagadoEm: emData(l.apagadoEm),
      })),
      skipDuplicates: true,
    });
  }

  // O update é CONDICIONAL no próprio banco: só grava se a linha de lá ainda
  // for mais velha. A comparação feita antes, em memória, deixava uma fresta —
  // entre ler o relógio e escrever, o outro aparelho podia gravar uma edição
  // mais nova, e a nossa, mais velha, passava por cima dela.
  for (const lote of emLotes(mudados, 25)) {
    await bd.$transaction(
      lote.map((l) =>
        bd.lancamento.updateMany({
          where: { id: l.id, atualizadoEm: { lt: new Date(l.atualizadoEm) } },
          data: {
            data: l.data,
            tipo: l.tipo,
            valorCents: l.valorCents,
            nota: l.nota ?? null,
            categoria: l.categoria ?? null,
            previsto: l.previsto,
            rendaPropria: l.rendaPropria,
            investimento: l.investimento,
            apartamento: l.apartamento,
            fixoId: l.fixoId ?? null,
            atualizadoEm: new Date(l.atualizadoEm),
            apagadoEm: emData(l.apagadoEm),
          },
        }),
      ),
    );
  }
}

async function gravarFixos(entrando: Fixo[]) {
  if (entrando.length === 0) return;

  const existentes = await bd.fixo.findMany({
    where: { id: { in: entrando.map((f) => f.id) } },
    select: { id: true, atualizadoEm: true },
  });
  const relogio = new Map(existentes.map((f) => [f.id, f.atualizadoEm.getTime()]));

  for (const f of entrando) {
    const anterior = relogio.get(f.id);
    const dados = {
      tipo: f.tipo,
      dia: f.dia,
      repeticao: f.repeticao ?? null,
      valorCents: f.valorCents,
      nota: f.nota ?? null,
      categoria: f.categoria ?? null,
      rendaPropria: f.rendaPropria,
      investimento: f.investimento,
      apartamento: f.apartamento,
      ativo: f.ativo,
      atualizadoEm: new Date(f.atualizadoEm),
      apagadoEm: emData(f.apagadoEm),
    };

    if (anterior === undefined) {
      await bd.fixo.create({ data: { id: f.id, criadoEm: new Date(f.criadoEm), ...dados } });
    } else if (new Date(f.atualizadoEm).getTime() > anterior) {
      // Condicional pelo mesmo motivo dos lançamentos: a fresta entre ler e
      // escrever não pode deixar uma edição velha vencer uma nova.
      await bd.fixo.updateMany({
        where: { id: f.id, atualizadoEm: { lt: new Date(f.atualizadoEm) } },
        data: dados,
      });
    }
  }
}

async function gravarAjustes(entrando: Ajuste[]) {
  for (const a of entrando) {
    const quando = new Date(a.atualizadoEm);
    // Primeiro tenta atualizar SÓ se o que está lá for mais velho — a condição
    // mora no banco, não numa leitura de antes. Se nada mudou, ou a chave não
    // existe (aí cria), ou o que está lá já é mais novo (aí fica).
    const mexidos = await bd.ajuste.updateMany({
      where: { chave: a.chave, atualizadoEm: { lt: quando } },
      data: { valor: a.valor, atualizadoEm: quando },
    });
    if (mexidos.count === 0) {
      await bd.ajuste
        .createMany({
          data: [{ chave: a.chave, valor: a.valor, atualizadoEm: quando }],
          skipDuplicates: true,
        })
        .catch(() => {});
    }
  }
}

function* emLotes<T>(lista: T[], tamanho: number) {
  for (let i = 0; i < lista.length; i += tamanho) yield lista.slice(i, i + tamanho);
}

type LinhaLancamento = Awaited<ReturnType<typeof bd.lancamento.findMany>>[number];
type LinhaFixo = Awaited<ReturnType<typeof bd.fixo.findMany>>[number];

function limparLancamento(l: LinhaLancamento) {
  return {
    id: l.id,
    data: l.data,
    tipo: l.tipo,
    valorCents: l.valorCents,
    nota: l.nota,
    categoria: l.categoria,
    previsto: l.previsto,
    rendaPropria: l.rendaPropria,
    investimento: l.investimento,
    apartamento: l.apartamento,
    fixoId: l.fixoId,
    criadoEm: l.criadoEm.toISOString(),
    atualizadoEm: l.atualizadoEm.toISOString(),
    apagadoEm: l.apagadoEm ? l.apagadoEm.toISOString() : null,
  };
}

function limparFixo(f: LinhaFixo) {
  return {
    id: f.id,
    tipo: f.tipo,
    dia: f.dia,
    repeticao: f.repeticao,
    valorCents: f.valorCents,
    nota: f.nota,
    categoria: f.categoria,
    rendaPropria: f.rendaPropria,
    investimento: f.investimento,
    apartamento: f.apartamento,
    ativo: f.ativo,
    criadoEm: f.criadoEm.toISOString(),
    atualizadoEm: f.atualizadoEm.toISOString(),
    apagadoEm: f.apagadoEm ? f.apagadoEm.toISOString() : null,
  };
}
