import type { Metadata } from "next";
import { lerBlocos } from "@/lib/conteudo";
import { BlocoEditavel, SoEquipe, Vazio } from "@/componentes/edicao/Editaveis";
import { CapaPagina, LinkInteligente, classeBotao } from "@/componentes/Pecas";
import { canais } from "@/componentes/Redes";
import { Texto } from "@/componentes/Texto";
import { IconeLocal, IconeRelogio } from "@/componentes/Icones";

export const metadata: Metadata = { title: "Contato" };

export default async function Contato() {
  const blocos = await lerBlocos(["contato.info", "contato.apoie"]);
  const info = blocos["contato.info"];
  const apoie = blocos["contato.apoie"];
  const redes = canais(info);
  const nada = !redes.length && !info.endereco && !info.horario;

  return (
    <>
      <CapaPagina sobre="Contato" titulo="Fale com a gente">
        Quer conhecer a Chazit, matricular alguém ou tirar uma dúvida? A gente responde.
      </CapaPagina>

      <BlocoEditavel chave="contato.info" dados={info}>
        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 lg:grid-cols-2">
          <div className="space-y-4">
            {redes.map(({ chave, href, rotulo, nome, Icone }) => (
              <a key={chave} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-3xl bg-white p-5 ring-2 ring-marinho/10 transition hover:-translate-y-0.5 hover:ring-azul">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-marinho text-white">
                  <Icone className="h-7 w-7" />
                </span>
                <span>
                  <span className="block font-titulo text-sm font-bold uppercase tracking-wider text-azul">{nome}</span>
                  <span className="block font-titulo text-lg font-black text-marinho">{rotulo}</span>
                </span>
              </a>
            ))}
            {info.horario ? (
              <div className="flex items-start gap-4 rounded-3xl bg-amarelo p-5">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-marinho text-white">
                  <IconeRelogio className="h-7 w-7" />
                </span>
                <span>
                  <span className="block font-titulo text-sm font-bold uppercase tracking-wider text-marinho/70">Quando</span>
                  <Texto valor={info.horario} className="font-corpo text-lg text-marinho" />
                </span>
              </div>
            ) : null}
            {info.endereco ? (
              <div className="flex items-start gap-4 rounded-3xl bg-verde p-5">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-marinho text-white">
                  <IconeLocal className="h-7 w-7" />
                </span>
                <span>
                  <span className="block font-titulo text-sm font-bold uppercase tracking-wider text-marinho/70">Onde</span>
                  <Texto valor={info.endereco} className="font-corpo text-lg text-marinho" />
                </span>
              </div>
            ) : null}
            {nada ? (
              <p className="font-corpo text-lg text-slate-600">Os nossos contatos chegam aqui em breve.</p>
            ) : null}
            <Vazio>Preencha WhatsApp, e-mail, Instagram e endereço em “Editar contato e endereço”. Campo vazio não aparece no site.</Vazio>
          </div>
          {info.endereco ? (
            <iframe
              title="Mapa"
              src={`https://www.google.com/maps?q=${encodeURIComponent(info.endereco.replace(/\n/g, ", "))}&output=embed`}
              className="h-[22rem] w-full rounded-3xl border-0 lg:h-full lg:min-h-[26rem]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : null}
        </section>
      </BlocoEditavel>

      {apoie.texto ? (
        <div className="mx-auto max-w-6xl px-4">
          <BlocoEditavel chave="contato.apoie" dados={apoie} className="rounded-[2.5rem]">
            <ApoieConteudo apoie={apoie} />
          </BlocoEditavel>
        </div>
      ) : (
        <div className="mx-auto max-w-6xl px-4">
          <SoEquipe>
            <BlocoEditavel chave="contato.apoie" dados={apoie} className="min-h-[4.5rem] rounded-2xl bg-rosa/40">
              <p className="px-5 py-6 pr-52 font-corpo text-marinho/80">
                “Apoie a Chazit” está escondida. Para mostrar, clique em editar e escreva um texto.
              </p>
            </BlocoEditavel>
          </SoEquipe>
        </div>
      )}
    </>
  );
}

function ApoieConteudo({ apoie }: { apoie: Record<string, string> }) {
  return (
    <section className="rounded-[2.5rem] bg-rosa px-6 py-12 text-marinho sm:px-12">
      <h2 className="font-titulo text-3xl font-black uppercase tracking-tight sm:text-4xl">{apoie.titulo || "Apoie a Chazit"}</h2>
      <Texto valor={apoie.texto ?? ""} className="prosa mt-4 max-w-2xl font-corpo text-lg leading-relaxed" />
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {apoie.pix ? (
          <p className="rounded-2xl bg-white/70 px-5 py-3 font-corpo text-lg">
            <strong className="font-titulo">PIX:</strong> <span className="select-all">{apoie.pix}</span>
          </p>
        ) : null}
        {apoie.link ? (
          <LinkInteligente href={apoie.link} className={classeBotao.escuro}>
            Quero contribuir →
          </LinkInteligente>
        ) : null}
      </div>
    </section>
  );
}
