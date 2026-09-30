import Link from "next/link";
import { Porta } from "@/componentes/porta";
import { FormularioDeConta } from "./formulario";

export default function CriarConta() {
  return (
    <Porta titulo="Criar conta" subtitulo="Para quem vai criar a viagem. Os outros entram pelo link de convite.">
      <FormularioDeConta />
      <p className="mt-5 text-center text-[14px] text-fosco">
        Já tem conta? <Link href="/entrar" className="font-semibold text-realce">Entrar</Link>
      </p>
    </Porta>
  );
}
