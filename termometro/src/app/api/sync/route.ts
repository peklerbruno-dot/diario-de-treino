import { NextResponse } from "next/server";
import { z } from "zod";
import { temSessao } from "@/lib/auth";
import { bd } from "@/lib/bd";

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
const dataDeCaderno = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data precisa ser AAAA-MM-DD");
const instante = z.string().datetime();

const zLancamento = z.object({
  id: z.string().min(1).max(64),
  data: dataDeCaderno,
  tipo,
  valorCents: z.number().int().finite(),
  nota: z.string().max(500).nullish(),
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
  valorCents: z.number().int().finite(),
  nota: z.string().max(500).nullish(),
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
  valor: z.string().max(2000),
  atualizadoEm: instante,
});

const zCorpo = z.object({
  desde: instante.nullish(),
  lancamentos: z.array(zLancamento).max(2000).default([]),
  fixos: z.array(zFixo).max(500).default([]),
  ajustes: z.array(zAjuste).max(100).default([]),
});

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

  await gravarLancamentos(corpo.lancamentos);
  await gravarFixos(corpo.fixos);
  await gravarAjustes(corpo.ajustes);

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
  const ate = marcadores.length
    ? new Date(Math.max(...marcadores.map((d) => d.getTime())))
    : desde;

  return NextResponse.json({
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

  for (const lote of emLotes(mudados, 25)) {
    await bd.$transaction(
      lote.map((l) =>
        bd.lancamento.update({
          where: { id: l.id },
          data: {
            data: l.data,
            tipo: l.tipo,
            valorCents: l.valorCents,
            nota: l.nota ?? null,
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
      valorCents: f.valorCents,
      nota: f.nota ?? null,
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
      await bd.fixo.update({ where: { id: f.id }, data: dados });
    }
  }
}

async function gravarAjustes(entrando: Ajuste[]) {
  for (const a of entrando) {
    const atual = await bd.ajuste.findUnique({ where: { chave: a.chave } });
    if (atual && atual.atualizadoEm.getTime() >= new Date(a.atualizadoEm).getTime()) continue;
    await bd.ajuste.upsert({
      where: { chave: a.chave },
      create: { chave: a.chave, valor: a.valor, atualizadoEm: new Date(a.atualizadoEm) },
      update: { valor: a.valor, atualizadoEm: new Date(a.atualizadoEm) },
    });
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
    valorCents: f.valorCents,
    nota: f.nota,
    rendaPropria: f.rendaPropria,
    investimento: f.investimento,
    apartamento: f.apartamento,
    ativo: f.ativo,
    criadoEm: f.criadoEm.toISOString(),
    atualizadoEm: f.atualizadoEm.toISOString(),
    apagadoEm: f.apagadoEm ? f.apagadoEm.toISOString() : null,
  };
}
