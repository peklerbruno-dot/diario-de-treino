# Apartamento 3D

Simulador 3D editável do apartamento, para testar disposições de móveis.
**Abra `simulador.html` com duplo clique.** Funciona sem internet e sem servidor: o three.js
está embutido no próprio arquivo.

## Como usar

| Ação | Como |
| --- | --- |
| Girar a câmera | arrastar no espaço vazio (dedo único no celular) |
| Deslocar a vista | botão direito, ou dois dedos |
| Vista de cima ↔ 3D | botão **Vista de cima** ou tecla `T` |
| Ver o interior | **Cortar paredes** (baixa as paredes para 1,10 m) |
| Mover móvel | clicar e arrastar no piso (encaixe de 5 cm); setas = 5 cm, Shift+setas = 25 cm |
| Girar 90° | `R` (Shift+R ao contrário) ou botões no painel |
| Medidas e cores | painel à direita, com o móvel selecionado |
| Adicionar / remover | catálogo na lateral / `Delete` |
| Desfazer / refazer | `Ctrl+Z` / `Ctrl+Shift+Z` |
| Mover parede | clique na parede para selecioná-la, depois arraste (encaixe de 5 cm) |
| Medidas de um ambiente | clique no piso do ambiente |
| Portas e janelas | no painel da parede: posição a partir do canto, largura, altura, peitoril |
| Demolir | marque "Pode ser derrubada" na parede; depois é um clique na seção Demolição |
| Cenários | abas no topo; `+` duplica o cenário atual; clique duplo renomeia |
| Salvar | automático no navegador; **Arquivo** exporta/importa `.json` |
| Luz do sol | seção **Luz do sol**: data, hora (4h–20h) e ▶ **Passar o dia**; a bússola no canto mostra o norte |
| Imagem | botão **PNG** (com as áreas, a data e a hora do sol) |
| Modelo 3D pronto | **Arquivo → Importar modelo .glb**, informando a escala em cm |

Aviso de colisão: o móvel fica marcado em vermelho e o conflito aparece no canto da tela.
Cadeiras podem entrar embaixo de mesas sem aviso; tapetes e box não geram aviso.

## Áreas

- **Área útil** de cada ambiente = por dentro das paredes (é o que aparece no rótulo).
- **Construída** = contorno externo, com as paredes, comparada aos 32 m² da construtora.

Com o interior de 420 × 700 cm e paredes externas de 12 cm, a construída dá **32,15 m²**
(+0,5% sobre os 32 m²). A área útil somada dá 28,59 m² (estar/jantar 15,66, cozinha 3,09,
quarto 7,20 e banheiro 2,64): os ~3,5 m² de diferença são as paredes e o shaft da cozinha.
Por isso não foi preciso mudar a escala. Se as paredes forem mais grossas, basta mudar a
espessura no painel da parede: tudo recalcula.

## Sol

A posição do sol é calculada para a Barra Funda, em São Paulo (23,5° S, 46,7° O, horário de
Brasília), pela data e pela hora escolhidas, com precisão de cerca de 1°. Como o apartamento
pega o sol da manhã, as janelas da parede esquerda estão voltadas para o **leste**. Se a
orientação real for outra (nordeste, por exemplo), mude em "Janelas voltadas p/"; o local e a
orientação ficam em `local` e `orientacao`, no início de `src/planta.js`.

## Planta

Medida nos prints dos dois cenários (1,43 px/cm): estar/jantar e cozinha na metade de cima;
quarto (300 × 240) e banheiro (110 × 240) embaixo, separados da sala por uma parede com os vãos
de 78 e 70. A porta de correr de 2 folhas e o painel fixo são móveis (catálogo "Divisórias"),
porque mudam de lugar entre os cenários. Quando a planta original muda, `revisao` em
`src/planta.js` sobe e um layout salvo com a planta antiga fica guardado como cópia no navegador.

## Organização

```
apartamento/
  simulador.html      ← o arquivo final (gerado; é este que se abre)
  src/planta.js       ← DADOS: paredes, portas, janelas, ambientes e os dois cenários
  src/catalogo.js     ← DADOS: catálogo de móveis feitos de formas parametrizadas
  src/app.js          ← aplicação, em seções numeradas (1. Configuração … 12. Início)
  src/pagina.html     ← estilo e interface
  vendor/             ← three.js r170 empacotado (e o arquivo de entrada usado para gerá-lo)
  montar.mjs          ← junta tudo em simulador.html
```

Depois de editar algo em `src/`, rode `node apartamento/montar.mjs` para regenerar o
`simulador.html`.

### Móveis a partir de formas

Cada item do catálogo é uma lista de caixas, cilindros e esferas cujas medidas podem ser
expressões com `L`, `P` e `A` (largura, profundidade e altura do móvel). Por exemplo, um
puxador com `x: 'L/2-6'` fica sempre a 6 cm da borda, qualquer que seja a largura. É isso
que deixa redimensionar sem deformar pés e puxadores. A explicação completa está no topo de
`src/catalogo.js`.

### Preparado para depois

Cotas na tela, texturas, modo caminhada e pontos elétricos têm lugar marcado na seção
"11. Extensões futuras" de `src/app.js`. A planta já tem o campo `pontosEletricos`, que
acompanha as paredes quando elas são movidas.

## Limites conhecidos

- Paredes só na horizontal ou na vertical (não há paredes inclinadas).
- Modelos `.glb` com compressão Draco ou KTX2 não abrem; exporte sem compressão.
- O `.glb` importado fica guardado no navegador (IndexedDB); para levar a outro computador,
  use **Exportar layout**, que inclui o modelo no `.json`.
