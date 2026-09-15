"""
Desenha os ícones do app.

O desenho é a própria linha do saldo: sobe, cai abaixo do zero (o trecho
vermelho) e volta. As cores são as mesmas da paleta do app.

Os arquivos ficam versionados em public/. Só é preciso rodar de novo se o
desenho mudar:

    pip install pillow && python3 scripts/gerar-icones.py
"""

from PIL import Image, ImageDraw

FUNDO = (18, 18, 17)
LINHA = (57, 135, 229)
VERMELHO = (230, 103, 103)
ZERO = (90, 90, 86)

# O caminho do saldo em coordenadas de 0 a 1 (y para cima).
CAMINHO = [
    (0.06, 0.62), (0.18, 0.78), (0.30, 0.46), (0.42, 0.55),
    (0.54, 0.22), (0.66, 0.40), (0.78, 0.74), (0.94, 0.88),
]
ALTURA_DO_ZERO = 0.36


def desenhar(lado: int) -> Image.Image:
    # Desenha grande e reduz: as diagonais saem lisas sem precisar de antialias.
    escala = 4
    tela = lado * escala
    imagem = Image.new("RGB", (tela, tela), FUNDO)
    pincel = ImageDraw.Draw(imagem)

    def ponto(x, y):
        return (x * tela, (1 - y) * tela)

    y_zero = (1 - ALTURA_DO_ZERO) * tela
    pincel.line(
        [(0.06 * tela, y_zero), (0.94 * tela, y_zero)],
        fill=ZERO,
        width=max(2 * escala, 2),
    )

    grossura = int(0.075 * tela)
    pontos = [ponto(x, y) for x, y in CAMINHO]
    pincel.line(pontos, fill=LINHA, width=grossura, joint="curve")

    # Só o trecho abaixo do zero fica vermelho.
    abaixo = Image.new("RGB", (tela, tela), FUNDO)
    ImageDraw.Draw(abaixo).line(pontos, fill=VERMELHO, width=grossura, joint="curve")
    mascara = Image.new("L", (tela, tela), 0)
    ImageDraw.Draw(mascara).rectangle([0, y_zero, tela, tela], fill=255)
    imagem.paste(abaixo, (0, 0), mascara)

    return imagem.resize((lado, lado), Image.LANCZOS)


for lado, nome in ((180, "apple-touch-icon.png"), (192, "icone-192.png"), (512, "icone-512.png")):
    desenhar(lado).save(f"public/{nome}")
    print("public/" + nome)
