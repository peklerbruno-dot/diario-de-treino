import Link from "next/link";
import { compromissos, marcos, porDia, type Compromisso, type Marco } from "@/lib/agenda";
import { bd } from "@/lib/bd";
import { corDaConta } from "@/lib/cores";
import { diaEmSaoPaulo, horaCurta, minutosDoDia, segundaDaSemana, somarDias } from "@/lib/datas";
import { emFaixas } from "@/lib/faixas";
import { IconeSeta, IconeVoltar } from "@/componentes/icones";

export const dynamic = "force-dynamic";

type Busca = Promise<{ dia?: string; vista?: string }>;

const HORA_PX = 48;
const NOMES_SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

const rotuloMes = (dia: string) =>
  new Date(`${dia}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" });
const numeroDia = (dia: string) => Number(dia.slice(8));
const diaExtenso = (dia: string) =>
  new Date(`${dia}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

export default async function Agenda({ searchParams }: { searchParams: Busca }) {
  const q = await searchParams;
  const hoje = diaEmSaoPaulo();
  const foco = q.dia && /^\d{4}-\d{2}-\d{2}$/.test(q.dia) ? q.dia : hoje;
  const vista = q.vista === "mes" ? "mes" : "semana";

  // O intervalo: a semana do dia em foco, ou as seis semanas que cobrem o mês.
  const primeiroDoMes = `${foco.slice(0, 7)}-01`;
  const ini = vista === "mes" ? segundaDaSemana(primeiroDoMes) : segundaDaSemana(foco);
  const nDias = vista === "mes" ? 42 : 7;
  const dias = Array.from({ length: nDias }, (_, i) => somarDias(ini, i));
  const fim = dias[dias.length - 1];

  const contas = await bd.conta.findMany({ orderBy: { criadoEm: "asc" } });
  const [eventos, ms] = await Promise.all([
    compromissos(contas, new Date(`${ini}T03:00:00Z`), new Date(`${somarDias(fim, 1)}T03:00:00Z`)),
    marcos(contas, ini, fim),
  ]);
  const doDia = porDia(eventos);
  const marcosDoDia = (d: string) => ms.filter((m) => m.dia === d);

  const passo = vista === "mes" ? 30 : 7;
  const anterior = vista === "mes" ? somarDias(primeiroDoMes, -1) : somarDias(foco, -passo);
  const proximo = vista === "mes" ? somarDias(primeiroDoMes, 32) : somarDias(foco, passo);
  const link = (dia: string, v = vista) => `/agenda?dia=${dia}${v === "mes" ? "&vista=mes" : ""}`;

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-[26px] font-semibold tracking-tight first-letter:uppercase lg:text-[28px]">{rotuloMes(vista === "mes" ? primeiroDoMes : foco)}</h1>
        <div className="flex items-center rounded-md border border-linha">
          <Link href={link(anterior)} className="p-1.5 text-grafite hover:bg-realce" aria-label="Anterior">
            <IconeVoltar />
          </Link>
          <Link href={link(hoje)} className="border-x border-linha px-3 py-1 text-sm font-medium hover:bg-realce">
            Hoje
          </Link>
          <Link href={link(proximo)} className="p-1.5 text-grafite hover:bg-realce" aria-label="Próximo">
            <IconeSeta />
          </Link>
        </div>
        <div className="ml-auto flex rounded-md bg-realce p-0.5 text-sm">
          {(["semana", "mes"] as const).map((v) => (
            <Link key={v} href={link(foco, v)} className={`rounded px-3 py-1 ${vista === v ? "bg-superficie font-semibold shadow-sm" : "text-grafite"}`}>
              {v === "semana" ? "Semana" : "Mês"}
            </Link>
          ))}
        </div>
        <Legenda contas={contas.map((c) => ({ rotulo: c.rotulo, cor: corDaConta(contas, c.id) }))} />
      </header>

      {vista === "mes" ? (
        <Mes dias={dias} mes={foco.slice(0, 7)} hoje={hoje} doDia={doDia} marcosDoDia={marcosDoDia} link={link} />
      ) : (
        <>
          <div className="hidden lg:block">
            <Semana dias={dias} hoje={hoje} doDia={doDia} marcosDoDia={marcosDoDia} />
          </div>
          <div className="lg:hidden">
            <ListaDaSemana dias={dias} hoje={hoje} doDia={doDia} marcosDoDia={marcosDoDia} />
          </div>
        </>
      )}
    </div>
  );
}

function Legenda({ contas }: { contas: { rotulo: string; cor: string }[] }) {
  return (
    <div className="flex w-full flex-wrap gap-x-4 gap-y-1 lg:w-auto">
      {contas.map((c) => (
        <span key={c.rotulo} className="flex items-center gap-1.5 text-mini text-grafite">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c.cor }} />
          {c.rotulo}
        </span>
      ))}
      <span className="flex items-center gap-1.5 text-mini text-grafite">
        <span className="h-2.5 w-2.5 rounded-full border-2 border-atencao" />
        Prazo
      </span>
      <span className="flex items-center gap-1.5 text-mini text-grafite">
        <span className="h-2.5 w-2.5 rounded-[2px] border-2 border-destaque" />
        Tarefa
      </span>
    </div>
  );
}

function ChipMarco({ m }: { m: Marco }) {
  return (
    <Link
      href={m.href}
      className={`flex items-center gap-1.5 truncate rounded px-1.5 py-0.5 text-mini hover:bg-realce ${m.feito ? "text-fosco line-through" : "text-tinta"}`}
      title={m.titulo}
    >
      {m.tipo === "prazo" ? (
        <span className="h-2 w-2 shrink-0 rounded-full border-2 border-atencao" />
      ) : (
        <span className="h-2 w-2 shrink-0 rounded-[2px] border-2 border-destaque" />
      )}
      <span className="truncate">{m.titulo}</span>
    </Link>
  );
}

function ChipDiaInteiro({ e }: { e: Compromisso }) {
  return (
    <a
      href={e.link}
      target="_blank"
      rel="noreferrer"
      className="block truncate rounded px-1.5 py-0.5 text-mini font-medium"
      style={{ background: `color-mix(in srgb, ${e.cor} 16%, transparent)`, color: e.cor }}
      title={e.titulo}
    >
      {e.titulo}
    </a>
  );
}

function Semana({
  dias,
  hoje,
  doDia,
  marcosDoDia,
}: {
  dias: string[];
  hoje: string;
  doDia: Map<string, Compromisso[]>;
  marcosDoDia: (d: string) => Marco[];
}) {
  const comHora = dias.flatMap((d) => (doDia.get(d) ?? []).filter((e) => !e.diaInteiro));
  // De 7h às 22h, esticando se houver algo antes ou depois.
  const primeira = Math.min(7, ...comHora.map((e) => Math.floor(minutosDoDia(e.inicio) / 60)));
  const ultima = Math.max(22, ...comHora.map((e) => Math.ceil(minutosDoDia(e.fim) / 60) || 24));
  const horas = Array.from({ length: ultima - primeira }, (_, i) => primeira + i);
  const agoraMin = minutosDoDia(new Date());

  return (
    <div className="overflow-hidden rounded-lg border border-linha bg-superficie">
      <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-linha">
        <div />
        {dias.map((d, i) => (
          <div key={d} className="border-l border-linha px-2 py-2">
            <p className={`text-mini uppercase tracking-wide ${d === hoje ? "font-semibold text-destaque" : "text-fosco"}`}>{NOMES_SEMANA[i]}</p>
            <p className={`numeros text-lg leading-tight ${d === hoje ? "font-semibold text-destaque" : ""}`}>{numeroDia(d)}</p>
          </div>
        ))}
      </div>
      {/* Linha de dia inteiro: eventos sem hora, prazos dos e-mails e tarefas. */}
      <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-linha">
        <div className="px-2 py-1.5 text-right text-mini text-fosco">dia</div>
        {dias.map((d) => (
          <div key={d} className="min-h-[34px] space-y-0.5 border-l border-linha p-1">
            {(doDia.get(d) ?? []).filter((e) => e.diaInteiro).map((e, i) => (
              <ChipDiaInteiro key={i} e={e} />
            ))}
            {marcosDoDia(d).map((m) => (
              <ChipMarco key={m.tipo + m.id} m={m} />
            ))}
          </div>
        ))}
      </div>
      <div className="grid max-h-[calc(100vh-260px)] grid-cols-[56px_repeat(7,minmax(0,1fr))] overflow-y-auto">
        <div className="relative">
          {horas.map((h) => (
            <div key={h} style={{ height: HORA_PX }} className="numeros -translate-y-2 pr-2 text-right text-mini text-fosco">
              {h > primeira ? `${String(h).padStart(2, "0")}:00` : ""}
            </div>
          ))}
        </div>
        {dias.map((d) => {
          const lista = emFaixas(
            (doDia.get(d) ?? [])
              .filter((e) => !e.diaInteiro)
              .map((e) => {
                const ini = d === diaEmSaoPaulo(e.inicio) ? minutosDoDia(e.inicio) : 0;
                const fim = d === diaEmSaoPaulo(e.fim) ? minutosDoDia(e.fim) : 24 * 60;
                return { e, ini, fim: Math.max(fim, ini + 20) };
              }),
          );
          return (
            <div key={d} className="relative border-l border-linha" style={{ height: horas.length * HORA_PX }}>
              {horas.map((h, i) => (
                <div key={h} className="absolute inset-x-0 border-t border-linha" style={{ top: i * HORA_PX }} />
              ))}
              {d === hoje && agoraMin >= primeira * 60 && agoraMin <= ultima * 60 && (
                <div className="absolute inset-x-0 z-10 border-t-2 border-atencao" style={{ top: ((agoraMin - primeira * 60) / 60) * HORA_PX }}>
                  <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-atencao" />
                </div>
              )}
              {lista.map(({ e, ini, fim, faixa, faixas }, i) => {
                const top = ((ini - primeira * 60) / 60) * HORA_PX;
                const altura = Math.max(((fim - ini) / 60) * HORA_PX - 2, 18);
                return (
                  <a
                    key={i}
                    href={e.link}
                    target="_blank"
                    rel="noreferrer"
                    title={`${horaCurta(e.inicio)} ${e.titulo} · ${e.conta}`}
                    className="absolute overflow-hidden rounded-[5px] border-l-[3px] px-1.5 py-0.5 text-mini leading-tight hover:brightness-95"
                    style={{
                      top,
                      height: altura,
                      left: `calc(${(faixa / faixas) * 100}% + 2px)`,
                      width: `calc(${100 / faixas}% - 4px)`,
                      borderColor: e.cor,
                      background: `color-mix(in srgb, ${e.cor} 14%, var(--superficie))`,
                    }}
                  >
                    <span className="block truncate font-semibold" style={{ color: `color-mix(in srgb, ${e.cor} 75%, var(--tinta))` }}>
                      {e.titulo}
                    </span>
                    {altura > 30 && <span className="numeros block truncate text-grafite">{horaCurta(e.inicio)}</span>}
                  </a>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListaDaSemana({
  dias,
  hoje,
  doDia,
  marcosDoDia,
}: {
  dias: string[];
  hoje: string;
  doDia: Map<string, Compromisso[]>;
  marcosDoDia: (d: string) => Marco[];
}) {
  return (
    <div>
      {dias.map((d) => {
        const evs = doDia.get(d) ?? [];
        const ms = marcosDoDia(d);
        return (
          <section key={d} className="mb-5">
            <h2 className={`mb-1 border-b border-linha pb-1 text-sm font-semibold first-letter:uppercase ${d === hoje ? "text-destaque" : ""}`}>
              {d === hoje ? "Hoje · " : ""}
              {diaExtenso(d)}
            </h2>
            {!evs.length && !ms.length && <p className="py-1 text-sm text-fosco">Livre.</p>}
            {ms.map((m) => (
              <ChipMarco key={m.tipo + m.id} m={m} />
            ))}
            {evs.map((e, i) => (
              <a key={i} href={e.link} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-1.5">
                <span className="numeros w-12 shrink-0 text-sm text-grafite">{e.diaInteiro ? "dia" : horaCurta(e.inicio)}</span>
                <span className="h-4 w-[3px] shrink-0 rounded-full" style={{ background: e.cor }} />
                <span className="min-w-0 flex-1 truncate text-[15px]">{e.titulo}</span>
                <span className="text-mini font-semibold uppercase" style={{ color: e.cor }}>
                  {e.conta}
                </span>
              </a>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function Mes({
  dias,
  mes,
  hoje,
  doDia,
  marcosDoDia,
  link,
}: {
  dias: string[];
  mes: string;
  hoje: string;
  doDia: Map<string, Compromisso[]>;
  marcosDoDia: (d: string) => Marco[];
  link: (dia: string, v?: "semana" | "mes") => string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-linha bg-superficie">
      <div className="grid grid-cols-7 border-b border-linha">
        {NOMES_SEMANA.map((n) => (
          <p key={n} className="px-2 py-1.5 text-mini uppercase tracking-wide text-fosco">
            {n}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((d, i) => {
          const evs = doDia.get(d) ?? [];
          const ms = marcosDoDia(d);
          const itens = ms.length + evs.length;
          return (
            <Link
              key={d}
              href={link(d, "semana")}
              className={`min-h-[64px] border-b border-linha p-1 hover:bg-realce lg:min-h-[108px] ${i % 7 ? "border-l" : ""} ${d.slice(0, 7) !== mes ? "bg-fundo text-fosco" : ""}`}
            >
              <p className={`numeros mb-0.5 px-1 text-sm ${d === hoje ? "inline-block rounded-full bg-destaque px-1.5 font-semibold text-destaque-tinta" : ""}`}>
                {numeroDia(d)}
              </p>
              {/* No celular, só pontinhos; no computador, os títulos. */}
              <div className="flex flex-wrap gap-0.5 px-1 lg:hidden">
                {ms.map((m) => (
                  <span key={m.id} className={`h-1.5 w-1.5 ${m.tipo === "prazo" ? "rounded-full bg-atencao" : "rounded-[1px] bg-destaque"}`} />
                ))}
                {evs.slice(0, 4).map((e, k) => (
                  <span key={k} className="h-1.5 w-1.5 rounded-full" style={{ background: e.cor }} />
                ))}
              </div>
              <div className="hidden space-y-0.5 lg:block">
                {ms.slice(0, 2).map((m) => (
                  <p key={m.id} className="flex items-center gap-1 truncate text-mini">
                    <span className={`h-1.5 w-1.5 shrink-0 border ${m.tipo === "prazo" ? "rounded-full border-atencao" : "rounded-[1px] border-destaque"}`} />
                    <span className="truncate">{m.titulo}</span>
                  </p>
                ))}
                {evs.slice(0, Math.max(0, 3 - Math.min(2, ms.length))).map((e, k) => (
                  <p key={k} className="flex items-center gap-1 truncate text-mini">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: e.cor }} />
                    <span className="numeros shrink-0 text-fosco">{e.diaInteiro ? "" : horaCurta(e.inicio)}</span>
                    <span className="truncate">{e.titulo}</span>
                  </p>
                ))}
                {itens > 3 && <p className="text-mini text-fosco">+{itens - 3}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
