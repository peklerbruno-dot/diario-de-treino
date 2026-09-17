/**
 * A porta de trás, para o atalho do iPhone.
 *
 * O caso que ela existe para resolver é o de sempre: você paga o almoço, guarda
 * o celular, e não anota. Abrir o app, achar o botão, digitar — são uns quinze
 * segundos, e quinze segundos bastam para a gente deixar para depois. Pelo
 * atalho é um toque e o valor.
 *
 * Aqui mora só a parte que não depende de banco nem de rede: ler o que o atalho
 * mandou e montar os lançamentos. É o que dá para testar sem servidor nenhum.
 */
import { diasNoMes, partesDaData } from "./datas";
import { comCifrao, paraCentavos, parcelas } from "./dinheiro";
import type { Lancamento, Tipo } from "./tipos";

const TIPOS_ACEITOS: Record<string, Tipo> = {
  entrada: "ENTRADA",
  entradas: "ENTRADA",
  saida: "SAIDA",
  saída: "SAIDA",
  saidas: "SAIDA",
  diario: "DIARIO",
  diário: "DIARIO",
  gasto: "DIARIO",
};

const FUSO_PADRAO = "America/Sao_Paulo";

/**
 * Que dia é hoje — no fuso de quem usa o app, não no do servidor.
 *
 * O servidor da Vercel vive em UTC. Sem isto, um gasto lançado às dez da noite
 * em São Paulo nasceria no dia seguinte, e o saldo do dia sairia errado bem na
 * hora em que a pessoa mais olha para ele.
 */
export function hojeNoFuso(fuso: string = FUSO_PADRAO, agora: Date = new Date()): string {
  // "en-CA" formata como AAAA-MM-DD, que é exatamente a forma que guardamos.
  return new Intl.DateTimeFormat("en-CA", { timeZone: fuso }).format(agora);
}

export interface PedidoDoAtalho {
  valor?: unknown;
  tipo?: unknown;
  data?: unknown;
  nota?: unknown;
  rendaPropria?: unknown;
  investimento?: unknown;
  apartamento?: unknown;
}

export type LeituraDoPedido = { ok: true; lancamentos: Lancamento[] } | { ok: false; erro: string };

const ehData = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

function comoTexto(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function comoBooleano(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return ["1", "sim", "true", "yes"].includes(v.trim().toLowerCase());
  return v === 1;
}

/**
 * Lê o que o atalho mandou e devolve os lançamentos prontos.
 *
 * Só `valor` é obrigatório. Sem tipo, é gasto do dia a dia — que é o caso de
 * quase toda vez que alguém saca o celular para anotar. Sem data, é hoje.
 */
export function lerPedidoDoAtalho(
  corpo: PedidoDoAtalho,
  opcoes: { agora?: string; hoje?: string; novoId?: () => string } = {},
): LeituraDoPedido {
  const texto = comoTexto(corpo.valor);
  if (texto === null || texto.trim() === "") {
    return { ok: false, erro: "Faltou o valor." };
  }

  const leitura = lerValor(texto);
  if (!leitura.ok) return leitura;
  const valores = leitura.valores;
  if (valores.some((v) => v < 0)) {
    return {
      ok: false,
      erro: "O valor não pode ser negativo: escolha a coluna (entrada ou saída) em vez do sinal.",
    };
  }

  const pedido = comoTexto(corpo.tipo)?.trim().toLowerCase();
  const tipo: Tipo = pedido ? (TIPOS_ACEITOS[pedido] ?? "DIARIO") : "DIARIO";
  if (pedido && !TIPOS_ACEITOS[pedido]) {
    return { ok: false, erro: `Não conheço o tipo "${pedido}". Use entrada, saída ou diário.` };
  }

  const data = ehData(corpo.data) ? corpo.data : (opcoes.hoje ?? hojeNoFuso());
  // Ter a forma AAAA-MM-DD não basta: "2026-02-30" tem a forma certa e não
  // existe no calendário. Um lançamento num dia inexistente sumiria da tela do
  // mês, que só desenha os dias de verdade.
  const { ano, mes, dia } = partesDaData(data);
  if (mes < 1 || mes > 12 || dia < 1 || dia > diasNoMes(ano, mes)) {
    return { ok: false, erro: `A data "${data}" não existe.` };
  }

  const agora = opcoes.agora ?? new Date().toISOString();
  const novoId = opcoes.novoId ?? (() => crypto.randomUUID());
  const nota = comoTexto(corpo.nota)?.trim() || null;

  const lancamentos = valores
    .filter((v) => v !== 0)
    .map<Lancamento>((valorCents) => ({
      id: novoId(),
      data,
      tipo,
      valorCents,
      nota,
      previsto: false,
      rendaPropria: tipo === "ENTRADA" && comoBooleano(corpo.rendaPropria),
      investimento: tipo === "SAIDA" && comoBooleano(corpo.investimento),
      apartamento: tipo === "SAIDA" && comoBooleano(corpo.apartamento),
      fixoId: null,
      criadoEm: agora,
      atualizadoEm: agora,
      apagadoEm: null,
    }));

  return { ok: true, lancamentos };
}

/** "R$ 38,50" e "38,50 reais" — o cifrão e a palavra saem, o número fica. */
const CIFRAO_NA_FRENTE = /^r\$\s*/;
const REAIS_NO_FIM = /^([0-9.,]+)\s*(?:reais|real)$/;
/** O sinal passa por aqui de propósito: quem recusa valor negativo, com uma
 *  frase que ensina a escolher a coluna, é a leitura do pedido, logo adiante. */
const SO_NUMERO = /^-?[0-9.,]+$/;
/** "38 reais e 50", "38 reais e 50 centavos", "38 reais 50". */
const REAIS_E_CENTAVOS = /^(\d+)\s*(?:reais|real)\s*(?:e\s*)?(\d{1,2})\s*(?:centavos?)?$/;
/** "38 reais", "1 real". */
const SO_REAIS = /^(\d+)\s*(?:reais|real)$/;

const NAO_ENTENDI = (texto: string) =>
  `Não entendi o valor "${texto}". Diga só o número — "38,50" — ou por extenso, ` +
  `"38 reais e 50 centavos".`;

/**
 * O valor, lido do jeito que ele chega.
 *
 * Digitado ele vem limpo. Ditado à Siri ele vem com palavra no meio, e aqui
 * mora o motivo de esta função existir: a leitura antiga apagava tudo o que não
 * fosse dígito, então **"38 reais e 50" virava R$ 3.850,00** — o valor errado,
 * em silêncio, no saldo. Um erro que ninguém percebe é pior do que uma recusa.
 *
 * Então: as formas faladas que não têm outra leitura possível são entendidas
 * ("38 reais e 50 centavos" só pode ser R$ 38,50), e o resto é recusado com uma
 * frase que diz como falar. "38 e 50" fica de fora de propósito — pode ser
 * trinta e oito e cinquenta centavos, pode ser dois valores, e adivinhar aqui é
 * colocar dinheiro errado na conta de alguém.
 */
function lerValor(texto: string): { ok: true; valores: number[] } | { ok: false; erro: string } {
  const limpo = texto.trim().toLowerCase().replace(CIFRAO_NA_FRENTE, "").trim();

  // A soma da planilha continua valendo, e ela só existe digitada.
  if (limpo.includes("+")) {
    const partes = limpo.split("+").map((p) => p.trim().replace(CIFRAO_NA_FRENTE, "").trim());
    if (!partes.every((p) => SO_NUMERO.test(p))) return { ok: false, erro: NAO_ENTENDI(texto) };
    const valores = parcelas(partes.join("+"));
    if (!valores || valores.every((v) => v === 0)) return { ok: false, erro: NAO_ENTENDI(texto) };
    return { ok: true, valores };
  }

  const comCentavos = REAIS_E_CENTAVOS.exec(limpo);
  if (comCentavos) {
    const reais = Number(comCentavos[1]);
    const centavos = Number((comCentavos[2] + "0").slice(0, 2));
    return { ok: true, valores: [reais * 100 + centavos] };
  }

  const redondos = SO_REAIS.exec(limpo);
  if (redondos) return { ok: true, valores: [Number(redondos[1]) * 100] };

  const numero = REAIS_NO_FIM.exec(limpo)?.[1] ?? (SO_NUMERO.test(limpo) ? limpo : null);
  if (numero === null) return { ok: false, erro: NAO_ENTENDI(texto) };

  const cents = paraCentavos(numero);
  if (cents === null || cents === 0) return { ok: false, erro: NAO_ENTENDI(texto) };
  return { ok: true, valores: [cents] };
}

const COMO_SE_DIZ: Record<Tipo, string> = {
  ENTRADA: "entrou",
  SAIDA: "saiu",
  DIARIO: "no diário",
};

/**
 * A frase que o atalho mostra na notificação.
 *
 * É ela que fecha o gesto: sem abrir o app, você já sabe que entrou e quanto
 * sobrou. Sem isso o atalho vira um ato de fé.
 */
export function recadoDoAtalho(lancamentos: Lancamento[], saldoDoDiaCents: number): string {
  const total = lancamentos.reduce((soma, l) => soma + l.valorCents, 0);
  const quantos = lancamentos.length > 1 ? `${lancamentos.length} lançamentos, ` : "";
  const como = COMO_SE_DIZ[lancamentos[0]?.tipo ?? "DIARIO"];
  return `${quantos}${comCifrao(total)} ${como}. Saldo de hoje: ${comCifrao(saldoDoDiaCents)}.`;
}
