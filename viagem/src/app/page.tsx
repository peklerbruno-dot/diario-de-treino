import Link from "next/link";
import { redirect } from "next/navigation";
import { bd } from "@/lib/bd";
import { exigirPessoa } from "@/lib/auth";
import { periodo, hoje, diferencaEmDias } from "@/lib/datas";
import { Cabecalho, Pagina, Vazio } from "@/componentes/pecas";

export default async function Inicio() {
  const pessoa = await exigirPessoa();
  const viagens = await bd.viagem.findMany({
    where: { membros: { some: { pessoaId: pessoa.id, saiuEm: null } } },
    include: { _count: { select: { membros: { where: { saiuEm: null } } } } },
    orderBy: { inicio: "asc" },
  });
  // Uma viagem só: vai direto para ela.
  if (viagens.length === 1) redirect(`/v/${viagens[0].id}`);

  const dia = hoje();
  return (
    <Pagina>
      <Cabecalho
        titulo={`Olá, ${pessoa.nome.split(" ")[0]}`}
        subtitulo="Suas viagens"
        acao={<form action="/sair" method="post"><button className="mt-2 text-[15px] text-fosco">Sair</button></form>}
      />
      {viagens.length === 0 ? (
        <Vazio titulo="Nenhuma viagem ainda">
          Crie uma, ou abra o link de convite que mandaram no grupo.
        </Vazio>
      ) : (
        <ul className="space-y-3">
          {viagens.map((v) => {
            const falta = diferencaEmDias(dia, v.inicio);
            return (
              <li key={v.id}>
                <Link href={`/v/${v.id}`} className="cartao block p-4">
                  <p className="font-titulo text-[20px] font-bold">{v.nome}</p>
                  <p className="text-[15px] text-fosco">
                    {periodo(v.inicio, v.fim)} · {v._count.membros} pessoas
                    {falta > 0 ? ` · faltam ${falta} dias` : v.fim >= dia ? " · acontecendo agora" : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Link href="/viagens/nova" className="botao mt-6 w-full">Nova viagem</Link>
    </Pagina>
  );
}
