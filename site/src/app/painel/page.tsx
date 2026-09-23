import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sessao } from "@/lib/auth";
import { historico, lixeira } from "@/lib/conteudo";
import { COLECOES, ehTipoItem, type Dados } from "@/lib/esquema";
import { Restaurar } from "./Restaurar";

export const metadata: Metadata = { title: "Painel da equipe", robots: { index: false } };

const quando = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);

const ATALHOS = [
  { href: "/agenda", rotulo: "Agenda", texto: "Marcar peulá, machané ou evento", cor: "bg-amarelo" },
  { href: "/chadashot", rotulo: "Notícias", texto: "Escrever uma notícia nova", cor: "bg-rosa" },
  { href: "/fotos", rotulo: "Fotos", texto: "Subir fotos da última atividade", cor: "bg-verde" },
  { href: "/shichvot", rotulo: "Shichvot", texto: "Mudar nomes, idades e textos", cor: "bg-turquesa" },
  { href: "/contato", rotulo: "Contato", texto: "WhatsApp, Instagram, endereço", cor: "bg-celeste" },
  { href: "/a-chazit", rotulo: "A Chazit", texto: "Quem somos, história, documentos", cor: "bg-amarelo" },
];

export default async function Painel() {
  const eu = await sessao();
  if (!eu) redirect("/entrar");
  const [mudancas, apagados] = await Promise.all([historico(), lixeira()]);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10">
      <h1 className="font-titulo text-3xl font-black uppercase tracking-tight text-marinho sm:text-4xl">Oi, {eu.nome}!</h1>
      <p className="mt-2 font-corpo text-lg text-slate-600">Este é o painel da equipe. Só quem entrou vê esta página.</p>

      <section className="mt-8 rounded-3xl bg-marinho p-6 text-white sm:p-8">
        <h2 className="font-titulo text-xl font-black uppercase">Como editar o site</h2>
        <ol className="mt-4 grid gap-4 font-corpo sm:grid-cols-3">
          <li className="rounded-2xl bg-white/10 p-4">
            <span className="font-titulo text-3xl font-black text-edicao">1</span>
            <p className="mt-1">Vá até a página que você quer mudar, pelo menu de cima.</p>
          </li>
          <li className="rounded-2xl bg-white/10 p-4">
            <span className="font-titulo text-3xl font-black text-edicao">2</span>
            <p className="mt-1">
              Clique no botão amarelo <strong>✏️ Editar</strong>, ou em <strong>+ Adicionar</strong> para criar algo novo.
            </p>
          </li>
          <li className="rounded-2xl bg-white/10 p-4">
            <span className="font-titulo text-3xl font-black text-edicao">3</span>
            <p className="mt-1">
              Mude o que quiser e clique em <strong>Salvar e publicar</strong>. Pronto: já está no ar.
            </p>
          </li>
        </ol>
        <ul className="mt-5 space-y-1.5 font-corpo text-[15px] text-white/85">
          <li>🙈 <strong>Esconder</strong> tira algo do site sem apagar — bom para rascunhos.</li>
          <li>← → mudam a ordem dos cartões. A agenda e as notícias se arrumam sozinhas pela data.</li>
          <li>🗑 Apagou sem querer? Toque em <strong>Desfazer</strong>, ou traga de volta na lixeira abaixo.</li>
          <li>👀 <strong>Ver como visitante</strong>, na faixa amarela, mostra o site sem os botões.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-titulo text-xl font-black uppercase text-marinho">O que você quer fazer?</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ATALHOS.map((a) => (
            <li key={a.href}>
              <Link href={a.href} className={`block h-full rounded-2xl ${a.cor} p-5 text-marinho transition hover:-translate-y-0.5 hover:shadow-lg`}>
                <span className="font-titulo text-lg font-black">{a.rotulo} →</span>
                <span className="mt-1 block font-corpo text-[15px] text-marinho/80">{a.texto}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="font-titulo text-xl font-black uppercase text-marinho">Últimas mudanças</h2>
          {mudancas.length ? (
            <ul className="mt-4 divide-y divide-slate-200 rounded-2xl bg-white ring-2 ring-marinho/10">
              {mudancas.map((m) => (
                <li key={m.id} className="px-4 py-3 font-corpo text-[15px]">
                  <strong className="text-marinho">{m.quem}</strong> {m.oQue}
                  <span className="block text-sm text-slate-500">{quando(m.quando)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 font-corpo text-slate-600">Ninguém mudou nada ainda.</p>
          )}
        </section>

        <section>
          <h2 className="font-titulo text-xl font-black uppercase text-marinho">Lixeira</h2>
          {apagados.length ? (
            <ul className="mt-4 divide-y divide-slate-200 rounded-2xl bg-white ring-2 ring-marinho/10">
              {apagados.map((a) => {
                const d = (a.dados ?? {}) as Dados;
                const tipo = ehTipoItem(a.tipo) ? COLECOES[a.tipo].singular : a.tipo;
                return (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-3 font-corpo text-[15px]">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-marinho">{d.titulo || d.nome || d.legenda || "(sem nome)"}</span>
                      <span className="text-sm text-slate-500">
                        {tipo} · apagado {a.apagadoEm ? quando(a.apagadoEm) : ""} por {a.atualizadoPor}
                      </span>
                    </span>
                    <Restaurar id={a.id} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 font-corpo text-slate-600">A lixeira está vazia.</p>
          )}
        </section>
      </div>
    </div>
  );
}
