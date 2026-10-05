import { planoAtivo, refeicoesPadrao } from "@/lib/consultas";
import { TelaMinhasRefeicoes } from "@/componentes/minhas-refeicoes";

export default async function MinhasRefeicoes({ searchParams }: { searchParams: Promise<{ nova?: string }> }) {
  const [plano, padroes, { nova }] = await Promise.all([planoAtivo(), refeicoesPadrao(), searchParams]);
  // Os nomes do plano, sem repetir (duas refeições "Lanche" valem uma lista só).
  const nomes = [...new Set((plano?.refeicoes ?? []).map((r) => r.nome))];
  return <TelaMinhasRefeicoes padroes={padroes} nomesDoPlano={nomes} nova={nova} />;
}
