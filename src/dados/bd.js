// Banco de dados no próprio aparelho (IndexedDB via Dexie).
// Nada sai daqui: não há conta nem servidor.
//
// Modelo (seção 3 do briefing):
//   Exercicio { id, mod, nome, cat, imagem?, video?, notas?, criadoEm }
//   Treino    { id, mod, nome, itens: [{ exId, series, reps }], criadoEm }
//   Sessao    { id, data: "YYYY-MM-DD", mod, nome, treinoId?, itens, duracaoMin?, obs?, criadoEm }
//     itens musc:    [{ exId, series: [{ carga, reps }] }]
//     itens natacao: [{ exId, metros, tempoMin }]
//     pilates: sem itens; usa duracaoMin e obs
//   Ajuste    { chave, valor }
import Dexie from "dexie";
import { bibliotecaInicial } from "./biblioteca.js";
import { agoraISO } from "./constantes.js";

export const db = new Dexie("diario-de-treino");

// Só os campos que precisam de índice entram aqui; o resto do objeto é gravado igual.
db.version(1).stores({
  exercicios: "++id, mod, cat, nome, [mod+cat]",
  treinos: "++id, mod, nome, criadoEm",
  sessoes: "++id, data, mod, treinoId, [mod+data]",
  ajustes: "chave",
});

export const VERSAO_BIBLIOTECA = 1;

/**
 * Carrega a biblioteca inicial na primeira vez que o app abre no aparelho.
 * Guarda uma marca em `ajustes`: se depois você apagar um exercício, ele não volta sozinho.
 */
export async function semear() {
  return db.transaction("rw", db.exercicios, db.ajustes, async () => {
    const marca = await db.ajustes.get("bibliotecaSemeada");
    if (marca) return { semeou: false };
    const criadoEm = agoraISO();
    await db.exercicios.bulkPut(bibliotecaInicial.map((e) => ({ ...e, criadoEm })));
    await db.ajustes.put({ chave: "bibliotecaSemeada", valor: VERSAO_BIBLIOTECA, em: criadoEm });
    return { semeou: true, quantos: bibliotecaInicial.length };
  });
}

export const lerAjuste = async (chave, padrao = null) => (await db.ajustes.get(chave))?.valor ?? padrao;
export const gravarAjuste = (chave, valor) => db.ajustes.put({ chave, valor });

/** Exercícios de uma modalidade, em ordem alfabética dentro de cada categoria. */
export const exerciciosDa = (mod) => db.exercicios.where("mod").equals(mod).sortBy("nome");

/** Sessões de um intervalo de datas, inclusive nas duas pontas ("YYYY-MM-DD"). */
export const sessoesEntre = (de, ate) => db.sessoes.where("data").between(de, ate, true, true).toArray();
