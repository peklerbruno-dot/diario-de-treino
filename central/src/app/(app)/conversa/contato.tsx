import Link from "next/link";
import { bd } from "@/lib/bd";
import { VISIVEL } from "@/lib/consultas";
import { NotaDoContato } from "./nota-do-contato";

/**
 * O que a Central sabe de quem escreveu: quantas conversas vocês tiveram, desde
 * quando, o que mais está em aberto com essa pessoa e a sua nota sobre ela.
 * Tudo calculado das conversas, menos a nota, que é sua.
 */
export async function SobreContato({ email, nome, conversaAtual }: { email: string; nome: string; conversaAtual: string }) {
  if (!email.includes("@") || /no-?reply|nao-?responda|notifica/i.test(email)) return null;
  const [total, primeira, abertas, contato] = await Promise.all([
    bd.conversa.count({ where: { remetenteEmail: email } }),
    bd.conversa.findFirst({ where: { remetenteEmail: email }, orderBy: { ultimaData: "asc" }, select: { ultimaData: true } }),
    bd.conversa.findMany({
      where: { ...VISIVEL, remetenteEmail: email, id: { not: conversaAtual } },
      orderBy: { ultimaData: "desc" },
      take: 4,
      select: { id: true, assunto: true, proximaAcao: true, resumo: true },
    }),
    bd.contato.findUnique({ where: { email } }),
  ]);
  const desde = primeira?.ultimaData.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", month: "short", year: "numeric" });

  return (
    <section className="mt-10">
      <h2 className="mb-2 truncate text-[13px] font-semibold text-fosco">Sobre {nome}</h2>
      <p className="text-[14px] text-fosco">
        {email} · {total} {total === 1 ? "conversa" : "conversas"}
        {desde && total > 1 ? ` desde ${desde}` : ""}
      </p>
      {abertas.length > 0 && (
        <div className="mt-2">
          <p className="text-[14px] text-fosco">Também em aberto com essa pessoa:</p>
          <ul className="mt-1">
            {abertas.map((a) => (
              <li key={a.id}>
                <Link href={`/caixa?c=${a.id}`} className="block truncate py-0.5 text-[14px] text-grafite hover:text-tinta">
                  {a.proximaAcao || a.resumo || a.assunto}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <NotaDoContato email={email} nota={contato?.nota ?? ""} />
    </section>
  );
}
