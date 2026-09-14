// Modalidades, cores e categorias — os mesmos do protótipo e da seção 7 do briefing.
import { GRUPOS } from "./biblioteca.js";

export { GRUPOS };

export const MOD = {
  musc: { nome: "Musculação", cor: "#9A5A22", campo: "Grupo muscular" },
  pilates: { nome: "Pilates", cor: "#4C7F5C", campo: "Tipo" },
  natacao: { nome: "Natação", cor: "#33619C", campo: "Estilo" },
};

export const ORDEM = ["musc", "pilates", "natacao"];

// Categorias válidas por modalidade (o campo `cat` do exercício).
export const CATEGORIAS = {
  musc: GRUPOS,
  pilates: ["Aparelho", "Solo"],
  natacao: ["Estilo", "Educativo"],
};

export const hojeISO = () => new Date().toISOString().slice(0, 10);
export const agoraISO = () => new Date().toISOString();

// Compara nomes ignorando acentos e maiúsculas (busca da biblioteca).
export const norm = (s) =>
  String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
