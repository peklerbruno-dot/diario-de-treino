"use client";

const LADO = 1400;

/**
 * Reduz o print no próprio celular antes de subir. Um print de iPhone tem uns
 * 3 MB; reduzido a 1400 px de lado e JPEG, fica com uns 200 KB e continua
 * legível para o Gemini. Sem isso, três prints já passariam do limite de
 * 4,5 MB que a Vercel aceita por envio.
 */
export async function reduzir(arquivo: File): Promise<{ tipo: string; base64: string; previa: string }> {
  const bitmap = await createImageBitmap(arquivo).catch(async () => {
    // Safari antigo sem createImageBitmap para HEIC: cai no <img>.
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  });
  const largura = "width" in bitmap ? bitmap.width : 0;
  const altura = "height" in bitmap ? bitmap.height : 0;
  const escala = Math.min(1, LADO / Math.max(largura, altura));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(largura * escala);
  canvas.height = Math.round(altura * escala);
  canvas.getContext("2d")!.drawImage(bitmap as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
  return { tipo: "image/jpeg", base64: dataUrl.split(",")[1], previa: dataUrl };
}
