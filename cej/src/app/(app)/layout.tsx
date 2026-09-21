import { Casca } from "@/componentes/casca";
import { exigirPessoa } from "@/lib/auth";
import { encaminhamentos } from "@/lib/consultas";
import { quantosPedemAtencao } from "@/lib/encaminhamentos";

export const dynamic = "force-dynamic";

export default async function LayoutDoApp({ children }: { children: React.ReactNode }) {
  const pessoa = await exigirPessoa();

  // O número vermelho na aba. Só os seus: um contador do que está na mão dos
  // outros seria um alarme que ninguém pode desligar.
  const meus = await encaminhamentos({ responsavelId: pessoa.id });

  return (
    <Casca pessoa={pessoa} pedemAtencao={quantosPedemAtencao(meus)}>
      {children}
    </Casca>
  );
}
