import { exigirPessoa } from "@/lib/auth";
import { Cabecalho, Pagina } from "@/componentes/pecas";
import { FormularioDeViagem } from "@/componentes/formulario-viagem";

export default async function NovaViagem() {
  await exigirPessoa();
  return (
    <Pagina>
      <Cabecalho titulo="Nova viagem" voltar="/" />
      <div className="cartao p-5">
        <FormularioDeViagem />
      </div>
    </Pagina>
  );
}
