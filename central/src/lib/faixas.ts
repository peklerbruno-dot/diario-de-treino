/**
 * Arruma eventos que se sobrepõem num mesmo dia em faixas lado a lado, como
 * fazem os apps de calendário: cada evento ganha a primeira faixa livre, e
 * todos os de um mesmo "aglomerado" dividem a largura pelo número de faixas.
 */
export interface Bloco {
  ini: number; // minutos desde a meia-noite
  fim: number;
}

export function emFaixas<T extends Bloco>(eventos: T[]): (T & { faixa: number; faixas: number })[] {
  const ordem = [...eventos].sort((a, b) => a.ini - b.ini || b.fim - a.fim);
  const saida: (T & { faixa: number; faixas: number })[] = [];
  let grupo: (T & { faixa: number; faixas: number })[] = [];
  let fimDoGrupo = -1;
  const fechar = () => {
    const n = Math.max(1, ...grupo.map((g) => g.faixa + 1));
    for (const g of grupo) g.faixas = n;
    saida.push(...grupo);
    grupo = [];
  };
  for (const e of ordem) {
    if (e.ini >= fimDoGrupo && grupo.length) fechar();
    const ocupadas = new Set(grupo.filter((g) => g.fim > e.ini).map((g) => g.faixa));
    let faixa = 0;
    while (ocupadas.has(faixa)) faixa++;
    grupo.push({ ...e, faixa, faixas: 1 });
    fimDoGrupo = Math.max(fimDoGrupo, e.fim);
  }
  if (grupo.length) fechar();
  return saida;
}
