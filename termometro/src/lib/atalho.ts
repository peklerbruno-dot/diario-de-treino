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
import { dataExiste } from "./datas";
import { acharCategoria, type Categoria } from "./categorias";
import { aoReal, comCifrao, paraCentavos, parcelas, TETO_CENTS } from "./dinheiro";
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
  /** Uma frase com o valor dentro, como a notificação do banco. Só vale sem `valor`. */
  texto?: unknown;
  categoria?: unknown;
  tipo?: unknown;
  data?: unknown;
  nota?: unknown;
  rendaPropria?: unknown;
  investimento?: unknown;
  apartamento?: unknown;
}

/**
 * Os campos que vierem no próprio endereço.
 *
 * Montar o corpo JSON dentro do app Atalhos é o passo em que todo mundo trava:
 * é um menu dentro de outro, e a variável do valor tem de ser escolhida lá no
 * fundo. Pelo endereço some tudo isso — o valor vai grudado no fim do endereço,
 * e o atalho fica com quatro ajustes em vez de sete.
 *
 * O **código nunca é lido daqui**, e isso é regra, não descuido: endereço fica
 * gravado em registro de servidor e em histórico, e o código é a chave do
 * dinheiro de alguém. O valor não é segredo do mesmo tamanho; o código é.
 */
export function camposDoEndereco(url: string): Record<string, string> {
  const campos: Record<string, string> = {};
  let busca: URLSearchParams;
  try {
    busca = new URL(url).searchParams;
  } catch {
    return campos;
  }
  for (const nome of ACEITOS_NO_ENDERECO) {
    const valor = busca.get(nome);
    if (valor !== null) campos[nome] = valor;
  }
  return campos;
}

const ACEITOS_NO_ENDERECO = [
  "valor",
  "texto",
  "categoria",
  "tipo",
  "data",
  "nota",
  "rendaPropria",
  "investimento",
  "apartamento",
] as const;

/**
 * O valor dentro de uma frase em português, como a notificação do banco:
 * "Recebemos sua transferência de R$ 1,00." → "1,00".
 *
 * Só vale quando a frase tem **um** valor em reais. Com dois ("Pix de R$ 50,00,
 * saldo R$ 1.200,00") o app não escolhe: lançar o número errado é pior do que
 * não lançar, e a notificação do atalho diz o que aconteceu. Valor repetido
 * (o mesmo número duas vezes) conta como um só.
 */
export function valorNoTexto(
  texto: string,
): { ok: true; valor: string } | { ok: false; erro: string } {
  const achados = new Set<string>();
  for (const m of texto.matchAll(/R\$\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/gi)) {
    const inteiro = m[1].replace(/\./g, "");
    achados.add(m[2] ? `${inteiro},${m[2]}` : inteiro);
  }
  if (achados.size === 0) return { ok: false, erro: "Não achei um valor em reais no texto." };
  if (achados.size > 1) {
    return {
      ok: false,
      erro: `Achei mais de um valor no texto (${[...achados].join(" e ")}) e não sei qual lançar.`,
    };
  }
  return { ok: true, valor: [...achados][0] };
}

/**
 * O nome da loja dentro da notificação do banco:
 * "R$ 53,58 no débito com NuPay APROVADO em KeetaBR." → "KeetaBR".
 *
 * É o que deixa a categoria automática funcionar sem o Apple Pay: a loja vira
 * a nota, e a nota lembra a categoria. Sem "APROVADO em", devolve nulo — um
 * texto que o app não reconhece não ganha uma loja inventada.
 */
export function lojaNoTexto(texto: string): string | null {
  // "…APROVADO em KeetaBR." (NuPay) e "Compra de R$ 17,00 em ACADEMIA CEMI"
  // (débito e crédito): a loja é o resto da linha depois do "em".
  const m =
    /aprovad[oa]\s+em\s+([^\n]+)/i.exec(texto) ??
    /compra\s+de\s+R\$\s*[\d.,]+\s+em\s+([^\n]+)/i.exec(texto);
  if (!m) return null;
  const loja = m[1]
    .trim()
    .replace(/[.\s]+$/, "")
    .trim();
  return loja ? loja.slice(0, 120) : null;
}

/**
 * O que a notificação do banco quer dizer, quando o pedido não diz o tipo.
 *
 * Com uma automação só para o Nubank, o app é quem decide: compra (débito,
 * crédito, NuPay) é gasto do dia; "Recebemos sua transferência" é entrada. O
 * resto — promoção, aviso de fatura, "ganhe R$ 20" — não vira lançamento: um
 * número solto numa propaganda não é gasto, e lançar errado é pior do que
 * não lançar.
 *
 * Só vale sem `tipo`: quem manda `tipo` (o atalho do Pix recebido) disse o que
 * é, e continua valendo.
 */
export function classificarNotificacao(
  texto: string,
): { ok: true; tipo: Tipo; nota: string | null } | { ok: false; erro: string } {
  const loja = lojaNoTexto(texto);
  const compra =
    loja !== null || /R\$\s*[\d.,]+\s+no\s+d[ée]bito|R\$\s*[\d.,]+\s+no\s+cr[ée]dito/i.test(texto);
  if (compra) return { ok: true, tipo: "DIARIO", nota: loja };

  if (
    /recebemos\s+sua\s+transfer|voc[êe]\s+recebeu|transfer[êe]ncia\s+recebida|pix\s+recebido/i.test(
      texto,
    )
  ) {
    return { ok: true, tipo: "ENTRADA", nota: "Pix" };
  }
  return {
    ok: false,
    erro: "Não reconheci esta notificação como compra nem como Pix recebido, então não lancei nada.",
  };
}

export type LeituraDoPedido =
  | {
      ok: true;
      lancamentos: Lancamento[];
      /** O que foi falado e não casou com categoria nenhuma. */
      categoriaNaoAchada?: string;
    }
  | { ok: false; erro: string };

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
  opcoes: {
    agora?: string;
    hoje?: string;
    novoId?: () => string;
    categorias?: readonly Categoria[];
  } = {},
): LeituraDoPedido {
  let texto = comoTexto(corpo.valor);
  let automatico: { tipo: Tipo; nota: string | null } | null = null;
  if (texto === null || texto.trim() === "") {
    // Sem valor, mas com uma frase que o tenha dentro (a notificação do banco):
    // o app tira o número dela, em vez de exigir que o atalho o separe.
    const frase = comoTexto(corpo.texto);
    if (frase !== null && frase.trim() !== "") {
      // Sem `tipo`, é o app quem diz o que a notificação é.
      if (!comoTexto(corpo.tipo)?.trim()) {
        const classe = classificarNotificacao(frase);
        if (!classe.ok) return classe;
        automatico = classe;
      }
      const achado = valorNoTexto(frase);
      if (!achado.ok) return achado;
      texto = achado.valor;
    }
  }
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
  const tipo: Tipo = pedido ? (TIPOS_ACEITOS[pedido] ?? "DIARIO") : (automatico?.tipo ?? "DIARIO");
  if (pedido && !TIPOS_ACEITOS[pedido]) {
    return { ok: false, erro: `Não conheço o tipo "${pedido}". Use entrada, saída ou diário.` };
  }

  const data = ehData(corpo.data) ? corpo.data : (opcoes.hoje ?? hojeNoFuso());
  // Ter a forma AAAA-MM-DD não basta: "2026-02-30" tem a forma certa e não
  // existe no calendário. Um lançamento num dia inexistente sumiria da tela do
  // mês, que só desenha os dias de verdade.
  if (!dataExiste(data)) {
    return { ok: false, erro: `A data "${data}" não existe.` };
  }

  const agora = opcoes.agora ?? new Date().toISOString();
  const novoId = opcoes.novoId ?? (() => crypto.randomUUID());
  // Sem nota dita, a loja da notificação do banco vira a nota.
  const nota =
    comoTexto(corpo.nota)?.trim() ||
    lojaNoTexto(comoTexto(corpo.texto) ?? "") ||
    automatico?.nota ||
    null;

  // Categoria que não casou não derruba o lançamento: o valor entra, e a
  // notificação avisa. Perder o gasto porque a Siri ouviu "farmássia" seria
  // desfazer justamente o que o atalho veio resolver.
  const falada = comoTexto(corpo.categoria)?.trim() || null;
  const achada = falada ? acharCategoria(opcoes.categorias ?? [], falada, tipo) : null;

  const lancamentos = valores
    .filter((v) => v !== 0)
    .map<Lancamento>((valorCents) => ({
      id: novoId(),
      data,
      tipo,
      valorCents: aoReal(valorCents),
      categoria: achada?.id ?? null,
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

  return falada && !achada
    ? { ok: true, lancamentos, categoriaNaoAchada: falada }
    : { ok: true, lancamentos };
}

/** "R$ 38,50" e "38,50 reais" — o cifrão e a palavra saem, o número fica. */
const CIFRAO_NA_FRENTE = /^r\$\s*/;
const REAIS_NO_FIM = /^([0-9.,]+)\s*(?:reais|real)$/;
/** O sinal passa por aqui de propósito: quem recusa valor negativo, com uma
 *  frase que ensina a escolher a coluna, é a leitura do pedido, logo adiante. */
const SO_NUMERO = /^-?[0-9.,]+$/;
/** "38 reais e 50", "38 reais e 50 centavos", "38 reais 50". */
const REAIS_E_CENTAVOS = /^(\d+)\s*(?:reais|real)\s*(?:e\s*)?(\d{1,2})\s*(centavos?)?$/;
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

  const noTeto = (valores: number[]) => valores.every((v) => v <= TETO_CENTS);

  const comCentavos = REAIS_E_CENTAVOS.exec(limpo);
  if (comCentavos) {
    const reais = Number(comCentavos[1]);
    // Com a palavra "centavos" dita, o dígito é literal: "5 centavos" são
    // R$ 0,05, completado à esquerda. Sem ela, vale a leitura decimal: "38
    // reais e 5" é R$ 38,50. A leitura antiga completava sempre à direita e
    // "38 reais e 5 centavos" virava R$ 38,50 — confirmado como R$ 39.
    const digito = comCentavos[2];
    const disseCentavos = !!comCentavos[3];
    const centavos = disseCentavos
      ? Number(digito.padStart(2, "0"))
      : Number((digito + "0").slice(0, 2));
    const valores = [reais * 100 + centavos];
    if (!noTeto(valores)) return { ok: false, erro: NAO_ENTENDI(texto) };
    return { ok: true, valores };
  }

  const redondos = SO_REAIS.exec(limpo);
  if (redondos) {
    // O teto vale também para o que é dito: um valor absurdo estourava o
    // inteiro do banco e envenenava a sincronização.
    const valores = [Number(redondos[1]) * 100];
    if (!noTeto(valores)) return { ok: false, erro: NAO_ENTENDI(texto) };
    return { ok: true, valores };
  }

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
export function recadoDoAtalho(
  lancamentos: Lancamento[],
  saldoDoDiaCents: number,
  categoria?: { nome?: string; naoAchada?: string },
): string {
  const total = lancamentos.reduce((soma, l) => soma + l.valorCents, 0);
  const quantos = lancamentos.length > 1 ? `${lancamentos.length} lançamentos, ` : "";
  const como = COMO_SE_DIZ[lancamentos[0]?.tipo ?? "DIARIO"];

  // A categoria é dita de volta de propósito: é assim que um "farmácia" ouvido
  // como "farmássia" aparece na hora, em vez de virar um total errado que só se
  // descobre no fim do mês.
  const onde = categoria?.nome
    ? ` em ${categoria.nome}`
    : categoria?.naoAchada
      ? ` (não achei a categoria "${categoria.naoAchada}")`
      : "";

  return `${quantos}${comCifrao(total)} ${como}${onde}. Saldo de hoje: ${comCifrao(saldoDoDiaCents)}.`;
}
