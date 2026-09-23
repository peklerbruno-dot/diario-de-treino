import { formatarTexto } from "@/lib/texto";

/** Mostra um texto longo da equipe: parágrafos, quebras, links e negrito. */
export function Texto({ valor, className }: { valor: string; className?: string }) {
  const pars = formatarTexto(valor);
  if (!pars.length) return null;
  return (
    <div className={className}>
      {pars.map((linhas, i) => (
        <p key={i}>
          {linhas.map((trechos, j) => (
            <span key={j}>
              {j > 0 ? <br /> : null}
              {trechos.map((t, k) =>
                t.tipo === "negrito" ? (
                  <strong key={k}>{t.valor}</strong>
                ) : t.tipo === "link" ? (
                  <a key={k} href={t.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    {t.valor}
                  </a>
                ) : (
                  <span key={k}>{t.valor}</span>
                ),
              )}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

export const urlArquivo = (id: string) => `/arquivos/${id}`;
