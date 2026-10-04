import { ajustes, historico, planoAtivo } from "@/lib/consultas";
import { hoje } from "@/lib/datas";
import { TelaHistorico } from "./tela";

const DIAS = 28;

export default async function Historico() {
  const [dias, a, plano] = await Promise.all([historico(hoje(), DIAS), ajustes(), planoAtivo()]);
  return <TelaHistorico dias={dias} metaDeAgua={a.aguaMeta} nomeDoPlano={plano?.nome ?? "—"} />;
}
