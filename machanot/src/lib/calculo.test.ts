import { describe, it, expect } from "vitest";
import { calcular, avisosDuplaContagem, type MachaneInput } from "./calculo";

const D = 17055; // R$ 170,55 em centavos

const kaitz2026: MachaneInput = {
  diariaCents: D,
  diasGrandes: 6,
  diasPequenos: 4,
  pesoOverride: 0.89, // valor histórico arredondado à mão
  categorias: [
    { id:'1', nome:'madrichim grandes',  papel:'MADRICH', turma:'GRANDES',  dias:6, quantidade:35, geraHospedagem:true,  contribuicaoCents:42000 },
    { id:'2', nome:'Pts grandes',        papel:'PT',      turma:'GRANDES',  dias:6, quantidade:3,  geraHospedagem:true,  contribuicaoCents:42000 },
    { id:'3', nome:'Pts pequenos',       papel:'PT',      turma:'PEQUENOS', dias:4, quantidade:3,  geraHospedagem:true,  contribuicaoCents:28000 },
    { id:'4', nome:'madrichim pequenos', papel:'MADRICH', turma:'PEQUENOS', dias:4, quantidade:16, geraHospedagem:true,  contribuicaoCents:28000 },
    { id:'5', nome:'chanichim grandes',  papel:'CHANICH', turma:'GRANDES',  dias:6, quantidade:98, geraHospedagem:true,  contribuicaoCents:0 },
    { id:'6', nome:'chanichim pequenos', papel:'CHANICH', turma:'PEQUENOS', dias:4, quantidade:17, geraHospedagem:true,  contribuicaoCents:0 },
    // equipe e segurança: hospedagem já está nos gastos fixos POR_DIARIA
    { id:'7', nome:'equipe',             papel:'EQUIPE',    turma:'GRANDES',  dias:6, quantidade:3, geraHospedagem:false, contribuicaoCents:0 },
    { id:'8', nome:'seguranca 6 dias',   papel:'PRESTADOR', turma:'GRANDES',  dias:6, quantidade:2, geraHospedagem:false, contribuicaoCents:0 },
    { id:'9', nome:'seguranca 4 dias',   papel:'PRESTADOR', turma:'PEQUENOS', dias:4, quantidade:1, geraHospedagem:false, contribuicaoCents:0 },
  ],
  gastos: [
    { id:'a', descricao:'passagem shagririm', tipo:'VALOR_FECHADO', categoria:'TRANSPORTE', valorCents:80000 },
    { id:'b', descricao:'diária shagririm',   tipo:'POR_DIARIA',    categoria:'ESTRUTURA',  valorCents:0, pessoas:2, dias:6 },
    { id:'c', descricao:'diária enfermeria',  tipo:'POR_DIARIA',    categoria:'SAUDE',      valorCents:0, pessoas:1, dias:6 },
    { id:'d', descricao:'diária mecha',       tipo:'POR_DIARIA',    categoria:'ESTRUTURA',  valorCents:0, pessoas:1, dias:6 },
    { id:'e', descricao:'diária psicologa',   tipo:'POR_DIARIA',    categoria:'SAUDE',      valorCents:0, pessoas:1, dias:6 },
    { id:'f', descricao:'diária seguranças 6d', tipo:'POR_DIARIA',  categoria:'SEGURANCA',  valorCents:0, pessoas:2, dias:6 },
    { id:'g', descricao:'diária seguranças 4d', tipo:'POR_DIARIA',  categoria:'SEGURANCA',  valorCents:0, pessoas:1, dias:4 },
    { id:'h', descricao:'transporte',         tipo:'VALOR_FECHADO', categoria:'TRANSPORTE', valorCents:1880000 },
    { id:'i', descricao:'carro',              tipo:'VALOR_FECHADO', categoria:'TRANSPORTE', valorCents:50000 },
    { id:'j', descricao:'remédio',            tipo:'VALOR_FECHADO', categoria:'SAUDE',      valorCents:150000 },
    { id:'k', descricao:'segurança (cachê)',  tipo:'CACHE_DIARIO',  categoria:'SEGURANCA',  valorCents:82302, pessoas:1, dias:16 },
    { id:'l', descricao:'enfermeira (cachê)', tipo:'VALOR_FECHADO', categoria:'SAUDE',      valorCents:200000 },
    { id:'m', descricao:'material',           tipo:'VALOR_FECHADO', categoria:'MATERIAL',   valorCents:150000 },
    { id:'n', descricao:'seguro',             tipo:'POR_PESSOA',    categoria:'SAUDE',      valorCents:500 },
    { id:'o', descricao:'psicóloga (cachê)',  tipo:'VALOR_FECHADO', categoria:'SAUDE',      valorCents:400000 },
    { id:'p', descricao:'carne',              tipo:'VALOR_FECHADO', categoria:'ALIMENTACAO',valorCents:800000 },
    { id:'q', descricao:'bolsa',              tipo:'VALOR_FECHADO', categoria:'BOLSA',      valorCents:6000000 },
    { id:'r', descricao:'ambulância',         tipo:'VALOR_FECHADO', categoria:'SAUDE',      valorCents:100000 },
  ],
  politica: {
    metodo: 'ADITIVO',
    margemBaseGrandesCents: 6400,      // +R$ 64
    margemBasePequenosCents: 20000,    // +R$ 200
    acrescimoNaoSocioCents: 20000,     // +R$ 200
    descontoSegundoFilhoCents: 13000,  // −R$ 130
    acrescimoSegundaLevaCents: 10000,  // +R$ 100
    superavitAlvoCents: 0,
    arredondamento: 'NENHUM',
  },
};

describe('Machané Kaitz 2026 — reprodução da planilha', () => {
  const r = calcular(kaitz2026);

  it('conta 178 pessoas', () => expect(r.totalPessoas).toBe(178));
  it('hospedagem = R$ 163.728,00', () => expect(r.hospedagemCents).toBe(16372800));
  it('gastos fixos = R$ 120.003,62', () => expect(r.gastosFixosCents).toBe(12000362));
  it('custo total = R$ 283.731,62', () => expect(r.custoTotalCents).toBe(28373162));
  it('madrichim pagam R$ 21.280,00', () => expect(r.receitaMadrichimCents).toBe(2128000));
  it('sobra R$ 262.451,62 para os chanichim', () => expect(r.aRatearCents).toBe(26245162));

  it('peso calculado é 89,63%', () => expect(r.pesoCalculado).toBeCloseTo(0.896341, 5));
  it('peso aplicado (histórico) é 89%', () => expect(r.pesoAplicado).toBe(0.89));
  it('o arredondamento desloca R$ 1.664,33 dos pequenos para os grandes', () =>
    expect(r.deslocamentoPorOverrideCents).toBe(-166433));

  it('custo por chanich grande = R$ 2.383,49', () =>
    expect(r.custoPorChanichGrandesCents).toBe(238349));
  it('custo por chanich pequeno = R$ 1.698,22', () =>
    expect(r.custoPorChanichPequenosCents).toBe(169822));

  it('grade dos grandes bate com a divulgada', () => {
    expect(r.precosGrandes).toEqual({
      primeiroFilhoSocio:    244749,  // 2.447,49
      primeiroFilhoNaoSocio: 264749,  // 2.647,49
      segundoFilhoSocio:     231749,  // 2.317,49
      segundoFilhoNaoSocio:  251749,  // 2.517,49  ← ver docs/DIVERGENCIAS.md
    });
  });

  // A grade da §8 traz 1.798,22 e 1.998,22 para os pequenos, o que corresponde a
  // um desconto de 2º filho de −R$ 100, não os −R$ 130 declarados na política.
  // O modelo regular (um desconto por machané) só pode produzir um dos dois.
  // Aqui fica o resultado regular; a grade divulgada está no teste seguinte,
  // com o desconto por turma. Ver docs/DIVERGENCIAS.md.
  it('grade dos pequenos, modelo regular (desconto único de R$ 130)', () => {
    expect(r.precosPequenos).toEqual({
      primeiroFilhoSocio:    189822,  // 1.898,22  — igual à divulgada
      primeiroFilhoNaoSocio: 209822,  // 2.098,22  — igual à divulgada
      segundoFilhoSocio:     176822,  // 1.768,22  — divulgada: 1.798,22 (desconto de R$ 100)
      segundoFilhoNaoSocio:  196822,  // 1.968,22  — divulgada: 1.998,22 (desconto de R$ 100)
    });
  });

  it('segunda leva é sempre +R$ 100', () =>
    expect(r.segundaLevaGrandes.primeiroFilhoSocio).toBe(254749));

  it('superávit projetado positivo', () =>
    expect(r.superavitProjetadoCents).toBeGreaterThan(0));

  it('superávit projetado = R$ 9.672,14 (+3,4%)', () => {
    expect(r.receitaSeTodosPrimeiroFilhoSocioCents).toBe(27212376);
    expect(r.superavitProjetadoCents).toBe(967214);
    expect(r.superavitProjetadoPct).toBeCloseTo(0.0341, 4);
  });
});

describe('Grade divulgada de 2026 (desconto de 2º filho por turma)', () => {
  const r = calcular({
    ...kaitz2026,
    politica: {
      ...kaitz2026.politica,
      descontoSegundoFilhoGrandesCents: 13000,  // −R$ 130 nos grandes
      descontoSegundoFilhoPequenosCents: 10000, // −R$ 100 nos pequenos
    },
  });

  it('pequenos batem com a tabela divulgada', () => {
    expect(r.precosPequenos).toEqual({
      primeiroFilhoSocio:    189822,  // 1.898,22
      primeiroFilhoNaoSocio: 209822,  // 2.098,22
      segundoFilhoSocio:     179822,  // 1.798,22
      segundoFilhoNaoSocio:  199822,  // 1.998,22
    });
  });

  it('grandes seguem o desconto único de R$ 130', () => {
    expect(r.precosGrandes.segundoFilhoSocio).toBe(231749);
    // A planilha trazia 2.577,49 aqui, porque descontava R$ 70 na linha de
    // não-sócio e R$ 130 na de sócio. O modelo é regular por construção.
    expect(r.precosGrandes.segundoFilhoNaoSocio).toBe(251749);
  });

  it('segunda leva soma R$ 100 em todas as oito células', () => {
    expect(r.segundaLevaPequenos).toEqual({
      primeiroFilhoSocio:    199822,
      primeiroFilhoNaoSocio: 219822,
      segundoFilhoSocio:     189822,
      segundoFilhoNaoSocio:  209822,
    });
  });
});

describe('Peso calculado (sem override)', () => {
  const r = calcular({ ...kaitz2026, pesoOverride: null });
  const comOverride = calcular(kaitz2026);

  it('aplica o peso matemático de 89,63%', () => {
    expect(r.pesoAplicado).toBeCloseTo(0.896341, 5);
    expect(r.deslocamentoPorOverrideCents).toBe(0);
  });

  it('custo por chanich grande = R$ 2.400,47', () =>
    expect(r.custoPorChanichGrandesCents).toBe(240047));

  it('custo por chanich pequeno = R$ 1.600,31', () =>
    expect(r.custoPorChanichPequenosCents).toBe(160031));

  it('o override de 89% cobra R$ 97,90 a mais de cada baby', () => {
    // 89% é MENOS que os 89,63% calculados: a fatia dos grandes encolhe e a dos
    // pequenos cresce. Quem paga o arredondamento é o baby.
    expect(comOverride.deslocamentoPorChanichPequenoCents).toBe(9790);
    // e R$ 16,98 a menos de cada chanich grande
    expect(comOverride.deslocamentoPorChanichGrandeCents).toBe(-1698);
    // A diferença entre os dois custos já arredondados dá um centavo a mais
    // (R$ 97,91): é arredondamento em cima de arredondamento. O número honesto
    // é o deslocamento dividido pelas 17 crianças.
    expect(comOverride.custoPorChanichPequenosCents - r.custoPorChanichPequenosCents).toBe(9791);
  });

  it('não emite aviso de peso ajustado', () => {
    expect(r.avisos.filter((a) => a.includes('Peso ajustado'))).toHaveLength(0);
  });
});

describe('Transparência (§10)', () => {
  const r = calcular(kaitz2026);

  it('subsídio à liderança: 57 pessoas, custam R$ 51.847,20, pagam R$ 21.280', () => {
    expect(r.quantidadeSubsidiados).toBe(57);
    expect(r.custoDosNaoChanichimCents).toBe(5184720);
    expect(r.receitaMadrichimCents).toBe(2128000);
    expect(r.subsidioMadrichimCents).toBe(3056720);
    expect(r.impactoSubsidioPorChanichGrandeCents).toBe(27760); // R$ 277,60
  });

  it('fundo de bolsas: R$ 60.000 = R$ 544,90 por chanich grande', () => {
    expect(r.bolsaCents).toBe(6000000);
    expect(r.impactoBolsaPorChanichGrandeCents).toBe(54490);
  });

  it('o histórico não dispara aviso de dupla contagem', () => {
    expect(r.avisos.filter((a) => a.includes('dupla contagem'))).toHaveLength(0);
  });
});

describe('Os quatro tipos de gasto fixo (§5)', () => {
  const base: MachaneInput = {
    diariaCents: 10000,
    diasGrandes: 6,
    diasPequenos: 4,
    categorias: [
      { id:'c', nome:'chanichim grandes', papel:'CHANICH', turma:'GRANDES', dias:6, quantidade:10, geraHospedagem:true, contribuicaoCents:0 },
    ],
    gastos: [],
    politica: {
      metodo: 'ADITIVO',
      acrescimoSegundaLevaCents: 10000,
      superavitAlvoCents: 0,
      arredondamento: 'NENHUM',
    },
  };

  it('VALOR_FECHADO usa o valor cheio', () => {
    const r = calcular({ ...base, gastos: [{ id:'1', descricao:'carne', tipo:'VALOR_FECHADO', categoria:'ALIMENTACAO', valorCents:800000 }] });
    expect(r.gastosFixosCents).toBe(800000);
  });

  it('POR_PESSOA multiplica pelo total de pessoas da machané', () => {
    const r = calcular({ ...base, gastos: [{ id:'1', descricao:'seguro', tipo:'POR_PESSOA', categoria:'SAUDE', valorCents:500 }] });
    expect(r.gastosFixosCents).toBe(5000); // 500 x 10 pessoas
  });

  it('POR_DIARIA usa a diária da machané, ignorando valorCents', () => {
    const r = calcular({ ...base, gastos: [{ id:'1', descricao:'diária enfermeria', tipo:'POR_DIARIA', categoria:'SAUDE', valorCents:999999, pessoas:1, dias:6 }] });
    expect(r.gastosFixosCents).toBe(60000); // 100,00 x 1 x 6
  });

  it('CACHE_DIARIO usa o cachê próprio, não a diária', () => {
    const r = calcular({ ...base, gastos: [{ id:'1', descricao:'segurança', tipo:'CACHE_DIARIO', categoria:'SEGURANCA', valorCents:82302, pessoas:1, dias:16 }] });
    expect(r.gastosFixosCents).toBe(1316832);
  });

  it('POR_DIARIA e CACHE_DIARIO sem pessoas/dias valem zero, não NaN', () => {
    const r = calcular({ ...base, gastos: [
      { id:'1', descricao:'x', tipo:'POR_DIARIA', categoria:'OUTROS', valorCents:0 },
      { id:'2', descricao:'y', tipo:'CACHE_DIARIO', categoria:'OUTROS', valorCents:5000 },
    ] });
    expect(r.gastosFixosCents).toBe(0);
  });

  it('soma a coleção inteira, inclusive a última linha (§13)', () => {
    const gastos = Array.from({ length: 40 }, (_, i) => ({
      id: String(i), descricao: `item ${i}`, tipo: 'VALOR_FECHADO' as const, categoria: 'OUTROS', valorCents: 100,
    }));
    expect(calcular({ ...base, gastos }).gastosFixosCents).toBe(4000);
  });
});

describe('Método multiplicativo', () => {
  const r = calcular({
    ...kaitz2026,
    politica: {
      metodo: 'MULTIPLICATIVO',
      margemBasePct: 0.03,
      acrescimoNaoSocioPct: 0.08,
      descontoSegundoFilhoPct: 0.05,
      acrescimoSegundaLevaCents: 10000,
      superavitAlvoCents: 0,
      arredondamento: 'NENHUM',
    },
  });

  it('aplica percentuais sobre o custo rateado', () => {
    expect(r.precosGrandes.primeiroFilhoSocio).toBe(Math.round(238349 * 1.03));
    expect(r.precosGrandes.primeiroFilhoNaoSocio).toBe(Math.round(238349 * 1.11));
    expect(r.precosGrandes.segundoFilhoSocio).toBe(Math.round(238349 * 0.98));
    expect(r.precosGrandes.segundoFilhoNaoSocio).toBe(Math.round(238349 * 1.06));
  });
});

describe('Arredondamento', () => {
  const comArredondamento = (modo: 'NENHUM' | 'DEZ' | 'CINQUENTA' | 'CEM') =>
    calcular({ ...kaitz2026, politica: { ...kaitz2026.politica, arredondamento: modo } })
      .precosGrandes.primeiroFilhoSocio;

  it('NENHUM mantém os centavos', () => expect(comArredondamento('NENHUM')).toBe(244749));
  it('DEZ arredonda para R$ 10', () => expect(comArredondamento('DEZ')).toBe(245000));
  it('CINQUENTA arredonda para R$ 50', () => expect(comArredondamento('CINQUENTA')).toBe(245000));
  it('CEM arredonda para R$ 100', () => expect(comArredondamento('CEM')).toBe(240000));
});

describe('Superávit-alvo e receita real de madrichim', () => {
  it('o superávit-alvo entra no rateio dos chanichim', () => {
    const r = calcular({ ...kaitz2026, politica: { ...kaitz2026.politica, superavitAlvoCents: 1000000 } });
    expect(r.aRatearCents).toBe(26245162 + 1000000);
    expect(r.superavitProjetadoCents).toBeGreaterThan(967214);
  });

  it('receitaMadrichimRealCents substitui a soma das contribuições', () => {
    const r = calcular({ ...kaitz2026, receitaMadrichimRealCents: 1800000 });
    expect(r.receitaMadrichimCents).toBe(1800000);
    expect(r.subsidioMadrichimCents).toBe(5184720 - 1800000);
    expect(r.aRatearCents).toBe(28373162 - 1800000);
  });

  it('zero é um total real válido, não cai no padrão', () => {
    const r = calcular({ ...kaitz2026, receitaMadrichimRealCents: 0 });
    expect(r.receitaMadrichimCents).toBe(0);
  });
});

describe('Casos degenerados', () => {
  const semChanichim: MachaneInput = {
    diariaCents: 17055,
    diasGrandes: 6,
    diasPequenos: 4,
    categorias: [
      { id:'1', nome:'madrichim grandes', papel:'MADRICH', turma:'GRANDES', dias:6, quantidade:5, geraHospedagem:true, contribuicaoCents:42000 },
    ],
    gastos: [{ id:'a', descricao:'carne', tipo:'VALOR_FECHADO', categoria:'ALIMENTACAO', valorCents:800000 }],
    politica: {
      metodo: 'ADITIVO',
      acrescimoSegundaLevaCents: 10000,
      superavitAlvoCents: 0,
      arredondamento: 'NENHUM',
    },
  };

  it('avisa quando não há chanich e não divide por zero', () => {
    const r = calcular(semChanichim);
    expect(r.avisos.some((a) => a.includes('Nenhum chanich'))).toBe(true);
    expect(r.custoPorChanichGrandesCents).toBe(0);
    expect(r.custoPorChanichPequenosCents).toBe(0);
    expect(r.pesoCalculado).toBe(0);
    expect(Number.isNaN(r.superavitProjetadoPct)).toBe(false);
  });

  it('avisa déficit quando os preços não cobrem o custo', () => {
    const r = calcular({
      ...kaitz2026,
      politica: { ...kaitz2026.politica, margemBaseGrandesCents: -100000, margemBasePequenosCents: -100000 },
    });
    expect(r.superavitProjetadoCents).toBeLessThan(0);
    expect(r.avisos.some((a) => a.includes('DÉFICIT'))).toBe(true);
  });

  it('só pequenos: todo o custo vai para eles', () => {
    const r = calcular({
      ...kaitz2026,
      pesoOverride: null,
      categorias: kaitz2026.categorias.filter((c) => c.nome !== 'chanichim grandes'),
    });
    expect(r.pesoCalculado).toBe(0);
    expect(r.custoPorChanichGrandesCents).toBe(0);
    expect(r.custoPorChanichPequenosCents).toBe(Math.round(r.aRatearCents / 17));
  });
});

describe('Detector de dupla contagem (§6)', () => {
  it('acusa categoria com hospedagem + linha POR_DIARIA da mesma gente', () => {
    const avisos = avisosDuplaContagem(
      [{ id:'1', nome:'seguranca 6 dias', papel:'PRESTADOR', turma:'GRANDES', dias:6, quantidade:2, geraHospedagem:true, contribuicaoCents:0 }],
      [{ id:'a', descricao:'diária seguranças', tipo:'POR_DIARIA', categoria:'SEGURANCA', valorCents:0, pessoas:2, dias:6 }],
    );
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('Possível dupla contagem');
    expect(avisos[0]).toContain('seguranca 6 dias');
  });

  it('fica calado quando a categoria não gera hospedagem (modelo histórico)', () => {
    const avisos = avisosDuplaContagem(
      [{ id:'1', nome:'seguranca 6 dias', papel:'PRESTADOR', turma:'GRANDES', dias:6, quantidade:2, geraHospedagem:false, contribuicaoCents:0 }],
      [{ id:'a', descricao:'diária seguranças', tipo:'POR_DIARIA', categoria:'SEGURANCA', valorCents:0, pessoas:2, dias:6 }],
    );
    expect(avisos).toHaveLength(0);
  });

  it('fica calado quando o gasto não é POR_DIARIA', () => {
    const avisos = avisosDuplaContagem(
      [{ id:'1', nome:'seguranca 6 dias', papel:'PRESTADOR', turma:'GRANDES', dias:6, quantidade:2, geraHospedagem:true, contribuicaoCents:0 }],
      [{ id:'a', descricao:'segurança (cachê)', tipo:'CACHE_DIARIO', categoria:'SEGURANCA', valorCents:82302, pessoas:1, dias:16 }],
    );
    expect(avisos).toHaveLength(0);
  });

  it('não confunde turmas: "chanichim grandes" x "diária mecha"', () => {
    const avisos = avisosDuplaContagem(
      [{ id:'1', nome:'chanichim grandes', papel:'CHANICH', turma:'GRANDES', dias:6, quantidade:98, geraHospedagem:true, contribuicaoCents:0 }],
      [{ id:'a', descricao:'diária mecha', tipo:'POR_DIARIA', categoria:'ESTRUTURA', valorCents:0, pessoas:1, dias:6 }],
    );
    expect(avisos).toHaveLength(0);
  });

  it('entra no resultado do motor quando o risco existe', () => {
    const r = calcular({
      ...kaitz2026,
      categorias: kaitz2026.categorias.map((c) =>
        c.nome.startsWith('seguranca') ? { ...c, geraHospedagem: true } : c,
      ),
    });
    expect(r.avisos.some((a) => a.includes('dupla contagem'))).toBe(true);
  });
});
