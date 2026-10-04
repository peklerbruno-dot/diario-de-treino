/**
 * Foto de celular tem 3 a 5 MB, e a Vercel aceita 4,5 MB por envio. Reduzida
 * no próprio aparelho, em JPEG, fica com uns 100 a 400 KB e continua legível
 * para o Gemini.
 */
export async function reduzirImagem(arquivo: File, lado = 1800, qualidade = 0.85): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
    const tela = document.createElement("canvas");
    tela.width = Math.round(bitmap.width * escala);
    tela.height = Math.round(bitmap.height * escala);
    tela.getContext("2d")!.drawImage(bitmap, 0, 0, tela.width, tela.height);
    return await new Promise<Blob>((ok, falha) => tela.toBlob((b) => (b ? ok(b) : falha()), "image/jpeg", qualidade));
  } catch {
    return arquivo; // Sem como reduzir (formato estranho): vai como está.
  }
}
