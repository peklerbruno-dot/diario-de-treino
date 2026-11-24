import { gerarPrevisao } from "./calculo";
import type { Fixo, Lancamento } from "./tipos";

/**
 * O que acontece com a previsão já escrita quando um fixo muda.
 *
 * Editar o aluguel de R$ 2.000 para R$ 2.200, mudar o dia dele, ou desligá-lo,
 * deixava os treze meses de previsto como estavam: o app mostrava o valor
 * velho, no dia velho, para sempre. Aqui a previsão acompanha o fixo — só a que
 * ainda não aconteceu (previsto, de hoje em diante). O que já foi confirmado, e
 * o passado, é história e não se mexe.
 *
 * - **Desligado** (`ativo: false`) ou **regra de dia mudou**: os previstos
 *   futuros saem. Eles são soltos do fixo (`fixoId: null`) ao sair, e é isso
 *   que deixa a previsão escrever de novo o dia certo: um previsto apagado do
 *   fixo conta como "decisão da pessoa" e bloquearia a recriação.
 * - **Valor, nota, categoria, marcas** mudaram: atualiza no lugar. Um previsto
 *   que a pessoa já tinha editado à mão (valor diferente do fixo antigo) fica
 *   como ela deixou.
 */
export function reajustarPrevistos(opcoes: {
  anterior: Fixo | undefined;
  novo: Fixo;
  lancamentos: readonly Lancamento[];
  hoje: string;
  /** Até onde a previsão vai (a mesma conta de "Preencher previsão"). */
  ate: string;
  agora: string;
  novoId?: () => string;
}): { salvar: Lancamento[] } {
  const { anterior, novo, lancamentos, hoje, ate, agora } = opcoes;
  if (!anterior) return { salvar: [] };

  const futuros = lancamentos.filter(
    (l) => l.fixoId === novo.id && l.previsto && !l.apagadoEm && l.data >= hoje,
  );
  if (futuros.length === 0 && novo.ativo !== false) {
    // Nada escrito ainda: se a regra mudou não há o que reescrever, a previsão
    // nasce certa no próximo "Preencher".
    return { salvar: [] };
  }

  const regraMudou =
    (anterior.repeticao ?? null) !== (novo.repeticao ?? null) || anterior.dia !== novo.dia;
  const desligado = novo.ativo === false && anterior.ativo !== false;
  const ligadoDeNovo = novo.ativo !== false && anterior.ativo === false;

  const salvar: Lancamento[] = [];

  if (desligado || regraMudou) {
    const soltos = futuros.map<Lancamento>((l) => ({
      ...l,
      fixoId: null,
      apagadoEm: agora,
      atualizadoEm: agora,
    }));
    salvar.push(...soltos);
    if (!desligado) {
      // A regra mudou e o fixo continua valendo: escreve de novo, no dia certo.
      const restantes = lancamentos.filter((l) => !soltos.some((s) => s.id === l.id));
      salvar.push(
        ...gerarPrevisao({
          fixos: [novo],
          de: hoje,
          ate,
          existentes: [...restantes],
          agora,
          novoId: opcoes.novoId,
        }),
      );
    }
    return { salvar };
  }

  if (ligadoDeNovo) return { salvar: [] }; // volta com "Preencher previsão"

  for (const l of futuros) {
    const mudou: Lancamento = { ...l };
    // Só o que ainda é igual ao fixo antigo acompanha o novo.
    if (l.valorCents === anterior.valorCents) mudou.valorCents = novo.valorCents;
    if ((l.nota ?? null) === (anterior.nota ?? null)) mudou.nota = novo.nota ?? null;
    if ((l.categoria ?? null) === (anterior.categoria ?? null))
      mudou.categoria = novo.categoria ?? null;
    mudou.rendaPropria = !!novo.rendaPropria;
    mudou.investimento = !!novo.investimento;
    mudou.apartamento = !!novo.apartamento;
    mudou.tipo = novo.tipo;

    const igual =
      mudou.valorCents === l.valorCents &&
      (mudou.nota ?? null) === (l.nota ?? null) &&
      (mudou.categoria ?? null) === (l.categoria ?? null) &&
      mudou.rendaPropria === !!l.rendaPropria &&
      mudou.investimento === !!l.investimento &&
      mudou.apartamento === !!l.apartamento &&
      mudou.tipo === l.tipo;
    if (!igual) salvar.push({ ...mudou, atualizadoEm: agora });
  }
  return { salvar };
}
