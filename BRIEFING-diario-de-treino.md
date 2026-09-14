# Diário de treino — briefing de construção

App pessoal de uso próprio, para iPhone (iPhone 15, Safari), de um único usuário. Registra treinos de **musculação, pilates e natação**, mostra evolução e exporta relatórios. Não há login, não há servidor: os dados ficam no aparelho.

O arquivo `diario-de-treino-v5.jsx` é o protótipo aprovado. Ele define telas, fluxos, textos e visual. A versão final deve reproduzi-lo fielmente, corrigindo apenas o que abaixo está marcado como "no app final".

## 1. Forma de entrega

- **PWA** (React + Vite), instalável pela opção "Adicionar à Tela de Início" do Safari.
- Deve funcionar **offline** por completo (service worker com cache dos assets).
- `manifest.json` com nome "Diário de treino", ícone próprio, `display: standalone`, `theme_color` na cor do papel (`#F6F3EC`).
- Meta tags iOS: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon` em 180×180. Respeitar `env(safe-area-inset-*)`.
- Hospedagem estática gratuita com HTTPS (Vercel, Netlify ou GitHub Pages). Deploy automático a cada push.

## 2. Persistência

- Todos os dados em **IndexedDB** (usar Dexie). Nada de localStorage para dados.
- Coleções: `exercicios`, `treinos` (modelos), `sessoes` (registros), `ajustes`.
- Backup: botão "Exportar backup" (JSON completo) e "Restaurar backup" na tela Exportar. Isso protege contra o Safari apagar dados de sites não usados por tempo.

## 3. Modelo de dados

```
Exercicio  { id, mod: "musc"|"pilates"|"natacao", nome, cat, imagem?, video?, notas?, criadoEm }
Treino     { id, mod, nome, itens: [{ exId, series?, reps? }], criadoEm }
Sessao     { id, data: "YYYY-MM-DD", mod, nome, treinoId?, itens, duracaoMin?, obs?, criadoEm }
  itens musc:    [{ exId, series: [{ carga, reps }] }]
  itens natacao: [{ exId, metros, tempoMin }]
  pilates: sem itens; usa duracaoMin e obs
```

`cat` para musculação é um destes grupos: Peito, Costas, Ombros, Bíceps, Tríceps, Quadríceps, Posterior, Glúteos, Panturrilha, Abdômen. Para pilates: Aparelho, Solo. Para natação: Estilo, Educativo.

## 4. Telas (ver protótipo para textos e comportamento exatos)

**Início — painel**
- Título "Diário de treino", data por extenso.
- Número de treinos no mês (grande), mês anterior ao lado, contagem por modalidade.
- Semana em 7 blocos com faixa colorida no topo nos dias com treino; dia atual em destaque.
- Grade 2×2: semanas seguidas treinando, kg levantados no mês (com % sobre o mês anterior), metros nadados, minutos de pilates. Aparece sempre, com zeros quando vazio.
- "Recordes recentes": exercícios cuja carga máxima do último registro superou a do anterior (até 3, mais recentes primeiro).
- "Registrar treino" com duas opções: **Meus treinos** (padrão; lista dos modelos, toque inicia o registro) e **Escrever o que fiz** (texto livre → dados estruturados → tela de conferência → salvar).

**Registro de sessão**
- Musculação: por exercício, séries com kg e reps; cargas pré-preenchidas com o último registro do mesmo exercício e a linha "Último treino (dd/mm): X kg × Y"; adicionar/remover série; remover exercício; toque no nome abre a ficha.
- Natação: metros e minutos por estilo. Pilates: duração e observações.
- Data editável. Salvar / Descartar. Quando veio do texto livre, mostrar aviso "Foi isso que entendi do seu texto…".

**Treinos** — lista dos modelos, montar novo (modalidade, nome, busca de exercícios, séries×reps padrão 3×10), excluir com confirmação em dois toques. **No app final:** também editar um modelo existente e reordenar exercícios.

**Biblioteca** — por modalidade, agrupada por categoria, busca sem acento, ~70 exercícios de musculação já carregados (lista no protótipo), adicionar exercício. Toque abre a **ficha do exercício**: foto, vídeo, últimas cargas, e **notas próprias** editáveis (ajuste de banco, pegada, o que o professor pediu). **No app final:** excluir/editar exercício; excluir só permitido se não houver registros com ele (senão, arquivar).

**Histórico** — gráfico de treinos por semana (barras por modalidade, 6 semanas) e evolução de carga por exercício (linha da carga máxima por sessão); lista de todas as sessões, mais recente primeiro, com resumo (kg totais, metros ou minutos) e exclusão. **No app final:** tocar numa sessão abre para ver e editar.

**Exportar** — prévia do relatório mensal e:
- **PDF do mês** (gerar no aparelho, sem servidor): cabeçalho com mês e totais por modalidade; uma linha por sessão com data, nome e detalhe (séries×reps por exercício, metros/minutos, observações); depois, uma seção por exercício de musculação com a evolução de carga. Compartilhar pelo share sheet do iOS.
- **Planilha (CSV/XLSX)** com todas as sessões, uma linha por série.
- **Backup / restaurar** (JSON).

## 5. Texto livre → dados

- Chamada à API da Anthropic (modelo Sonnet mais recente) com o prompt do protótipo: recebe a biblioteca (id|mod|nome|cat), a data de hoje e o texto; devolve JSON. Exercícios não encontrados voltam com `exId: null` + nome + cat e são criados ao salvar.
- **No app final:** a chave de API fica em "Ajustes", guardada só no aparelho. Sem chave, o botão explica como obter uma. Manter o interpretador local simples como fallback quando não houver rede/chave.
- Entradas que devem funcionar: "supino reto 3 de 10 com 50 kg", "puxada 3x12 45", "4 séries de 8 a 60 quilos", "nadei 1000 m de crawl em 25 min", "pilates de aparelho, 50 min", "ontem fiz…".

## 6. Fotos e vídeos dos exercícios

- **Verificar e escolher** um banco aberto de exercícios com imagens de execução (candidato a checar: `free-exercise-db` no GitHub, licença pública). Mapear os ~70 exercícios da biblioteca para as imagens correspondentes e empacotar as imagens no app (para funcionar offline).
- Vídeo: campo `video` no exercício com um link (YouTube ou arquivo). A ficha mostra um botão "Ver vídeo" que abre o link; se for YouTube, embutir o player. O usuário pode colar o link que preferir por exercício.
- Enquanto não houver foto para um exercício, usar o pictograma do protótipo (silhueta com o músculo em destaque).

## 7. Visual (não inventar outro)

- Fundo papel `#F6F3EC`, tinta `#2B2A26`, cinza `#7A7468`, régua `#D8D2C4`, régua fina `#EAE5D9`, branco quente `#FFFDF8`.
- Modalidades: musculação `#9A5A22`, pilates `#4C7F5C`, natação `#33619C`.
- Tipografia: serifa do sistema — `"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif`. Peso regular em tudo; títulos não são bold; rótulos secundários em itálico.
- Sem cartões com sombra; hierarquia por réguas finas. Botão primário preenchido com a tinta; secundário só contorno.
- Navegação inferior com cinco itens e ícones de linha: Início, Treinos, Biblioteca, Histórico, Exportar.

## 8. Ordem de construção

1. Projeto Vite + React + PWA (manifest, service worker, ícones). Deploy com "olá" instalável no iPhone antes de qualquer tela.
2. Dexie e modelo de dados; carga inicial da biblioteca.
3. Portar o protótipo tela a tela, ligando ao banco: Início → Registro → Treinos → Biblioteca → Histórico → Exportar.
4. Texto livre com chave em Ajustes; fallback local.
5. PDF, CSV, backup/restauração.
6. Fotos (banco aberto) e vídeos na ficha.
7. Revisão em iPhone real: teclado numérico nos campos, safe areas, offline, "Adicionar à Tela de Início".

Trabalhar em commits pequenos, um por etapa, e testar no Safari do iPhone a cada etapa via URL de preview.
