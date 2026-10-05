/**
 * Entrega um arquivo gerado no aparelho: pelo compartilhar do iPhone (que
 * oferece "Salvar em Arquivos", WhatsApp, e-mail), ou baixando, onde não houver
 * compartilhar de arquivos.
 */
export async function entregarArquivo(arquivo: File) {
  const dados = { files: [arquivo], title: arquivo.name };
  if (navigator.canShare?.(dados)) {
    await navigator.share(dados);
    return;
  }
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement("a");
  a.href = url;
  a.download = arquivo.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Fechar o compartilhar sem escolher nada não é erro. */
export const foiCancelado = (e: unknown) => e instanceof DOMException && e.name === "AbortError";
