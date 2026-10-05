/**
 * O que aparece enquanto o servidor monta a tela: a forma dela, em cinza.
 * Sem isto, a primeira abertura do dia (servidor e banco acordando) era um
 * branco de um ou dois segundos, que parece travado.
 */
export default function Carregando() {
  const bloco = "animate-pulse rounded-cartao bg-cartao shadow-cartao";
  return (
    <div aria-busy="true" aria-label="Carregando">
      <div className="mb-4 mt-2 space-y-2">
        <div className="h-4 w-36 animate-pulse rounded-full bg-regua/60" />
        <div className="h-8 w-28 animate-pulse rounded-full bg-regua/60" />
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="h-11 animate-pulse rounded-folha bg-regua/60" />
        <div className="h-11 animate-pulse rounded-folha bg-cartao shadow-cartao" />
      </div>
      <div className="space-y-3">
        <div className={`${bloco} h-28`} />
        <div className={`${bloco} h-36`} />
        <div className={`${bloco} h-36`} />
      </div>
    </div>
  );
}
