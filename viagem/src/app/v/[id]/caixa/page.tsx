import Link from "next/link";
import { bd } from "@/lib/bd";
import { exigirMembro } from "@/lib/auth";
import { Cabecalho, Pagina, Vazio } from "@/componentes/pecas";

const ESTADOS: Record<string, { nome: string; classe: string }> = {
  pronta: { nome: "Para revisar", classe: "bg-realce-fraco text-realce" },
  falhou: { nome: "Não deu para ler", classe: "bg-vermelho-fraco text-vermelho" },
  pendente: { nome: "Lendo…", classe: "bg-ambar-fraco text-ambar" },
  revisada: { nome: "Revisada", classe: "bg-verde-fraco text-verde" },
};

export default async function Caixa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirMembro(id);
  const importacoes = await bd.importacao.findMany({ where: { viagemId: id }, orderBy: { criadoEm: "desc" }, take: 60 });
  const membros = await bd.membro.findMany({ where: { viagemId: id }, select: { id: true, nome: true } });
  const nome = (mid: string | null) => membros.find((m) => m.id === mid)?.nome.split(" ")[0] ?? "Atalho";

  return (
    <Pagina abas>
      <Cabecalho titulo="Caixa de entrada" voltar={`/v/${id}/lugares`} subtitulo="Tudo que chegou — pela tela, pelo atalho ou pelo compartilhar." />
      {importacoes.length === 0 ? (
        <Vazio titulo="Nada por aqui">Mande um post em <Link href={`/v/${id}/adicionar`} className="font-semibold text-realce">Adicionar</Link>.</Vazio>
      ) : (
        <ul className="space-y-2.5">
          {importacoes.map((i) => {
            const e = ESTADOS[i.estado] ?? ESTADOS.pendente;
            const qtd = Array.isArray(i.sugestoes) ? i.sugestoes.length : 0;
            return (
              <li key={i.id}>
                <Link href={`/v/${id}/caixa/${i.id}`} className="cartao block p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-pilula px-2.5 py-0.5 text-[13px] font-semibold ${e.classe}`}>{e.nome}</span>
                    <span className="text-[13px] text-fosco">
                      {nome(i.membroId)} · {i.criadoEm.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 break-all text-[15px]">{i.entrada}</p>
                  {i.estado !== "falhou" && <p className="mt-1 text-[14px] text-fosco">{qtd} {qtd === 1 ? "lugar sugerido" : "lugares sugeridos"}</p>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Pagina>
  );
}
