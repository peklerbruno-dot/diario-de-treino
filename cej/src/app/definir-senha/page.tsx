import { acaoDeDefinirSenha } from "../acoes";
import { bd } from "@/lib/bd";
import { marcarConvite } from "@/lib/senha";
import { FormularioComErro } from "@/componentes/formulario";
import { MolduraDeFora } from "@/componentes/moldura";
import { Campo, Texto } from "@/componentes/pecas";

export const dynamic = "force-dynamic";

export default async function DefinirSenha({
  searchParams,
}: {
  searchParams: Promise<{ convite?: string }>;
}) {
  const { convite = "" } = await searchParams;

  const pessoa = convite
    ? await bd.pessoa.findFirst({
        where: { convite: marcarConvite(convite), ativa: true },
        select: { nome: true, email: true, conviteExpiraEm: true },
      })
    : null;

  const valeAinda = pessoa?.conviteExpiraEm && pessoa.conviteExpiraEm > new Date();

  if (!valeAinda) {
    return (
      <MolduraDeFora
        titulo="Este link não vale mais"
        chamada="Os links de primeiro acesso duram sete dias e só podem ser usados uma vez. Peça um novo a alguém da coordenação — eles geram em um clique, na tela Equipe."
      >
        <></>
      </MolduraDeFora>
    );
  }

  return (
    <MolduraDeFora
      titulo={`Bem-vindo, ${pessoa!.nome.split(" ")[0]}`}
      chamada={
        <>
          Escolha uma senha para a conta <b className="text-tinta">{pessoa!.email}</b>. É com ela
          que você vai entrar daqui em diante.
        </>
      }
    >
      <FormularioComErro acao={acaoDeDefinirSenha} botao="Guardar a senha e entrar">
        <input type="hidden" name="convite" value={convite} />
        <Campo rotulo="Senha" dica="Pelo menos 10 letras ou números.">
          <Texto nome="senha" tipo="password" obrigatorio autoFoco autoComplete="new-password" />
        </Campo>
        <Campo rotulo="Repita a senha">
          <Texto nome="repetida" tipo="password" obrigatorio autoComplete="new-password" />
        </Campo>
      </FormularioComErro>
    </MolduraDeFora>
  );
}
