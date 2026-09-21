import { redirect } from "next/navigation";
import { codigoDeFundacaoConfigurado, sistemaVazio } from "@/lib/auth";
import { FormularioDeFundacao } from "./formulario";
import { MolduraDeFora } from "@/componentes/moldura";
import { Aviso } from "@/componentes/pecas";

export const dynamic = "force-dynamic";

export default async function Fundar() {
  // Passa a ser uma tela sem sentido no instante em que existe a primeira conta.
  if (!(await sistemaVazio())) redirect("/entrar");

  return (
    <MolduraDeFora
      titulo="A primeira conta"
      chamada="Esta conta entra como coordenação: é ela que vai cadastrar o resto da equipe. Depois de criada, esta tela desaparece."
    >
      {!codigoDeFundacaoConfigurado() && (
        <div className="mt-6">
          <Aviso tom="atencao">
            Esta instalação ainda não tem <code>CODIGO_DE_FUNDACAO</code>. Cadastre a variável nas
            configurações da Vercel, publique de novo e recarregue esta página. O passo a passo
            está em <code>docs/COLOCAR-NO-AR.md</code>.
          </Aviso>
        </div>
      )}

      <FormularioDeFundacao />
    </MolduraDeFora>
  );
}
