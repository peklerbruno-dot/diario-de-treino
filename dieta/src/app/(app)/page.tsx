import { ajustes, planoAtivo, situacaoDoDia } from "@/lib/consultas";
import { agoraNoFuso } from "@/lib/datas";
import { refeicoesDoDia } from "@/lib/agenda";
import { chavePublica } from "@/lib/push";
import { TelaHoje } from "./hoje";

export default async function Hoje() {
  const agora = agoraNoFuso();
  const [plano, a, dia] = await Promise.all([planoAtivo(), ajustes(), situacaoDoDia(agora.dia)]);
  const refeicoes = plano ? (refeicoesDoDia(plano.refeicoes, agora.diaDaSemana) as typeof plano.refeicoes) : [];

  return (
    <TelaHoje
      agora={agora}
      temPlano={Boolean(plano)}
      orientacoes={plano?.orientacoes ?? ""}
      refeicoes={refeicoes}
      marcas={dia.marcas}
      agua={dia.agua}
      ajustes={a}
      chavePublica={chavePublica()}
    />
  );
}
