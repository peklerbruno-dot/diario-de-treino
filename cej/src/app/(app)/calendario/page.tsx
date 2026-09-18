import Link from "next/link";
import { exigirPessoa } from "@/lib/auth";
import { atividadesEntre, reunioesEntre } from "@/lib/consultas";
import {
  comMaiuscula, gradeDoMes, hoje, mesAnterior, mesDe, mesSeguinte, nomeCurtoDoDiaDaSemana,
  nomeDoMesCompleto, partes,
} from "@/lib/datas";
import { COR_DO_ESTADO, NOME_DO_TIPO } from "@/lib/tipos";
import { Cartao, Chamada, Sobrescrito, Titulo } from "@/componentes/pecas";
import { enderecoDoSistema } from "@/lib/endereco";

export const dynamic = "force-dynamic";

/**
 * O mês inteiro numa tela.
 *
 * Atividades e reuniões no mesmo quadro, com a cor da situação de cada uma.
 * É a tela que responde "está muito cheio em outubro?" — pergunta que a lista,
 * por mais bem ordenada que esteja, nunca responde.
 *
 * Uma atividade de vários dias aparece em cada dia que ela ocupa. Desenhar uma
 * faixa contínua por cima das células exigiria posicionamento absoluto e
 * quebraria no celular; repetir o título em cada dia é feio no papel e certo na
 * prática, porque cada dia é uma célula que alguém olha por si.
 */
export default async function Calendario({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes = mesDe(hoje()) } = await searchParams;
  const mesAno = /^\d{4}-\d{2}$/.test(mes) ? mes : mesDe(hoje());
  const pessoa = await exigirPessoa();

  const grade = gradeDoMes(mesAno);
  const primeiro = grade[0][0].dia;
  const ultimo = grade[grade.length - 1][6].dia;

  const [atividades, reunioes] = await Promise.all([
    atividadesEntre(primeiro, ultimo),
    reunioesEntre(primeiro, ultimo),
  ]);

  // Uma atividade que dura vários dias precisa aparecer em todos eles, e a
  // consulta só a trouxe pelo dia de início.
  const porDia = new Map<string, { id: string; titulo: string; cor: string; href: string; hora: string | null; tipo: string }[]>();
  const por = (dia: string) => {
    if (!porDia.has(dia)) porDia.set(dia, []);
    return porDia.get(dia)!;
  };

  for (const a of atividades) {
    const item = {
      id: a.id,
      titulo: a.titulo,
      cor: COR_DO_ESTADO[a.estado],
      href: `/atividades/${a.id}`,
      hora: a.hora,
      tipo: NOME_DO_TIPO[a.tipo],
    };
    por(a.dia).push(item);
    if (a.diaFinal) {
      for (let d = proximo(a.dia); d <= a.diaFinal && d <= ultimo; d = proximo(d)) {
        por(d).push({ ...item, hora: null });
      }
    }
  }
  for (const r of reunioes) {
    por(r.dia).push({
      id: r.id,
      titulo: r.titulo,
      cor: r.estado === "CANCELADA" ? "var(--tinta-vermelha)" : "var(--fosco)",
      href: `/reunioes/${r.id}`,
      hora: r.hora,
      tipo: "Reunião",
    });
  }

  const hojeStr = hoje();

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Sobrescrito>Calendário</Sobrescrito>
          <Titulo className="mt-1">{comMaiuscula(nomeDoMesCompleto(mesAno))}</Titulo>
          <Chamada>
            Atividades e reuniões no mesmo quadro. A cor é a situação de cada uma.
          </Chamada>
        </div>
        <nav className="nao-imprime flex items-center gap-2">
          <Seta href={`/calendario?mes=${mesAnterior(mesAno)}`} rotulo="Mês anterior">←</Seta>
          <Link
            href="/calendario"
            className="rounded-folha bg-cartao px-3.5 py-2 text-[14px] shadow-baixa hover:bg-linha"
          >
            Hoje
          </Link>
          <Seta href={`/calendario?mes=${mesSeguinte(mesAno)}`} rotulo="Próximo mês">→</Seta>
        </nav>
      </div>

      <Cartao className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-linha bg-papel">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="sobrescrito px-2 py-2 text-center">
              {nomeCurtoDoDiaDaSemana(i)}
            </div>
          ))}
        </div>

        {grade.map((semana, i) => (
          <div key={i} className="grid grid-cols-7 border-b border-linha last:border-b-0">
            {semana.map(({ dia, doMes }) => {
              const itens = porDia.get(dia) ?? [];
              const ehHoje = dia === hojeStr;
              return (
                <div
                  key={dia}
                  className={`min-h-[104px] border-r border-linha p-1.5 last:border-r-0 ${
                    doMes ? "" : "bg-papel/60"
                  }`}
                >
                  <div className="mb-1 flex justify-end">
                    <span
                      className={`tabular inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-pilula px-1 text-[12px] ${
                        ehHoje
                          ? "bg-realce font-bold text-white"
                          : doMes
                            ? "text-grafite"
                            : "text-regua"
                      }`}
                    >
                      {partes(dia).dia}
                    </span>
                  </div>

                  <ul className="space-y-1">
                    {itens.map((item, j) => (
                      <li key={`${item.id}-${j}`}>
                        <Link
                          href={item.href}
                          title={`${item.tipo}: ${item.titulo}`}
                          className="block rounded-[6px] px-1.5 py-1 text-[11.5px] leading-tight hover:bg-linha"
                          style={{ borderLeft: `3px solid ${item.cor}` }}
                        >
                          {item.hora && <span className="tabular mr-1 text-fosco">{item.hora}</span>}
                          <span className={doMes ? "" : "text-fosco"}>{item.titulo}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ))}
      </Cartao>

      <AssinarNoGoogle endereco={`${await enderecoDoSistema()}/api/agenda/${pessoa.chaveDaAgenda}/cej.ics`} />
    </>
  );
}

const proximo = (dia: string) => {
  const { ano, mes, dia: d } = partes(dia);
  return new Date(Date.UTC(ano, mes - 1, d + 1)).toISOString().slice(0, 10);
};

function Seta({ href, rotulo, children }: { href: string; rotulo: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={rotulo}
      className="flex h-[38px] w-[38px] items-center justify-center rounded-pilula bg-cartao text-[17px] text-grafite shadow-baixa hover:bg-linha"
    >
      {children}
    </Link>
  );
}

/**
 * O convite para levar este calendário para dentro do Google Agenda.
 *
 * Fica no fim da página do calendário, e não escondido numa tela de ajustes:
 * é aqui que a pessoa está quando a vontade aparece.
 */
function AssinarNoGoogle({ endereco }: { endereco: string }) {
  return (
    <Cartao como="section" className="nao-imprime mt-5 p-5">
      <Sobrescrito>Levar para o Google Agenda</Sobrescrito>
      <p className="mt-2 max-w-leitura text-[14.5px] leading-relaxed text-grafite">
        Este calendário pode aparecer dentro do seu Google Agenda, junto das suas outras agendas, e
        se atualizar sozinho quando a equipe mexer em alguma coisa aqui. Você faz isso uma vez:
      </p>
      <ol className="mt-3 max-w-leitura list-decimal space-y-1.5 pl-5 text-[14.5px] leading-relaxed text-grafite">
        <li>Copie o endereço abaixo.</li>
        <li>
          No computador, abra o Google Agenda e, na coluna da esquerda, clique no <b>+</b> ao lado
          de &ldquo;Outras agendas&rdquo; → <b>De URL</b>.
        </li>
        <li>Cole o endereço e clique em <b>Adicionar agenda</b>.</li>
      </ol>

      <p className="mt-3 break-all rounded-folha bg-papel px-3.5 py-2.5 font-mono text-[12.5px]">
        {endereco}
      </p>

      <p className="mt-2.5 max-w-leitura text-[13px] leading-relaxed text-fosco">
        O Google costuma buscar as novidades a cada poucas horas, não na hora — uma reunião
        remarcada agora pode levar um tempo para mudar de lugar na sua agenda. Aqui no sistema ela
        muda na hora.
      </p>
      <p className="mt-2 max-w-leitura text-[13px] leading-relaxed text-fosco">
        Este endereço é seu e funciona sem senha: quem o tiver vê a agenda do Centro. Não publique
        num lugar aberto. Se precisar, a coordenação troca a sua chave na tela Equipe, e o endereço
        antigo para de valer na hora.
      </p>
    </Cartao>
  );
}
