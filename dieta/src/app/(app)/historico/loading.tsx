/** Enquanto uma aba do Progresso carrega: o título e as abas ficam, o resto em cinza. */
export default function Carregando() {
  const bloco = "animate-pulse rounded-cartao bg-cartao shadow-cartao";
  return (
    <div aria-busy="true" aria-label="Carregando" className="space-y-3">
      <div className={`${bloco} h-64`} />
      <div className={`${bloco} h-40`} />
    </div>
  );
}
