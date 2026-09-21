import Link from "next/link";
import {
  alternarInscricao, inscreverDaBase, marcarPresenca, removerInscricao,
} from "../acoes";
import { NOME_DO_VINCULO, type VinculoDoContato } from "@/lib/contatos";
import { Botao, Cartao, Selo, Sobrescrito, Subtitulo } from "@/componentes/pecas";

type Inscrito = {
  id: string;
  compareceu: boolean;
  inscritoEm: Date | null;
  chaveDoCertificado: string;
  contato: { id: string; nome: string; email: string; vinculo: string };
};

/**
 * Inscrição pública, presença e certificado — os três na mesma coluna porque
 * são três momentos de uma coisa só: quem disse que vem, quem veio, e o papel
 * que comprova.
 */
export function Inscricoes({
  atividade,
  inscritos,
  endereco,
  contatosDaBase,
}: {
  atividade: { id: string; inscricaoAberta: boolean; chavePublica: string | null; vagas: number | null };
  inscritos: Inscrito[];
  endereco: string;
  contatosDaBase: { id: string; nome: string }[];
}) {
  const presentes = inscritos.filter((i) => i.compareceu);
  const link = atividade.chavePublica ? `${endereco}/inscricao/${atividade.chavePublica}` : null;

  return (
    <Cartao como="section">
      <div className="border-b border-linha px-4 py-3">
        <Subtitulo>Inscrições e presença</Subtitulo>
        <p className="mt-0.5 text-[13px] leading-relaxed text-grafite">
          {inscritos.length === 0
            ? "Ninguém inscrito ainda."
            : `${inscritos.length} ${inscritos.length === 1 ? "inscrito" : "inscritos"}, ${presentes.length} ${presentes.length === 1 ? "presente" : "presentes"}.`}
        </p>
      </div>

      <div className="nao-imprime border-b border-linha bg-papel px-4 py-3">
        <form action={alternarInscricao} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={atividade.id} />
          <label>
            <span className="sobrescrito">Vagas</span>
            <input
              name="vagas"
              type="number"
              min="0"
              defaultValue={atividade.vagas ?? ""}
              placeholder="sem limite"
              className="mt-1 w-[130px] rounded-folha border border-regua bg-cartao px-3 py-2 outline-none focus:border-realce"
            />
          </label>
          <Botao tipo={atividade.inscricaoAberta ? "secundario" : "primario"}>
            {atividade.inscricaoAberta ? "Fechar as inscrições" : "Abrir inscrição pública"}
          </Botao>
        </form>

        {link && (
          <div className="mt-3">
            <Sobrescrito>
              {atividade.inscricaoAberta ? "O endereço para divulgar" : "O endereço (inscrições fechadas)"}
            </Sobrescrito>
            <p className="mt-1 break-all rounded-folha bg-cartao px-3 py-2 font-mono text-[12.5px]">
              {link}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-fosco">
              Ponha no cartaz, no Instagram ou no e-mail. Quem se inscrever entra na base de
              contatos com o consentimento registrado por ela mesma — que é como ele vale mais.
              {atividade.inscricaoAberta ? "" : " Reabrir as inscrições mantém este mesmo endereço."}
            </p>
          </div>
        )}
      </div>

      {inscritos.length > 0 && (
        <ul>
          {inscritos.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-linha px-4 py-2.5 last:border-b-0">
              <form action={marcarPresenca} className="nao-imprime">
                <input type="hidden" name="participacaoId" value={i.id} />
                <button
                  type="submit"
                  aria-label={i.compareceu ? `Marcar ${i.contato.nome} como ausente` : `Marcar ${i.contato.nome} como presente`}
                  className={`flex h-[20px] w-[20px] items-center justify-center rounded-[6px] border text-[12px] font-bold ${
                    i.compareceu ? "border-verde bg-verde text-white" : "border-regua hover:border-realce"
                  }`}
                >
                  {i.compareceu ? "✓" : ""}
                </button>
              </form>

              <span className="min-w-[180px] flex-1">
                <Link href={`/contatos/${i.contato.id}`} className="text-[14.5px] hover:underline">
                  {i.contato.nome}
                </Link>
                <span className="block text-[12.5px] text-fosco">
                  {i.contato.email} · {NOME_DO_VINCULO[i.contato.vinculo as VinculoDoContato]}
                </span>
              </span>

              {i.compareceu ? (
                <a
                  href={`/certificado/${i.chaveDoCertificado}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nao-imprime text-[12.5px] text-realce hover:underline"
                >
                  certificado ↗
                </a>
              ) : (
                <Selo cor="var(--fosco)">inscrito</Selo>
              )}

              <form action={removerInscricao} className="nao-imprime">
                <input type="hidden" name="id" value={i.id} />
                <button
                  type="submit"
                  aria-label={`Remover ${i.contato.nome} da lista`}
                  className="rounded-pilula px-2 py-1 text-[12px] text-fosco hover:bg-linha hover:text-vermelho"
                >
                  remover
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={inscreverDaBase} className="nao-imprime flex flex-wrap items-end gap-2 border-t border-linha bg-papel px-4 py-3">
        <input type="hidden" name="atividadeId" value={atividade.id} />
        <label className="min-w-[220px] flex-1">
          <span className="sobrescrito">Acrescentar alguém da base como presente</span>
          <select
            name="contatoId"
            className="mt-1 w-full rounded-folha border border-regua bg-cartao px-3 py-2 outline-none focus:border-realce"
          >
            <option value="">— escolha —</option>
            {contatosDaBase.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </label>
        <Botao>Acrescentar</Botao>
        <p className="w-full text-[12.5px] text-fosco">
          Para quem apareceu sem ter se inscrito. Quem ainda não está na base entra por{" "}
          <Link href="/contatos/novo" className="text-realce hover:underline">Novo contato</Link>.
        </p>
      </form>
    </Cartao>
  );
}
