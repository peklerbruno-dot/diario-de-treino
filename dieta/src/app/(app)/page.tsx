import { refeicoesDoDia } from "@/lib/agenda";
import { ajustes, historico, planoAtivo, refeicoesPadrao, situacaoDoDia } from "@/lib/consultas";
import { agoraNoFuso, diaDaSemana } from "@/lib/datas";
import { chavePublica } from "@/lib/push";
import { diasSeguidos } from "@/lib/sequencia";
import { TelaHoje } from "./hoje";

export default async function Hoje() {
  const agora = agoraNoFuso();
  const [plano, a, dia, dias, padroes] = await Promise.all([
    planoAtivo(),
    ajustes(),
    situacaoDoDia(agora.dia),
    historico(agora.dia, 60),
    refeicoesPadrao(),
  ]);
  const refeicoes = plano ? (refeicoesDoDia(plano.refeicoes, agora.diaDaSemana) as typeof plano.refeicoes) : [];
  const sequencia = plano ? diasSeguidos(dias, (d) => refeicoesDoDia(plano.refeicoes, diaDaSemana(d)).length) : 0;

  return (
    <TelaHoje
      agora={agora}
      temPlano={Boolean(plano)}
      orientacoes={plano?.orientacoes ?? ""}
      refeicoes={refeicoes}
      padroes={padroes}
      marcas={dia.marcas}
      agua={dia.agua}
      fotos={dia.fotos}
      sequencia={sequencia}
      ajustes={a}
      chavePublica={chavePublica()}
    />
  );
}
