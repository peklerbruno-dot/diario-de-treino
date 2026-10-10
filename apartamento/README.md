# Apartamento 3D

Simulador 3D editável do apartamento, para testar disposições de móveis.
**Abra `simulador.html` com duplo clique.** Funciona sem internet e sem servidor: o three.js
está embutido no próprio arquivo.

## Três modos

A barra de baixo troca o modo de uso:

- **👀 Visitar** (padrão): só a casa, sem painéis. Atalhos dos cômodos (Sala, Jantar e office,
  Cozinha, Quarto, Banheiro) levam a câmera até lá na altura dos olhos; **Maquete** e **Planta**
  voltam para a visão geral; o chip **☀** abre a hora do sol. Nada se mexe sem querer.
- **✏️ Arrumar:** catálogo com miniaturas, arrastar, girar e editar móveis, paredes e cenários.
  O painel do móvel mostra primeiro as ações rápidas (Girar, Espelhar, Abrir, Duplicar, Remover),
  o formato e o material; cores, medidas, distâncias e área de uso ficam em gavetas.
- **📏 Conferir:** vista de cima com as áreas de uso pintadas (verde = ok, amarelo = apertado,
  vermelho = não cabe) e um relatório automático: espaço livre na frente de cada móvel,
  lugares em cada mesa (45 cm por pessoa no mínimo), se dá para entrar no banco e o giro das
  portas. Clicar num item do relatório seleciona o móvel; **Arrumar este móvel** leva ao modo
  de edição.

As ferramentas da tela (Andar, Planta, Cortar, Foto, Inteiro) ficam na coluna à direita.

## Opções de jantar

Três abas comparam o canto de refeição da planta final (o resto é igual):

| Aba | Mesa | Lugares | Relatório |
| --- | --- | --- | --- |
| Planta final | quadrada 88 × 88 | 4 a 44 cm cada (apertado) | banco sem entrada; cadeira oeste a 26 cm da do escritório |
| Jantar 1 | quadrada 80 × 80, afastada do banco | 3 confortáveis | banco sem entrada; cadeiras com 27 e 35 cm de passagem |
| Jantar 2 | 88 × 88 sem a cadeira oeste | 3 | banco entra pela frente num trecho de 30 cm (apertado) |
| **Jantar 3** | **redonda Ø 80, pé central, 2 cadeiras ao sul** | **3 com folga** | **sem problemas**: banco entra por um trecho de 45 cm |

A mesa redonda de pé central é a que melhor resolve: não tem quinas no caminho do banco e
libera a passagem entre o jantar e a cadeira do escritório.

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
| Formato e material | painel do móvel: **Formato** (ex.: sofá com chaise, reto ou retrátil) e **Material** (linho, veludo, bouclê, couro…) |
| Abrir e usar | botão azul **Abrir portas / Estender / Abrir baú…** no painel do móvel |
| Distâncias | cotas pretas no piso ao redor do móvel selecionado; clique e digite a distância |
| Cantos | lateral **Cantos**: home office, jantar, TV, dormir… com área e lista de móveis |
| Foto realista | botão **📷 Foto realista**: renderização por traçado de raios da vista atual (melhor caminhando); **Salvar foto** baixa o PNG |
| Pintura | painel da parede: **Pintura** muda a cor de cada parede |
| Caminhar | botão **🚶 Caminhar** (ou `C`): arraste para olhar, toque no piso para andar, W/A/S/D |
| Luz do sol | seção **Luz do sol**: data, hora (4h–20h) e ▶ **Passar o dia**; a bússola no canto mostra o norte |
| Imagem | botão **PNG** (com as áreas, a data e a hora do sol) |
| Modelo 3D pronto | **Arquivo → Importar modelo .glb**, informando a escala em cm |

Aviso de colisão: o móvel fica marcado em vermelho e o conflito aparece no canto da tela.
Cadeiras podem entrar embaixo de mesas sem aviso; tapetes e box não geram aviso.

## Planta final (BePê)

A aba **Planta final** é a planta do estudo preliminar, medida na imagem (2,55 px/cm) e decorada
com o moodboard das referências:

- **Paleta:** freijó (`#a8784f`), azul-acinzentado (`#5d6c84`), terracota (`#8f4325`),
  mostarda (`#b8892c`), vinho (`#5e1a2a`), creme e grafite.
- **Materiais:** granilite nos tampos, azulejo 10×10 com rejunte azul-marinho na cozinha e no
  banheiro, veludo no sofá, tweed no banco, xadrez vichy na cama, cabeceira canelada, linho e
  voil nas cortinas, palhinha nas cadeiras, papel de arroz no pendente.
- **Peças das referências:** estante divisória vazada com TV giratória (botão "Girar a TV"),
  sofá retrátil de veludo terracota, arandela articulada preta, pendente de papel de arroz,
  moldura ondulada com fotos, mesa carretel vinho, costela-de-adão, tapeçaria sobre a cama.

O que é interpretação da planta (fácil de trocar no painel do móvel):
o bloco entre a bancada de trabalho e a península virou **banco de jantar** (a mesa encosta nele);
a península tem 90 cm de altura; a cama ficou com 128 × 188 (na planta mede ~120 × 186).
O banheiro tem 2,64 m² contando o shaft; a área livre, sem o shaft, é 2,37 m².

## Realismo

- **Na tela:** materiais físicos (veludo com brilho, madeira com veio, metais que refletem),
  sol calculado por data e hora, sombras suaves e **oclusão ambiente** (as sombras de contato
  nos cantos e sob os móveis). No celular a oclusão começa desligada.
- **📷 Foto realista:** simula o caminho da luz (traçado de raios, com `three-gpu-pathtracer`):
  a luz rebate nas paredes, atravessa as cortinas, reflete no piso e nos metais. A imagem
  começa granulada e limpa sozinha: 1 a 3 minutos num computador ou celular recente.
  Mexer na câmera recomeça. Há controles de exposição e de hora do dia.
  Dentro do apartamento (🚶 Caminhar) a foto tem teto e a luz entra só pelas janelas; na órbita
  é uma maquete sem teto.

## Apartamento decorado

Cada móvel do catálogo é desenhado em detalhe (pés, almofadas, puxadores, livros, louça) com
materiais que reagem à luz: madeira com veio, linho, veludo com brilho, bouclê, couro, mármore,
granito, azulejo, vidro, metal. Ele continua editável: medidas, cores, **formato** e **material**.

- **Móveis que funcionam:** guarda-roupa (correr ou abrir), gavetas, cama baú, sofá retrátil,
  mesa extensível, armários da cozinha, geladeira, box, persianas e cortinas abrem e fecham.
  Abertos, contam nas colisões: dá para ver se a porta do armário bate na cama.
- **Áreas de uso:** cada móvel sabe o espaço de que precisa (afastar a cadeira, sentar no sofá,
  abrir o armário, os lados da cama). Em verde no piso; em vermelho se algo estiver no caminho.
  O giro das portas do apartamento também é conferido.
- **Distâncias:** com um móvel selecionado aparecem as cotas até a parede ou o móvel mais
  próximo em cada direção. Clique numa cota (ou use o painel) e digite a distância desejada.
- **Cantos:** marque as funções do apartamento (home office, TV, jantar, dormir…). Cada canto
  mostra a área, quanto está ocupado e a lista de móveis com medidas.
- **Caminhar:** visita na altura dos olhos, com teto; à noite as luminárias acendem.
- Na vista de cima, o que fica no alto (pendentes, prateleiras, armário aéreo) é ocultado.

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
  src/catalogo.js     ← DADOS: catálogo de móveis (formas, formatos, movimentos, áreas de uso)
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
