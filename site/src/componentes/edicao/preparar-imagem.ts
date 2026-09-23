/**
 * Reduz a foto no próprio navegador antes de enviar. A foto do celular tem
 * 4 a 8 MB; no site ela aparece com no máximo 1600 px, e assim chega com uns
 * 300 KB — o envio é rápido no 4G e o banco não enche.
 */
const LADO_MAXIMO = 1600;

export async function prepararImagem(arquivo: File): Promise<File> {
  if (arquivo.type === "image/gif") return arquivo; // manter a animação
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  } catch {
    return arquivo; // formato que o navegador não abre: o servidor decide
  }
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) return arquivo;
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  const gerar = (tipo: string) =>
    new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, 0.82));
  // Safari antigo não gera WebP e devolve PNG calado; aí vai JPEG.
  let blob = await gerar("image/webp");
  if (!blob || blob.type !== "image/webp") blob = await gerar("image/jpeg");
  if (!blob) return arquivo;
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const base = arquivo.name.replace(/\.[^.]+$/, "") || "foto";
  return new File([blob], `${base}.${ext}`, { type: blob.type });
}
