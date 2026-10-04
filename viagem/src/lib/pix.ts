/**
 * Pix "copia e cola": o código (BR Code, padrão EMV do Banco Central) que se
 * cola no app do banco e já vem com chave, nome e valor preenchidos.
 *
 * É o Pix estático — sem banco intermediário, sem cadastro, sem custo. Cada
 * campo é "ID + tamanho em dois dígitos + valor", e o fim é um CRC16 de tudo.
 */

const campo = (id: string, valor: string) => `${id}${String(valor.length).padStart(2, "0")}${valor}`;

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), como o manual do BR Code pede. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (const byte of Buffer.from(texto, "utf8")) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** O app do banco aceita só ASCII simples no nome e na cidade. */
const semAcento = (s: string, max: number) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ]/g, "").trim().toUpperCase().slice(0, max) || "X";

function cpfValido(d: string): boolean {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  const dig = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dig(9) === Number(d[9]) && dig(10) === Number(d[10]);
}

export type TipoDeChave = "email" | "cpf" | "cnpj" | "telefone" | "aleatoria";

/**
 * Põe a chave no formato que o Pix espera: telefone com +55, CPF e CNPJ só
 * números, e-mail em minúsculas. Onze dígitos soltos são CPF se o dígito
 * verificador bater; senão, celular com DDD.
 */
export function normalizarChave(bruta: string): { chave: string; tipo: TipoDeChave } | null {
  const t = bruta.trim();
  if (!t) return null;
  if (t.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? { chave: t.toLowerCase(), tipo: "email" } : null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return { chave: t.toLowerCase(), tipo: "aleatoria" };
  const d = t.replace(/\D/g, "");
  if (t.startsWith("+")) return d.length >= 12 && d.length <= 13 ? { chave: `+${d}`, tipo: "telefone" } : null;
  if (d.length === 14) return { chave: d, tipo: "cnpj" };
  if (d.length === 11 && (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(t) || (!/[()]/.test(t) && cpfValido(d)))) return { chave: d, tipo: "cpf" };
  if (d.length === 10 || d.length === 11) return { chave: `+55${d}`, tipo: "telefone" };
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return { chave: `+${d}`, tipo: "telefone" };
  return null;
}

/** O código copia-e-cola. `centavos` opcional: sem ele, quem paga digita o valor. */
export function codigoPix(opcoes: { chave: string; nome: string; cidade?: string; centavos?: number; descricao?: string }): string | null {
  const n = normalizarChave(opcoes.chave);
  if (!n) return null;
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", n.chave) + (opcoes.descricao ? campo("02", semAcento(opcoes.descricao, 40)) : "");
  const corpo =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    (opcoes.centavos && opcoes.centavos > 0 ? campo("54", (opcoes.centavos / 100).toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", semAcento(opcoes.nome, 25)) +
    campo("60", semAcento(opcoes.cidade ?? "SAO PAULO", 15)) +
    campo("62", campo("05", "***")) +
    "6304";
  return corpo + crc16(corpo);
}
