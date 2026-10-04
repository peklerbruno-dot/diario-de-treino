import { ajustes, historico, medidas, planoAtivo } from "@/lib/consultas";
import { hoje } from "@/lib/datas";
import { TelaHistorico } from "./tela";

const DIAS = 28;

export default async function Historico() {
  const [dias, a, plano, lista] = await Promise.all([historico(hoje(), DIAS), ajustes(), planoAtivo(), medidas()]);
  return <TelaHistorico dias={dias} medidas={lista} hoje={hoje()} metaDeAgua={a.aguaMeta} nomeDoPlano={plano?.nome ?? "—"} />;
}
