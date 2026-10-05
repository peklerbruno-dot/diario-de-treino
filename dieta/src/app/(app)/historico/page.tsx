import { ajustes, fotosDoCorpo, historico, medidas, planoAtivo } from "@/lib/consultas";
import { hoje } from "@/lib/datas";
import { TelaHistorico } from "./tela";

const DIAS = 28;

export default async function Historico() {
  const [dias, a, plano, lista, corpo] = await Promise.all([historico(hoje(), DIAS), ajustes(), planoAtivo(), medidas(), fotosDoCorpo()]);
  return <TelaHistorico dias={dias} medidas={lista} corpo={corpo} hoje={hoje()} metaDeAgua={a.aguaMeta} nomeDoPlano={plano?.nome ?? "—"} />;
}
