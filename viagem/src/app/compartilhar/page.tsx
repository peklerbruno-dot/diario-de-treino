import Link from "next/link";
import { redirect } from "next/navigation";
import { bd } from "@/lib/bd";
import { exigirPessoa } from "@/lib/auth";
import { Cabecalho, Pagina } from "@/componentes/pecas";

/**
 * Onde o "compartilhar" do Android cai (ver `share_target` no manifest). O
 * Instagram manda o link às vezes em `link`, às vezes dentro de `texto`.
 */
export default async function Compartilhar({ searchParams }: { searchParams: Promise<{ titulo?: string; texto?: string; link?: string }> }) {
  const { titulo = "", texto = "", link = "" } = await searchParams;
  const pessoa = await exigirPessoa();
  const conteudo = [link, texto, !link && !texto ? titulo : ""].filter(Boolean).join("\n").trim();
  const viagens = await bd.viagem.findMany({
    where: { membros: { some: { pessoaId: pessoa.id, saiuEm: null } } },
    orderBy: { inicio: "desc" },
  });
  const destino = (id: string) => `/v/${id}/adicionar?texto=${encodeURIComponent(conteudo)}`;
  if (viagens.length === 1) redirect(destino(viagens[0].id));
  return (
    <Pagina>
      <Cabecalho titulo="Mandar para qual viagem?" />
      <ul className="space-y-2">
        {viagens.map((v) => (
          <li key={v.id}>
            <Link href={destino(v.id)} className="cartao block p-4 font-semibold">{v.nome}</Link>
          </li>
        ))}
      </ul>
    </Pagina>
  );
}
