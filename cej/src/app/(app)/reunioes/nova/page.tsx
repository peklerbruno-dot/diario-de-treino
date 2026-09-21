import { hoje } from "@/lib/datas";
import { Topo } from "@/componentes/pecas";
import { FormularioDeReuniao } from "../formulario";

export const dynamic = "force-dynamic";

export default function NovaReuniao() {
  return (
    <>
      <Topo
        titulo="Marcar uma reunião"
        chamada="A equipe inteira entra como convocada; depois é só desmarcar quem não vai. A pauta e a ata se escrevem na página da reunião."
      />
      <FormularioDeReuniao reuniao={{ dia: hoje() }} />
    </>
  );
}
