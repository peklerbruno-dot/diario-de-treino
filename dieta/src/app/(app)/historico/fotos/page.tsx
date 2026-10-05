import { galeria, nomesDasFotos } from "@/lib/consultas";
import { GaleriaDeFotos } from "./galeria";

export default async function Fotos({ searchParams }: { searchParams: Promise<{ refeicao?: string }> }) {
  const refeicao = (await searchParams).refeicao || "";
  const [primeira, nomes] = await Promise.all([galeria({ nome: refeicao || undefined }), nomesDasFotos()]);
  return <GaleriaDeFotos key={refeicao} refeicao={refeicao} nomes={nomes} inicio={primeira} />;
}
