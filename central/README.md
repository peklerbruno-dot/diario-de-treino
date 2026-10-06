# Central

As três caixas de e-mail (pessoal, CIP e USP) num lugar só, com uma triagem que
responde à pergunta de toda manhã: **o que precisa de mim?**

Quem quer só colocar no ar: [`docs/COLOCAR-NO-AR.md`](docs/COLOCAR-NO-AR.md).

## O que ela faz

**Triagem.** A cada atualização a Central lê o que chegou nas três contas e o
Claude classifica cada conversa:

| | |
|---|---|
| 🔴 Responder | alguém espera uma resposta sua |
| 🟠 Ação | pede algo além de responder: assinar, enviar, liberar, pagar |
| 📅 Agenda | convites e horários a combinar |
| 💰 Financeiro | boletos, faturas, reembolsos |
| 🟡 Aguardando | a última palavra foi sua; a vez é do outro |
| ⚪ Informativo | só para saber |
| 📰 Ler depois | newsletters e boletins |
| 🔇 Ruído | promoções e notificações |

Cada conversa ganha um resumo de uma linha (o que importa *agora*, não o
histórico), a próxima ação em imperativo e, se houver, o prazo.

**Painel.** Os números do dia, o que precisa de você (urgente primeiro), os
prazos das próximas duas semanas, a agenda de hoje e amanhã das três contas
juntas, e quem está te devendo resposta há mais de três dias.

**Rascunhos.** Na conversa, você conta em poucas palavras o que quer dizer, ou
o que já combinou fora do e-mail (numa conversa, ligação ou WhatsApp: dá para
colar o trecho), e a Central escreve a resposta:

- no idioma e no tom da conversa;
- no **seu estilo**, aprendido dos seus e-mails enviados (Ajustes → Aprender meu
  estilo, por conta: o do CIP não é o da USP);
- olhando a sua agenda, se a pergunta for de horário;
- sem inventar: o que só você sabe vira um [espaço entre colchetes] para
  completar.

Você edita ali mesmo e grava **no Gmail, como rascunho**, dentro da conversa e
para as pessoas certas (responder a todos, sem você). Quem envia é você, de lá.
A Central não tem botão de enviar, e não há envio em lugar nenhum do código.

**Aprende com você.** Duas formas, e as duas valem para as próximas triagens:

- **corrigir a categoria** de uma conversa (a correção fica, e vira exemplo do
  seu critério);
- **regras escritas** em Ajustes: "Tudo da Nancy é prioridade alta", "Boletim do
  CEJ com [Teste] no assunto é ruído".

**Drive e Agenda.** Anexos vão para o Drive com um toque (pasta
`Central/<categoria>`, na conta da conversa). Um prazo detectado num e-mail vira
compromisso de dia inteiro na Agenda, com o link da conversa.

## O que ela guarda, e o que não

O banco guarda as contas conectadas, o resumo e a categoria de cada conversa,
os rascunhos que você salvou e as suas regras. **O texto dos e-mails não fica
aqui**: mora no Gmail e é lido de lá na hora em que a tela abre.

O acesso às contas (o "refresh token" do Google) fica cifrado com o
`AUTH_SECRET`. Quem lesse o banco sozinho não leria e-mail nenhum. No Drive, a
Central só enxerga os arquivos que ela mesma criou.

O conteúdo dos e-mails vai para a API do Claude para ser triado e respondido.
Pela política da Anthropic, o que passa pela API não é usado para treinar
modelos.

## Como funciona por dentro

- `src/lib/sincronizar.ts`: a rodada. Primeiro só os cabeçalhos das conversas
  das últimas duas semanas (caixa de entrada) e três semanas (enviados, para o
  "aguardando"). Só o que tem mensagem nova vai para a triagem, em lotes de 8.
  Uma conversa parada não é classificada de novo.
- `src/lib/ia.ts`: as três chamadas ao Claude (triagem com saída estruturada,
  rascunho e estilo). Os e-mails entram como dado, entre marcações, e as
  instruções dizem que nada ali dentro manda em nada.
- `src/lib/google.ts`: OAuth e as chamadas REST ao Gmail, Agenda e Drive, sem a
  biblioteca oficial (ela pesa dezenas de MB para meia dúzia de endereços).
- `src/lib/gmail.ts`: ler o formato do Gmail (corpo, citação, anexos) e montar
  o MIME do rascunho. Puro e testado.

```
npm install
npm test         # as verificações de gmail, conversas, datas e cofre
npm run typecheck
```

Para rodar na máquina: um Postgres, as variáveis do `.env.example` e
`npx prisma migrate deploy && npm run dev`.

## Próximos passos possíveis

- **WhatsApp**: hoje o caminho é colar o trecho no campo de contexto. O próximo
  passo é importar a conversa exportada (o .txt de "Exportar conversa") como
  contexto permanente de um contato. Ler o WhatsApp diretamente não entra:
  as bibliotecas que fazem isso violam os termos e podem banir o número.
- Resumo da manhã por e-mail ou notificação.
- Contatos com memória: quem é, de onde, o que está em aberto com cada um.
- Busca em linguagem natural em tudo ("o que a Nancy disse sobre a banca?").
