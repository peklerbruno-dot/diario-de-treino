import "server-only";
import { bd } from "./bd";
import { REPETICOES, localParaUtc, utcParaLocal, type Repeticao } from "./datas";

/**
 * O que o assistente consegue fazer além de conversar. Cada ferramenta é uma
 * descrição que o Gemini lê e uma função que roda aqui, no servidor.
 *
 * As respostas voltam em texto curto e com os ids à vista: é assim que o Gemini
 * consegue, na mesma conversa, cancelar o lembrete que acabou de listar.
 */

/** O formato das declarações: nome, descrição e parâmetros em JSON Schema. */
export type Declaracao = { name: string; description: string; parameters: object };

export const FERRAMENTAS: Declaracao[] = [
  {
    name: "pesquisar_na_internet",
    description:
      "Pesquisa no Google e devolve um resumo com as fontes. Use quando a resposta depender de algo " +
      "atual ou que você não sabe com certeza: notícias, clima, preços, horários, resultados, endereços.",
    parameters: {
      type: "object",
      properties: { pergunta: { type: "string", description: "O que pesquisar, como uma pergunta completa." } },
      required: ["pergunta"],
    },
  },
  {
    name: "guardar_memoria",
    description:
      "Guarda um fato duradouro sobre o usuário ou a vida dele, para lembrar em conversas futuras " +
      "(preferências, pessoas, datas importantes, dados que ele pediu para guardar). " +
      "Use quando ele pedir para lembrar de algo, ou quando contar algo claramente útil no futuro. " +
      "Um fato por chamada, escrito de forma autossuficiente.",
    parameters: {
      type: "object",
      properties: { texto: { type: "string", description: "O fato, numa frase." } },
      required: ["texto"],
    },
  },
  {
    name: "apagar_memoria",
    description: "Apaga uma memória guardada, pelo id (os ids aparecem na seção de memórias do prompt). Use quando o fato mudou ou o usuário pedir para esquecer.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "criar_lembrete",
    description:
      "Agenda uma mensagem que você mesmo vai mandar ao usuário no WhatsApp na hora marcada. " +
      "Use para 'me lembra de…', 'me avisa amanhã…', compromissos, remédios. " +
      "Se o usuário não disser a hora, escolha uma razoável e diga qual escolheu.",
    parameters: {
      type: "object",
      properties: {
        texto: {
          type: "string",
          description: "O que será enviado na hora, já escrito para o usuário ler. Ex.: 'Hora de tomar o remédio da pressão 💊'.",
        },
        quando: {
          type: "string",
          description: "Data e hora no fuso do usuário, no formato AAAA-MM-DDTHH:MM. Ex.: 2026-09-28T09:00.",
        },
        repetir: {
          type: "string",
          enum: [...REPETICOES],
          description: "Omita para um lembrete único.",
        },
      },
      required: ["texto", "quando"],
    },
  },
  {
    name: "listar_lembretes",
    description: "Lista os lembretes ainda pendentes, com id, horário e repetição.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "cancelar_lembrete",
    description: "Cancela um lembrete pendente pelo id (use listar_lembretes para achar o id).",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "adicionar_a_lista",
    description: "Adiciona itens a uma lista do usuário (compras, filmes, tarefas, presentes…). A lista é criada se não existir.",
    parameters: {
      type: "object",
      properties: {
        lista: { type: "string", description: "Nome curto da lista, ex.: 'compras'." },
        itens: { type: "array", items: { type: "string" } },
      },
      required: ["lista", "itens"],
    },
  },
  {
    name: "ver_listas",
    description: "Mostra os itens de uma lista, com ids. Sem 'lista', mostra o nome de todas as listas e quantos itens cada uma tem.",
    parameters: {
      type: "object",
      properties: { lista: { type: "string" } },
    },
  },
  {
    name: "tirar_da_lista",
    description: "Remove itens de uma lista pelos ids (de ver_listas), ou esvazia a lista inteira com tudo=true.",
    parameters: {
      type: "object",
      properties: {
        lista: { type: "string" },
        ids: { type: "array", items: { type: "string" } },
        tudo: { type: "boolean" },
      },
      required: ["lista"],
    },
  },
];

/** Os erros que voltam ao Gemini como `erro`, para ele se corrigir. */
export class ErroDeFerramenta extends Error {}

const texto = (v: unknown, campo: string): string => {
  if (typeof v !== "string" || !v.trim()) throw new ErroDeFerramenta(`'${campo}' precisa ser um texto.`);
  return v.trim();
};
const nomeDaLista = (v: unknown) => texto(v, "lista").toLowerCase();

/** Roda uma ferramenta e devolve o texto que o Gemini vai ler. */
export async function executar(nome: string, entrada: Record<string, unknown>, agora = new Date()): Promise<string> {
  switch (nome) {
    case "guardar_memoria": {
      const m = await bd.memoria.create({ data: { texto: texto(entrada.texto, "texto") } });
      return `Guardado (id ${m.id}).`;
    }

    case "apagar_memoria": {
      const r = await bd.memoria.deleteMany({ where: { id: texto(entrada.id, "id") } });
      if (!r.count) throw new ErroDeFerramenta("Não existe memória com esse id.");
      return "Apagada.";
    }

    case "criar_lembrete": {
      const quando = localParaUtc(texto(entrada.quando, "quando"));
      if (!quando) throw new ErroDeFerramenta("'quando' precisa estar no formato AAAA-MM-DDTHH:MM.");
      const repetir = entrada.repetir == null || entrada.repetir === "" ? null : String(entrada.repetir);
      if (repetir && !REPETICOES.includes(repetir as Repeticao)) {
        throw new ErroDeFerramenta(`'repetir' deve ser um de: ${REPETICOES.join(", ")}.`);
      }
      if (quando.getTime() < agora.getTime() - 60_000) {
        throw new ErroDeFerramenta(`Esse horário já passou (agora são ${utcParaLocal(agora)}).`);
      }
      const l = await bd.lembrete.create({ data: { texto: texto(entrada.texto, "texto"), quando, repetir } });
      return `Lembrete criado (id ${l.id}) para ${utcParaLocal(quando)}${repetir ? `, repetindo: ${repetir}` : ""}.`;
    }

    case "listar_lembretes": {
      const ls = await bd.lembrete.findMany({
        where: { enviadoEm: null, canceladoEm: null },
        orderBy: { quando: "asc" },
        take: 50,
      });
      if (!ls.length) return "Nenhum lembrete pendente.";
      return ls
        .map((l) => `- id ${l.id} · ${utcParaLocal(l.quando)}${l.repetir ? ` · repete: ${l.repetir}` : ""} · ${l.texto}`)
        .join("\n");
    }

    case "cancelar_lembrete": {
      const r = await bd.lembrete.updateMany({
        where: { id: texto(entrada.id, "id"), enviadoEm: null, canceladoEm: null },
        data: { canceladoEm: agora },
      });
      if (!r.count) throw new ErroDeFerramenta("Não há lembrete pendente com esse id.");
      return "Cancelado.";
    }

    case "adicionar_a_lista": {
      const lista = nomeDaLista(entrada.lista);
      const itens = Array.isArray(entrada.itens) ? entrada.itens.map(String).map((s) => s.trim()).filter(Boolean) : [];
      if (!itens.length) throw new ErroDeFerramenta("'itens' precisa ter pelo menos um item.");
      await bd.item.createMany({ data: itens.map((t) => ({ lista, texto: t })) });
      const total = await bd.item.count({ where: { lista } });
      return `Adicionado(s) ${itens.length} item(ns) em "${lista}", que agora tem ${total}.`;
    }

    case "ver_listas": {
      if (entrada.lista == null || entrada.lista === "") {
        const grupos = await bd.item.groupBy({ by: ["lista"], _count: { _all: true }, orderBy: { lista: "asc" } });
        if (!grupos.length) return "Nenhuma lista ainda.";
        return grupos.map((g) => `- ${g.lista}: ${g._count._all} item(ns)`).join("\n");
      }
      const lista = nomeDaLista(entrada.lista);
      const itens = await bd.item.findMany({ where: { lista }, orderBy: { criadoEm: "asc" } });
      if (!itens.length) return `A lista "${lista}" está vazia.`;
      return itens.map((i) => `- id ${i.id} · ${i.texto}`).join("\n");
    }

    case "tirar_da_lista": {
      const lista = nomeDaLista(entrada.lista);
      if (entrada.tudo === true) {
        const r = await bd.item.deleteMany({ where: { lista } });
        return `Lista "${lista}" esvaziada (${r.count} item(ns)).`;
      }
      const ids = Array.isArray(entrada.ids) ? entrada.ids.map(String) : [];
      if (!ids.length) throw new ErroDeFerramenta("Informe 'ids' ou tudo=true.");
      const r = await bd.item.deleteMany({ where: { lista, id: { in: ids } } });
      return `Removido(s) ${r.count} item(ns) de "${lista}".`;
    }

    default:
      throw new ErroDeFerramenta(`Ferramenta desconhecida: ${nome}.`);
  }
}
