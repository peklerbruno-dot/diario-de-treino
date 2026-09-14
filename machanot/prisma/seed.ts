/**
 * Semente: a Machané Kaitz 2026 como ela foi de fato, vinda da planilha.
 *
 * Serve para três coisas: dar o que olhar na primeira vez que alguém abre a
 * plataforma, provar que o caminho banco → motor devolve os mesmos números da
 * planilha, e deixar uma machané anterior para o comparativo ter o que comparar.
 *
 * Rode com: npm run db:seed
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { calcular } from "../src/lib/calculo";
import { paraInput } from "../src/lib/estado";
import { paraEstado } from "../src/lib/mapear";

const prisma = new PrismaClient();

const D = 17055; // R$ 170,55

const categorias: Prisma.CategoriaCreateWithoutMachaneInput[] = [
  { nome: "madrichim grandes", papel: "MADRICH", turma: "GRANDES", dias: 6, quantidade: 35, geraHospedagem: true, contribuicaoCents: 42000, ordem: 0 },
  { nome: "Pts grandes", papel: "PT", turma: "GRANDES", dias: 6, quantidade: 3, geraHospedagem: true, contribuicaoCents: 42000, ordem: 1 },
  { nome: "Pts pequenos", papel: "PT", turma: "PEQUENOS", dias: 4, quantidade: 3, geraHospedagem: true, contribuicaoCents: 28000, ordem: 2 },
  { nome: "madrichim pequenos", papel: "MADRICH", turma: "PEQUENOS", dias: 4, quantidade: 16, geraHospedagem: true, contribuicaoCents: 28000, ordem: 3 },
  { nome: "chanichim grandes", papel: "CHANICH", turma: "GRANDES", dias: 6, quantidade: 98, geraHospedagem: true, contribuicaoCents: 0, ordem: 4 },
  { nome: "chanichim pequenos", papel: "CHANICH", turma: "PEQUENOS", dias: 4, quantidade: 17, geraHospedagem: true, contribuicaoCents: 0, ordem: 5 },
  // Equipe e segurança não geram hospedagem aqui: a diária deles está nas linhas
  // POR_DIARIA dos gastos fixos, como na planilha. Marcar nos dois lugares
  // contaria a diária duas vezes (§6).
  { nome: "equipe", papel: "EQUIPE", turma: "GRANDES", dias: 6, quantidade: 3, geraHospedagem: false, contribuicaoCents: 0, ordem: 6 },
  { nome: "seguranca 6 dias", papel: "PRESTADOR", turma: "GRANDES", dias: 6, quantidade: 2, geraHospedagem: false, contribuicaoCents: 0, ordem: 7 },
  { nome: "seguranca 4 dias", papel: "PRESTADOR", turma: "PEQUENOS", dias: 4, quantidade: 1, geraHospedagem: false, contribuicaoCents: 0, ordem: 8 },
];

const obs = "Importado da planilha da Kaitz 2026. Confirme a origem antes de reaproveitar.";

const gastos: Prisma.GastoFixoCreateWithoutMachaneInput[] = [
  { descricao: "passagem shagririm", tipo: "VALOR_FECHADO", categoria: "TRANSPORTE", valorCents: 80000, observacao: obs, revisado: true, ordem: 0 },
  { descricao: "diária shagririm", tipo: "POR_DIARIA", categoria: "ESTRUTURA", valorCents: 0, pessoas: 2, dias: 6, observacao: `${obs} Hospedagem dos shagririm — a categoria de pessoas não gera hospedagem.`, revisado: true, ordem: 1 },
  { descricao: "diária enfermeria", tipo: "POR_DIARIA", categoria: "SAUDE", valorCents: 0, pessoas: 1, dias: 6, observacao: `${obs} Hospedagem da enfermeira.`, revisado: true, ordem: 2 },
  { descricao: "diária mecha", tipo: "POR_DIARIA", categoria: "ESTRUTURA", valorCents: 0, pessoas: 1, dias: 6, observacao: `${obs} Hospedagem do mechanech.`, revisado: true, ordem: 3 },
  { descricao: "diária psicologa", tipo: "POR_DIARIA", categoria: "SAUDE", valorCents: 0, pessoas: 1, dias: 6, observacao: `${obs} Hospedagem da psicóloga.`, revisado: true, ordem: 4 },
  { descricao: "diária seguranças 6d", tipo: "POR_DIARIA", categoria: "SEGURANCA", valorCents: 0, pessoas: 2, dias: 6, observacao: `${obs} Hospedagem dos dois seguranças da turma grande.`, revisado: true, ordem: 5 },
  { descricao: "diária seguranças 4d", tipo: "POR_DIARIA", categoria: "SEGURANCA", valorCents: 0, pessoas: 1, dias: 4, observacao: `${obs} Hospedagem do segurança da turma pequena.`, revisado: true, ordem: 6 },
  { descricao: "transporte", tipo: "VALOR_FECHADO", categoria: "TRANSPORTE", valorCents: 1880000, observacao: obs, revisado: true, ordem: 7 },
  { descricao: "carro", tipo: "VALOR_FECHADO", categoria: "TRANSPORTE", valorCents: 50000, observacao: obs, revisado: true, ordem: 8 },
  { descricao: "remédio", tipo: "VALOR_FECHADO", categoria: "SAUDE", valorCents: 150000, observacao: obs, revisado: true, ordem: 9 },
  { descricao: "segurança (cachê)", tipo: "CACHE_DIARIO", categoria: "SEGURANCA", valorCents: 82302, pessoas: 1, dias: 16, observacao: `${obs} Cachê próprio: 16 pessoa-dia de segurança.`, revisado: true, ordem: 10 },
  { descricao: "enfermeira (cachê)", tipo: "VALOR_FECHADO", categoria: "SAUDE", valorCents: 200000, observacao: obs, revisado: true, ordem: 11 },
  { descricao: "material", tipo: "VALOR_FECHADO", categoria: "MATERIAL", valorCents: 150000, observacao: obs, revisado: true, ordem: 12 },
  { descricao: "seguro", tipo: "POR_PESSOA", categoria: "SAUDE", valorCents: 500, observacao: `${obs} R$ 5,00 por pessoa presente.`, revisado: true, ordem: 13 },
  { descricao: "psicóloga (cachê)", tipo: "VALOR_FECHADO", categoria: "SAUDE", valorCents: 400000, observacao: obs, revisado: true, ordem: 14 },
  { descricao: "carne", tipo: "VALOR_FECHADO", categoria: "ALIMENTACAO", valorCents: 800000, observacao: obs, revisado: true, ordem: 15 },
  { descricao: "bolsa", tipo: "VALOR_FECHADO", categoria: "BOLSA", valorCents: 6000000, observacao: `${obs} Fundo de bolsas do movimento.`, revisado: true, ordem: 16 },
  { descricao: "ambulância", tipo: "VALOR_FECHADO", categoria: "SAUDE", valorCents: 100000, observacao: obs, revisado: true, ordem: 17 },
];

async function main() {
  const emails = (process.env.EMAILS_AUTORIZADOS ?? "coordenacao@chazit.org.br")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  for (const email of emails) {
    await prisma.usuario.upsert({ where: { email }, update: {}, create: { email } });
  }
  console.log(`usuários autorizados: ${emails.join(", ")}`);

  const existente = await prisma.machane.findFirst({ where: { nome: "Machané Kaitz 2026" } });
  if (existente) {
    console.log("Machané Kaitz 2026 já está no banco; nada a fazer.");
    return;
  }

  const kaitz = await prisma.machane.create({
    data: {
      nome: "Machané Kaitz 2026",
      tipo: "KAITZ",
      ano: 2026,
      diariaCents: D,
      diariaTabelaCents: 18950,
      diariaObservacao:
        "R$ 170,55 = R$ 189,50 de tabela com 10% de desconto, acertado com o local em janeiro de 2026.",
      diasGrandes: 6,
      diasPequenos: 4,
      pesoOverride: 0.89,
      pesoJustificativa:
        "Valor herdado da planilha: o coeficiente foi arredondado à mão de 89,63% para 89%. Mantido para reproduzir a tabela divulgada em 2026.",
      pesoOverridePor: "importação da planilha",
      pesoOverrideEm: new Date(),
      status: "PUBLICADA",
      categorias: { create: categorias },
      gastos: { create: gastos },
      politica: {
        create: {
          metodo: "ADITIVO",
          margemBaseGrandesCents: 6400,
          margemBasePequenosCents: 20000,
          acrescimoNaoSocioCents: 20000,
          descontoSegundoFilhoCents: 13000,
          // A grade divulgada usou R$ 130 nos grandes e R$ 100 nos pequenos.
          // Ver docs/DIVERGENCIAS.md.
          descontoSegundoFilhoGrandesCents: 13000,
          descontoSegundoFilhoPequenosCents: 10000,
          acrescimoSegundaLevaCents: 10000,
          superavitAlvoCents: 0,
          arredondamento: "NENHUM",
        },
      },
    },
  });

  await prisma.registroAlteracao.create({
    data: {
      machaneId: kaitz.id,
      email: emails[0] ?? "sistema",
      alvo: "MACHANE",
      descricao: "Dados importados da planilha original da Kaitz 2026",
    },
  });

  // Conferência: o caminho banco → motor tem que devolver a planilha.
  const relido = await prisma.machane.findUniqueOrThrow({
    where: { id: kaitz.id },
    include: {
      categorias: true,
      gastos: true,
      politica: true,
      madrichim: { include: { pagamentos: true } },
      duplicadaDe: { select: { id: true, nome: true } },
    },
  });
  if (!relido.politica) throw new Error("machané sem política");
  const estado = paraEstado(relido, relido.politica);
  const r = calcular(paraInput(estado));

  const esperado: [string, number, number][] = [
    ["pessoas", r.totalPessoas, 178],
    ["hospedagem", r.hospedagemCents, 16372800],
    ["gastos fixos", r.gastosFixosCents, 12000362],
    ["custo total", r.custoTotalCents, 28373162],
    ["receita madrichim", r.receitaMadrichimCents, 2128000],
    ["a ratear", r.aRatearCents, 26245162],
    ["custo chanich grande", r.custoPorChanichGrandesCents, 238349],
    ["custo chanich pequeno", r.custoPorChanichPequenosCents, 169822],
    ["1º filho sócio grandes", r.precosGrandes.primeiroFilhoSocio, 244749],
    ["1º filho sócio pequenos", r.precosPequenos.primeiroFilhoSocio, 189822],
    ["2º filho sócio pequenos", r.precosPequenos.segundoFilhoSocio, 179822],
    ["superávit projetado", r.superavitProjetadoCents, 967214],
  ];

  let errou = false;
  for (const [nome, obtido, alvo] of esperado) {
    const ok = obtido === alvo;
    if (!ok) errou = true;
    console.log(`${ok ? "ok " : "ERRO"} ${nome}: ${obtido}${ok ? "" : ` (esperado ${alvo})`}`);
  }
  if (errou) throw new Error("A semente não reproduziu a planilha. Pare e investigue.");

  // Uma machané anterior para o comparativo ter o que comparar.
  await prisma.machane.create({
    data: {
      nome: "Machané Choref 2025 (exemplo)",
      tipo: "CHOREF",
      ano: 2025,
      diariaCents: 14500,
      diariaObservacao:
        "Machané de exemplo, criada pela semente só para a tela de comparativo ter contra o que comparar. Os números não são reais.",
      diasGrandes: 5,
      diasPequenos: 3,
      status: "ENCERRADA",
      categorias: {
        create: [
          { nome: "chanichim grandes", papel: "CHANICH", turma: "GRANDES", dias: 5, quantidade: 82, geraHospedagem: true, contribuicaoCents: 0, ordem: 0 },
          { nome: "chanichim pequenos", papel: "CHANICH", turma: "PEQUENOS", dias: 3, quantidade: 21, geraHospedagem: true, contribuicaoCents: 0, ordem: 1 },
          { nome: "madrichim grandes", papel: "MADRICH", turma: "GRANDES", dias: 5, quantidade: 30, geraHospedagem: true, contribuicaoCents: 35000, ordem: 2 },
          { nome: "madrichim pequenos", papel: "MADRICH", turma: "PEQUENOS", dias: 3, quantidade: 14, geraHospedagem: true, contribuicaoCents: 22000, ordem: 3 },
        ],
      },
      gastos: {
        create: [
          { descricao: "transporte", tipo: "VALOR_FECHADO", categoria: "TRANSPORTE", valorCents: 1450000, observacao: "Dados de exemplo.", revisado: true, ordem: 0 },
          { descricao: "alimentação extra", tipo: "VALOR_FECHADO", categoria: "ALIMENTACAO", valorCents: 620000, observacao: "Dados de exemplo.", revisado: true, ordem: 1 },
          { descricao: "bolsa", tipo: "VALOR_FECHADO", categoria: "BOLSA", valorCents: 4500000, observacao: "Dados de exemplo.", revisado: true, ordem: 2 },
          { descricao: "seguro", tipo: "POR_PESSOA", categoria: "SAUDE", valorCents: 450, observacao: "Dados de exemplo.", revisado: true, ordem: 3 },
        ],
      },
      politica: {
        create: {
          metodo: "ADITIVO",
          margemBaseGrandesCents: 5000,
          margemBasePequenosCents: 15000,
          acrescimoNaoSocioCents: 18000,
          descontoSegundoFilhoCents: 12000,
          acrescimoSegundaLevaCents: 10000,
          superavitAlvoCents: 0,
          arredondamento: "NENHUM",
        },
      },
    },
  });

  console.log("\nSemente pronta.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
