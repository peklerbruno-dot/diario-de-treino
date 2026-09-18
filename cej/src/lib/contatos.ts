/**
 * O que é um contato, e o que o sistema aceita como um.
 *
 * Função pura, sem banco: `contatos.test.ts` prende cada regra. É onde mora a
 * limpeza que faz diferença numa base que vem de planilha — e planilha de
 * equipe sempre vem com " Ana Braun " e "ANA@USP.BR " dentro.
 */

export type VinculoDoContato =
  | "GRADUACAO" | "POS_GRADUACAO" | "DOCENTE" | "FUNCIONARIO" | "EGRESSO"
  | "COMUNIDADE_EXTERNA" | "IMPRENSA" | "PARCEIRO" | "OUTRO";

export const VINCULOS: VinculoDoContato[] = [
  "GRADUACAO", "POS_GRADUACAO", "DOCENTE", "FUNCIONARIO", "EGRESSO",
  "COMUNIDADE_EXTERNA", "IMPRENSA", "PARCEIRO", "OUTRO",
];

export const NOME_DO_VINCULO: Record<VinculoDoContato, string> = {
  GRADUACAO: "Graduação",
  POS_GRADUACAO: "Pós-graduação",
  DOCENTE: "Docente",
  FUNCIONARIO: "Funcionário",
  EGRESSO: "Egresso",
  COMUNIDADE_EXTERNA: "Comunidade externa",
  IMPRENSA: "Imprensa",
  PARCEIRO: "Parceiro",
  OUTRO: "Outro",
};

export type EstadoDoContato = "ATIVO" | "DESCADASTRADO" | "INVALIDO";

export const NOME_DO_ESTADO_DO_CONTATO: Record<EstadoDoContato, string> = {
  ATIVO: "Ativo",
  DESCADASTRADO: "Descadastrado",
  INVALIDO: "E-mail inválido",
};

/**
 * O e-mail, como ele vai para o banco.
 *
 * Minúsculas e sem espaço nas pontas. Isso não é enfeite: é o que faz
 * "Ana@USP.br" e "ana@usp.br" serem a mesma pessoa na hora de importar a mesma
 * planilha pela segunda vez — e não duas, cada uma recebendo o boletim.
 */
export function normalizarEmail(bruto: string | null | undefined): string | null {
  const email = (bruto ?? "").trim().toLocaleLowerCase("pt-BR");
  return email ? email : null;
}

/**
 * O e-mail parece um e-mail?
 *
 * Deliberadamente simples: alguma coisa, arroba, alguma coisa com ponto, sem
 * espaço. Não existe expressão regular que decida de verdade se um endereço
 * existe — quem decide é o servidor do outro lado, quando a mensagem chega ou
 * volta. O que esta função precisa pegar é o engano de digitação e a célula com
 * "não tem" escrito dentro.
 */
export function pareceEmail(bruto: string | null | undefined): boolean {
  const email = normalizarEmail(bruto);
  if (!email) return false;
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(email);
}

/** "  ana   braun " → "Ana Braun". A planilha sempre traz um desses. */
export function arrumarNome(bruto: string | null | undefined): string {
  const limpo = (bruto ?? "").replace(/\s+/g, " ").trim();
  if (!limpo) return "";

  // Só mexe em quem está todo em maiúsculas ou todo em minúsculas: um nome
  // digitado com cuidado — "Ana de Souza Braun", "d'Ávila" — fica como está.
  const uniforme = limpo === limpo.toLocaleUpperCase("pt-BR") || limpo === limpo.toLocaleLowerCase("pt-BR");
  if (!uniforme) return limpo;

  const minusculas = ["de", "da", "do", "das", "dos", "e", "d'"];
  return limpo
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((palavra, i) =>
      i > 0 && minusculas.includes(palavra)
        ? palavra
        : palavra.charAt(0).toLocaleUpperCase("pt-BR") + palavra.slice(1),
    )
    .join(" ");
}

/** O telefone como se lê, sem inventar o que não veio: só tira o que não é dígito. */
export function arrumarTelefone(bruto: string | null | undefined): string | null {
  const digitos = (bruto ?? "").replace(/\D/g, "");
  if (digitos.length < 8) return null;

  const semPais = digitos.startsWith("55") && digitos.length > 11 ? digitos.slice(2) : digitos;
  if (semPais.length === 11) return `(${semPais.slice(0, 2)}) ${semPais.slice(2, 7)}-${semPais.slice(7)}`;
  if (semPais.length === 10) return `(${semPais.slice(0, 2)}) ${semPais.slice(2, 6)}-${semPais.slice(6)}`;
  return semPais;
}

/**
 * Quem pode receber um boletim.
 *
 * Três condições, e as três importam: não foi apagado, está ativo, e **consentiu**.
 * A terceira é a que se esquece — e é justamente a que o serviço de envio cobra
 * quando as reclamações de spam chegam.
 */
export function podeReceber(contato: {
  estado: EstadoDoContato;
  consentimentoEm: Date | null;
  apagadoEm: Date | null;
}): boolean {
  return contato.estado === "ATIVO" && contato.consentimentoEm != null && contato.apagadoEm == null;
}

/** Um dos vínculos, ou OUTRO. Usado ao ler formulário e planilha. */
export function comoVinculo(bruto: string | null | undefined): VinculoDoContato {
  const texto = (bruto ?? "").trim().toLocaleUpperCase("pt-BR").replace(/[\s-]+/g, "_");
  if ((VINCULOS as string[]).includes(texto)) return texto as VinculoDoContato;

  // A planilha vem escrita em gente, não em maiúsculas com sublinhado.
  const porExtenso: Record<string, VinculoDoContato> = {
    GRADUACAO: "GRADUACAO", GRADUAÇÃO: "GRADUACAO", GRADUANDO: "GRADUACAO", ALUNO: "GRADUACAO",
    POS: "POS_GRADUACAO", PÓS: "POS_GRADUACAO", POS_GRADUACAO: "POS_GRADUACAO",
    MESTRADO: "POS_GRADUACAO", DOUTORADO: "POS_GRADUACAO", MESTRANDO: "POS_GRADUACAO",
    DOUTORANDO: "POS_GRADUACAO", POS_DOC: "POS_GRADUACAO",
    DOCENTE: "DOCENTE", PROFESSOR: "DOCENTE", PROFESSORA: "DOCENTE", PROF: "DOCENTE",
    FUNCIONARIO: "FUNCIONARIO", FUNCIONÁRIO: "FUNCIONARIO", SERVIDOR: "FUNCIONARIO",
    EGRESSO: "EGRESSO", EX_ALUNO: "EGRESSO",
    EXTERNO: "COMUNIDADE_EXTERNA", COMUNIDADE: "COMUNIDADE_EXTERNA",
    COMUNIDADE_EXTERNA: "COMUNIDADE_EXTERNA", PUBLICO_EXTERNO: "COMUNIDADE_EXTERNA",
    IMPRENSA: "IMPRENSA", JORNALISTA: "IMPRENSA",
    PARCEIRO: "PARCEIRO", PARCEIRA: "PARCEIRO", INSTITUICAO: "PARCEIRO",
  };
  return porExtenso[texto] ?? "OUTRO";
}
