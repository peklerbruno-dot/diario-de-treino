import { comoVeio, type ComValores } from "@/lib/formulario";

export function CamposDeConta({ estado }: { estado: ComValores }) {
  return (
    <>
      <label className="block">
        <span className="rotulo">Seu nome</span>
        <input name="nome" autoComplete="name" required className="campo" defaultValue={comoVeio(estado, "nome")} placeholder="Como o grupo te chama" />
      </label>
      <label className="block">
        <span className="rotulo">E-mail</span>
        <input name="email" type="email" autoComplete="email" required className="campo" defaultValue={comoVeio(estado, "email")} />
      </label>
      <label className="block">
        <span className="rotulo">Senha</span>
        <input name="senha" type="password" autoComplete="new-password" required minLength={8} className="campo" placeholder="Pelo menos 8 caracteres" />
      </label>
    </>
  );
}
