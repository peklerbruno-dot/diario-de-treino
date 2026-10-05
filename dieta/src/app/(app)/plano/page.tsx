import { bd } from "@/lib/bd";
import { planoAtivo } from "@/lib/consultas";
import { TelaPlano } from "./tela";

export default async function Plano() {
  const [plano, anteriores, padroes] = await Promise.all([
    planoAtivo(),
    bd.plano.findMany({
      where: { ativo: false },
      orderBy: { criadoEm: "desc" },
      select: { id: true, nome: true, criadoEm: true, _count: { select: { refeicoes: true } } },
    }),
    bd.padrao.findMany({ orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }], select: { id: true, refeicao: true, texto: true } }),
  ]);
  const porRefeicao: Record<string, { id: string; texto: string }[]> = {};
  for (const p of padroes) (porRefeicao[p.refeicao] ??= []).push({ id: p.id, texto: p.texto });
  return (
    <TelaPlano
      plano={plano}
      padroes={porRefeicao}
      anteriores={anteriores.map((a) => ({ id: a.id, nome: a.nome, criadoEm: a.criadoEm.toISOString(), refeicoes: a._count.refeicoes }))}
    />
  );
}
