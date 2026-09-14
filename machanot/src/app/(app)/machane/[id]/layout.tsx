import { notFound } from "next/navigation";
import { carregarMachane } from "@/lib/carregar";
import { ProvedorMachane } from "@/components/machane/provedor";
import { PainelAoVivo } from "@/components/machane/painel";
import { Navegacao } from "@/components/machane/navegacao";
import { CabecalhoMachane } from "@/components/machane/cabecalho";

export default async function LayoutMachane({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const estado = await carregarMachane(id);
  if (!estado) notFound();

  return (
    <ProvedorMachane inicial={estado}>
      <CabecalhoMachane />
      <div className="mt-4 grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[190px_minmax(0,1fr)_320px]">
        <Navegacao id={id} />
        <main className="min-w-0">{children}</main>
        <div className="sem-impressao xl:block">
          <PainelAoVivo />
        </div>
      </div>
    </ProvedorMachane>
  );
}
