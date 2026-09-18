/**
 * O calendário que o Google lê.
 *
 * Um arquivo `.ics` publicado num endereço secreto. Cada pessoa assina o dela
 * uma vez, no Google Agenda, e dali em diante as atividades e reuniões do
 * Centro aparecem dentro da agenda dela e se atualizam sozinhas — sem ninguém
 * autorizar aplicativo nenhum, sem chave de Google Cloud, sem custo.
 *
 * É de mão única: o que se escreve aqui vai para o Google; o que se escreve no
 * Google não volta. Para mão dupla é preciso a API do Google Calendar, com
 * credenciais — e o campo `googleEventoId` no banco já espera por isso.
 *
 * Funções puras, sem banco e sem tela: `src/lib/agenda.test.ts` prende cada
 * regra de formato. Formato de calendário é um daqueles lugares onde um erro de
 * uma vírgula não dá erro nenhum — simplesmente nada aparece na agenda, e
 * ninguém descobre por quê.
 */

export type EventoDaAgenda = {
  /** Único e estável: se mudar, o Google cria um evento novo em vez de atualizar. */
  uid: string;
  titulo: string;
  dia: string;
  hora: string | null;
  diaFinal: string | null;
  horaFinal: string | null;
  local: string | null;
  descricao: string | null;
  cancelado: boolean;
  /** Para a agenda mostrar "Reunião: pauta da semana" e não só o título. */
  prefixo?: string;
};

/**
 * O título como ele aparece na agenda.
 *
 * O prefixo não se repete: uma reunião chamada "Reunião de planejamento" viraria
 * "Reunião: Reunião de planejamento", e é assim que ela apareceria na agenda de
 * todo mundo. O nome que a equipe deu à reunião quase sempre já começa com a
 * palavra.
 */
export function tituloDoEvento(evento: EventoDaAgenda): string {
  if (!evento.prefixo) return evento.titulo;
  const jaDiz = evento.titulo
    .toLocaleLowerCase("pt-BR")
    .startsWith(evento.prefixo.toLocaleLowerCase("pt-BR"));
  return jaDiz ? evento.titulo : `${evento.prefixo}: ${evento.titulo}`;
}

const FUSO = "America/Sao_Paulo";

/** Quanto dura uma atividade sem hora de término declarada. */
const DURACAO_PADRAO_MINUTOS = 120;

/**
 * Texto dentro de um `.ics` escapa quatro coisas, e nessa ordem — a barra
 * primeiro, senão ela escaparia as barras que as outras acabaram de pôr.
 */
function escapar(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Nenhuma linha passa de 75 octetos; o resto continua na linha seguinte,
 * começando por um espaço. A conta é em *octetos*, não em letras — "Simpósio"
 * tem 8 letras e 9 octetos, e dobrar no lugar errado quebra o acento em duas
 * linhas, o que dá um caractere inválido no meio do nome do evento.
 */
function dobrar(linha: string): string[] {
  const bytes = Buffer.from(linha, "utf8");
  if (bytes.length <= 75) return [linha];

  const pedacos: string[] = [];
  let inicio = 0;
  let limite = 75;

  while (inicio < bytes.length) {
    let fim = Math.min(inicio + limite, bytes.length);
    // Não cortar no meio de um caractere de vários octetos: os de continuação
    // começam com os bits 10xxxxxx.
    while (fim > inicio && fim < bytes.length && (bytes[fim] & 0xc0) === 0x80) fim--;
    pedacos.push(bytes.subarray(inicio, fim).toString("utf8"));
    inicio = fim;
    limite = 74; // as linhas seguintes gastam um octeto com o espaço da frente
  }

  return pedacos.map((p, i) => (i === 0 ? p : ` ${p}`));
}

const semTraços = (dia: string) => dia.replace(/-/g, "");
const semDoisPontos = (hora: string) => hora.replace(":", "");

/** "2026-06-03" + "19:00" → "20260603T190000" */
const carimbo = (dia: string, hora: string) => `${semTraços(dia)}T${semDoisPontos(hora)}00`;

function somarMinutos(dia: string, hora: string, minutos: number): { dia: string; hora: string } {
  const [ano, mes, d] = dia.split("-").map(Number);
  const [h, m] = hora.split(":").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, d, h, m + minutos));
  return {
    dia: data.toISOString().slice(0, 10),
    hora: data.toISOString().slice(11, 16),
  };
}

const somarUmDia = (dia: string) => {
  const [ano, mes, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, d + 1)).toISOString().slice(0, 10);
};

/**
 * O fuso, declarado dentro do próprio arquivo.
 *
 * Sem este bloco, um `TZID=America/Sao_Paulo` fica pendurado num fuso que o
 * arquivo nunca definiu: o Google costuma adivinhar, outros programas jogam o
 * evento para UTC — três horas adiante, num horário em que ninguém aparece.
 *
 * Um bloco só, sem horário de verão: o Brasil não tem mais desde 2019. Se um
 * dia voltar, é aqui que entra um segundo bloco `DAYLIGHT`.
 */
const BLOCO_DO_FUSO = [
  "BEGIN:VTIMEZONE",
  `TZID:${FUSO}`,
  "BEGIN:STANDARD",
  "DTSTART:20190217T000000",
  "TZOFFSETFROM:-0200",
  "TZOFFSETTO:-0300",
  "TZNAME:-03",
  "END:STANDARD",
  "END:VTIMEZONE",
];

function linhasDoEvento(evento: EventoDaAgenda, carimboDeAgora: string): string[] {
  const linhas = ["BEGIN:VEVENT", `UID:${evento.uid}`, `DTSTAMP:${carimboDeAgora}`];

  if (evento.hora) {
    const fim = evento.horaFinal
      ? { dia: evento.diaFinal ?? evento.dia, hora: evento.horaFinal }
      : somarMinutos(evento.diaFinal ?? evento.dia, evento.hora, DURACAO_PADRAO_MINUTOS);

    linhas.push(`DTSTART;TZID=${FUSO}:${carimbo(evento.dia, evento.hora)}`);
    linhas.push(`DTEND;TZID=${FUSO}:${carimbo(fim.dia, fim.hora)}`);
  } else {
    // Dia inteiro. O fim é *exclusivo* no formato: uma atividade de um dia só
    // termina no dia seguinte, senão ela não aparece em lugar nenhum.
    linhas.push(`DTSTART;VALUE=DATE:${semTraços(evento.dia)}`);
    linhas.push(`DTEND;VALUE=DATE:${semTraços(somarUmDia(evento.diaFinal ?? evento.dia))}`);
  }

  linhas.push(`SUMMARY:${escapar(tituloDoEvento(evento))}`);
  if (evento.local) linhas.push(`LOCATION:${escapar(evento.local)}`);
  if (evento.descricao) linhas.push(`DESCRIPTION:${escapar(evento.descricao)}`);

  // Cancelado não some do calendário: aparece riscado. É o que faz alguém que
  // já tinha se programado entender que não precisa mais ir.
  linhas.push(`STATUS:${evento.cancelado ? "CANCELLED" : "CONFIRMED"}`);
  linhas.push("END:VEVENT");

  return linhas;
}

export function montarIcs(
  eventos: EventoDaAgenda[],
  opcoes: { nome: string; agora?: Date } = { nome: "Centro de Estudos Judaicos" },
): string {
  const agora = opcoes.agora ?? new Date();
  const carimboDeAgora = `${agora.toISOString().slice(0, 19).replace(/[-:]/g, "")}Z`;

  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Centro de Estudos Judaicos USP//Sistema//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapar(opcoes.nome)}`,
    `X-WR-TIMEZONE:${FUSO}`,
    // Meia hora. O Google respeita como pedido, não como ordem, mas sem a linha
    // ele costuma buscar uma vez por dia — e uma reunião remarcada de manhã
    // precisa chegar à agenda antes da tarde.
    "REFRESH-INTERVAL;VALUE=DURATION:PT30M",
    "X-PUBLISHED-TTL:PT30M",
    ...BLOCO_DO_FUSO,
    ...eventos.flatMap((e) => linhasDoEvento(e, carimboDeAgora)),
    "END:VCALENDAR",
  ];

  // O formato exige CRLF. Com \n sozinho, parte dos programas lê o arquivo
  // inteiro como uma linha só e não acha evento nenhum.
  return linhas.flatMap(dobrar).join("\r\n") + "\r\n";
}

/**
 * O link "adicionar ao Google Agenda" de um evento só.
 *
 * Serve para o que a assinatura não serve: mandar uma palestra para alguém de
 * fora da equipe — um palestrante, um professor convidado — sem que a pessoa
 * precise assinar o calendário do Centro inteiro.
 */
export function linkDoGoogle(evento: EventoDaAgenda): string {
  const p = new URLSearchParams();
  p.set("action", "TEMPLATE");
  p.set("text", tituloDoEvento(evento));

  if (evento.hora) {
    const fim = evento.horaFinal
      ? { dia: evento.diaFinal ?? evento.dia, hora: evento.horaFinal }
      : somarMinutos(evento.diaFinal ?? evento.dia, evento.hora, DURACAO_PADRAO_MINUTOS);
    p.set("dates", `${carimbo(evento.dia, evento.hora)}/${carimbo(fim.dia, fim.hora)}`);
    p.set("ctz", FUSO);
  } else {
    p.set(
      "dates",
      `${semTraços(evento.dia)}/${semTraços(somarUmDia(evento.diaFinal ?? evento.dia))}`,
    );
  }

  if (evento.local) p.set("location", evento.local);
  if (evento.descricao) p.set("details", evento.descricao);

  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
