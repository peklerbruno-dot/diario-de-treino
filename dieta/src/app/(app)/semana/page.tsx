import { bd } from "@/lib/bd";
import { planoAtivo, semanaAtual } from "@/lib/consultas";
import { temGemini } from "@/lib/leitor";
import { TelaSemana } from "./tela";

export default async function Semana() {
  const [semana, plano, pref] = await Promise.all([
    semanaAtual(),
    planoAtivo(),
    bd.ajuste.findUnique({ where: { chave: "preferenciasDaSemana" } }),
  ]);
  return <TelaSemana semana={semana} temPlano={Boolean(plano?.refeicoes.length)} temGemini={temGemini()} preferencias={pref?.valor ?? ""} />;
}
