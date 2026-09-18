import Link from "next/link";
import { criarBoletim } from "./acoes";
import { boletins as buscarBoletins } from "@/lib/consultas-contatos";
import { porBarras } from "@/lib/datas";
import { servicoConfigurado } from "@/lib/email";
import { Aviso, Botao, Cartao, Selo, Topo, Vazio } from "@/componentes/pecas";

export const dynamic = "force-dynamic";

export default async function Boletins() {
  const lista = await buscarBoletins();
  const pronto = servicoConfigurado();

  return (
    <>
      <Topo
        titulo="Boletins"
        chamada="O que o Centro manda para a sua base: o que vem pela frente, escrito à mão, com as atividades montadas pelo sistema."
        acao={
          <form action={criarBoletim}>
            <Botao tipo="primario">Novo boletim</Botao>
          </form>
        }
      />

      {!pronto && (
        <div className="mb-5">
          <Aviso tom="atencao">
            <b>O envio de e-mail ainda não está ligado.</b> Você pode escrever e montar boletins
            normalmente — eles ficam guardados como rascunho —, mas o disparo só funciona depois de
            configurar o serviço. Enquanto isso, a base de contatos continua inteira e dá para{" "}
            <Link href="/contatos" className="text-realce underline">baixar a lista segmentada</Link>{" "}
            para usar onde vocês já mandam e-mail hoje. O passo a passo está em{" "}
            <code>docs/BOLETIM.md</code>.
          </Aviso>
        </div>
      )}

      {lista.length === 0 ? (
        <Vazio
          acao={
            <form action={criarBoletim}>
              <Botao tipo="primario">Escrever o primeiro</Botao>
            </form>
          }
        >
          Nenhum boletim ainda.
        </Vazio>
      ) : (
        <Cartao como="section">
          <ul>
            {lista.map((b) => (
              <li key={b.id} className="border-b border-linha last:border-b-0">
                <Link href={`/boletins/${b.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-linha/60">
                  <span className="min-w-[220px] flex-1">
                    <span className="block text-[15px] font-medium">{b.assunto}</span>
                    <span className="block text-[13px] text-fosco">
                      {b.enviadoEm
                        ? `enviado em ${porBarras(b.enviadoEm.toISOString().slice(0, 10))}`
                        : `criado em ${porBarras(b.criadoEm.toISOString().slice(0, 10))}`}
                      {b.atividades.length > 0 &&
                        ` · ${b.atividades.length} ${b.atividades.length === 1 ? "atividade" : "atividades"}`}
                    </span>
                  </span>

                  {b._count.envios > 0 && (
                    <span className="tabular text-[13px] text-fosco">
                      {b._count.envios} {b._count.envios === 1 ? "destinatário" : "destinatários"}
                    </span>
                  )}

                  <Selo
                    cor={
                      b.estado === "ENVIADO"
                        ? "var(--tinta-verde)"
                        : b.estado === "ENVIANDO"
                          ? "var(--tinta-ambar)"
                          : "var(--fosco)"
                    }
                  >
                    {b.estado === "ENVIADO" ? "Enviado" : b.estado === "ENVIANDO" ? "Enviando" : "Rascunho"}
                  </Selo>
                </Link>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </>
  );
}
