import { Topo } from "@/componentes/pecas";
import { TelaDeImportacao } from "./tela";

export const dynamic = "force-dynamic";

export default function Importar() {
  return (
    <>
      <Topo
        titulo="Importar planilha"
        chamada="A planilha que vocês já têm, como ela está. Não precisa arrumar antes: o sistema lê, mostra o que entendeu e só grava depois que você confere."
      />
      <TelaDeImportacao />
    </>
  );
}
