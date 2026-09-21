import { equipeAtiva } from "@/lib/consultas";
import { hoje } from "@/lib/datas";
import { Topo } from "@/componentes/pecas";
import { FormularioDeAtividade } from "../formulario";

export const dynamic = "force-dynamic";

export default async function NovaAtividade() {
  const equipe = await equipeAtiva();

  return (
    <>
      <Topo
        titulo="Nova atividade"
        chamada="Cadastre agora, ainda como ideia. Uma atividade só existe para a equipe depois que está escrita em algum lugar que todo mundo vê."
      />
      <FormularioDeAtividade equipe={equipe} atividade={{ dia: hoje() }} />
    </>
  );
}
