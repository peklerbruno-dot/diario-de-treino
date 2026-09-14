/**
 * Campo de número para o teclado do iPhone.
 *
 * Não usa `type="number"`: no teclado em português a tecla decimal é a vírgula, e
 * um campo `number` simplesmente descarta o que for digitado com vírgula — "52,5"
 * viraria vazio. Aqui a vírgula é aceita como a pessoa escreve e vira ponto só na
 * hora de gravar (`nnum`), e o `inputMode` garante o teclado numérico mesmo assim.
 */
export default function CampoNumero({ valor, aoMudar, decimal = false, ...resto }) {
  const limpar = (t) => {
    const s = t.replace(decimal ? /[^\d.,]/g : /\D/g, "");
    if (!decimal) return s;
    const i = s.search(/[.,]/);
    return i === -1 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/[.,]/g, "");
  };
  return (
    <input
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      autoComplete="off"
      value={valor ?? ""}
      onChange={(e) => aoMudar(limpar(e.target.value))}
      {...resto}
    />
  );
}
