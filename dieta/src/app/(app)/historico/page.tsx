import { ajustes, historico } from "@/lib/consultas";
import { hoje } from "@/lib/datas";
import { TelaHistorico } from "./tela";

const DIAS = 28;

export default async function Historico() {
  const [dias, a] = await Promise.all([historico(hoje(), DIAS), ajustes()]);
  return <TelaHistorico dias={dias} metaDeAgua={a.aguaMeta} />;
}
