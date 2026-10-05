import { AbasDoProgresso } from "@/componentes/abas-progresso";
import { Titulo } from "@/componentes/pecas";

export default function LayoutDoProgresso({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Titulo>Progresso</Titulo>
      <AbasDoProgresso />
      {children}
    </>
  );
}
