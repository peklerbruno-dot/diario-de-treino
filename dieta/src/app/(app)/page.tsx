import { refeicoesDoDia } from "@/lib/agenda";
import { ajustes, atalhosPorRefeicao, planoAtivo, seguidasPorDia, situacaoDoDia } from "@/lib/consultas";
import { agoraNoFuso, diaDaSemana } from "@/lib/datas";
import { chavePublica } from "@/lib/push";
import { diasSeguidos } from "@/lib/sequencia";
import { TelaHoje } from "./hoje";

export default async function Hoje() {
  const agora = agoraNoFuso();
  const [plano, a, dia, dias, atalhos] = await Promise.all([
    planoAtivo(),
    ajustes(),
    situacaoDoDia(agora.dia),
    seguidasPorDia(agora.dia, 60),
    atalhosPorRefeicao(agora.dia),
  ]);
  const refeicoes = plano ? (refeicoesDoDia(plano.refeicoes, agora.diaDaSemana) as typeof plano.refeicoes) : [];
  const sequencia = plano ? diasSeguidos(dias, (d) => refeicoesDoDia(plano.refeicoes, diaDaSemana(d)).length) : 0;

  return (
    <TelaHoje
      agora={agora}
      temPlano={Boolean(plano)}
      orientacoes={plano?.orientacoes ?? ""}
      refeicoes={refeicoes}
      marcas={dia.marcas}
      agua={dia.agua}
      fotos={dia.fotos}
      sequencia={sequencia}
      ajustes={a}
      chavePublica={chavePublica()}
      atalhos={atalhos}
    />
  );
}
