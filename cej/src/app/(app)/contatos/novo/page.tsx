import { Topo } from "@/componentes/pecas";
import { FormularioDeContato } from "../formulario";

export const dynamic = "force-dynamic";

export default function NovoContato() {
  return (
    <>
      <Topo
        titulo="Novo contato"
        chamada="Para acrescentar uma pessoa de cada vez. Se você tem uma lista inteira, o caminho é Importar planilha."
      />
      <FormularioDeContato />
    </>
  );
}
