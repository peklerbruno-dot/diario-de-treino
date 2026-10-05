import { bd } from "@/lib/bd";
import { planoAtivo } from "@/lib/consultas";
import { TelaPlano } from "./tela";

export default async function Plano() {
  const [plano, anteriores] = await Promise.all([
    planoAtivo(),
    bd.plano.findMany({
      where: { ativo: false },
      orderBy: { criadoEm: "desc" },
      select: { id: true, nome: true, criadoEm: true, _count: { select: { refeicoes: true } } },
    }),
  ]);
  return (
    <TelaPlano
      plano={plano}
      anteriores={anteriores.map((a) => ({ id: a.id, nome: a.nome, criadoEm: a.criadoEm.toISOString(), refeicoes: a._count.refeicoes }))}
    />
  );
}
