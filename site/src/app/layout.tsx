import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/900.css";
import "@fontsource/lato/400.css";
import "@fontsource/lato/700.css";
import "./globals.css";
import { sessao } from "@/lib/auth";
import { lerBlocos } from "@/lib/conteudo";
import { ProvedorEdicao } from "@/componentes/edicao/Provedor";
import { BarraEdicao } from "@/componentes/edicao/BarraEdicao";
import { BlocoEditavel, SoEquipe } from "@/componentes/edicao/Editaveis";
import { Marca } from "@/componentes/Logo";
import { Navegacao } from "@/componentes/Navegacao";
import { PAGINAS } from "@/lib/paginas";
import { canais } from "@/componentes/Redes";
import { Texto } from "@/componentes/Texto";
import { ehExterno } from "@/lib/links";

export const metadata: Metadata = {
  title: { default: "Chazit Hanoar São Paulo", template: "%s · Chazit Hanoar São Paulo" },
  description: "Movimento juvenil judaico, sionista, educativo, apartidário e continental.",
};

export const viewport: Viewport = { themeColor: "#2B3278" };

// O site muda quando a equipe edita, e cada visita lê o que está no banco.
export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const [equipe, blocos] = await Promise.all([sessao(), lerBlocos(["site.aviso", "contato.info"])]);
  const aviso = blocos["site.aviso"];
  const info = blocos["contato.info"];
  const redes = canais(info);

  return (
    <html lang="pt-BR">
      <body>
        <ProvedorEdicao equipe={equipe}>
          <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
            Pular para o conteúdo
          </a>
          <BarraEdicao />

          {aviso.texto ? (
            <BlocoEditavel chave="site.aviso" dados={aviso}>
              <FaixaAviso texto={aviso.texto} link={aviso.link ?? ""} />
            </BlocoEditavel>
          ) : (
            <SoEquipe>
              <BlocoEditavel chave="site.aviso" dados={aviso}>
                <p className="bg-slate-100 px-4 py-3 pr-56 font-corpo text-sm text-slate-500">
                  Faixa de aviso desligada. Use para chamar atenção: inscrições abertas, machané, evento especial.
                </p>
              </BlocoEditavel>
            </SoEquipe>
          )}

          <header className="sticky top-0 z-50 border-b border-marinho/10 bg-white/95 backdrop-blur">
            <div className="relative mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-4 px-4">
              <Link href="/" aria-label="Chazit Hanoar São Paulo — início">
                <Marca />
              </Link>
              <Navegacao />
            </div>
          </header>

          <main id="conteudo">{children}</main>

          <footer className="mt-20 bg-marinho text-white">
            <BlocoEditavel chave="contato.info" dados={info}>
              <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.3fr_1fr_1fr]">
                <div>
                  <Marca claro />
                  <p className="mt-5 max-w-xs font-corpo text-[15px] leading-relaxed text-white/80">
                    Movimento juvenil judaico, sionista, educativo, apartidário e continental.
                  </p>
                  {redes.length ? (
                    <ul className="mt-5 flex gap-2">
                      {redes.map(({ chave, href, nome, Icone }) => (
                        <li key={chave}>
                          <a href={href} target="_blank" rel="noopener noreferrer" aria-label={nome} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 transition hover:bg-azul">
                            <Icone />
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div>
                  <h2 className="font-titulo text-sm font-black uppercase tracking-widest text-celeste">Navegue</h2>
                  <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 font-corpo text-[15px]">
                    {PAGINAS.map((p) => (
                      <li key={p.href}>
                        <Link href={p.href} className="text-white/85 hover:text-white hover:underline">
                          {p.rotulo}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h2 className="font-titulo text-sm font-black uppercase tracking-widest text-celeste">Onde estamos</h2>
                  {info.endereco ? <Texto valor={info.endereco} className="mt-4 font-corpo text-[15px] leading-relaxed text-white/85" /> : null}
                  {info.horario ? <Texto valor={info.horario} className="mt-3 font-corpo text-[15px] leading-relaxed text-white/85" /> : null}
                  {!info.endereco && !info.horario ? (
                    <p className="mt-4 font-corpo text-[15px] text-white/85">
                      <Link href="/contato" className="underline">Fale com a gente</Link>
                    </p>
                  ) : null}
                </div>
              </div>
            </BlocoEditavel>
            <div className="border-t border-white/10">
              <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 font-corpo text-sm text-white/60">
                <span>© {new Date().getFullYear()} Chazit Hanoar São Paulo</span>
                <Link href={equipe ? "/painel" : "/entrar"} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white/70 hover:bg-white/10 hover:text-white">
                  🔒 Área da equipe
                </Link>
              </div>
            </div>
          </footer>
        </ProvedorEdicao>
      </body>
    </html>
  );
}

function FaixaAviso({ texto, link }: { texto: string; link: string }) {
  const conteudo = (
    <span className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2.5 text-center font-titulo text-sm font-bold">
      {texto}
      {link ? <span aria-hidden="true">→</span> : null}
    </span>
  );
  const classe = "block bg-azul text-white";
  if (!link) return <div className={classe}>{conteudo}</div>;
  return ehExterno(link) ? (
    <a href={link} target="_blank" rel="noopener noreferrer" className={`${classe} hover:bg-marinho`}>
      {conteudo}
    </a>
  ) : (
    <Link href={link} className={`${classe} hover:bg-marinho`}>
      {conteudo}
    </Link>
  );
}
