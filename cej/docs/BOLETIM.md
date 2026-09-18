# Como ligar o envio de boletins

Guia para quem não programa. Uma tarde, uma vez na vida, e depois nunca mais.

O sistema inteiro — a base de contatos, a segmentação, as inscrições, a presença,
os certificados — **funciona sem isto**. O que esta página liga é uma coisa só: o
disparo automático.

Dentro do sistema, a tela **Boletins → Como está o envio** mostra em que pé cada
passo daqui está, e tem um botão para conferir quando terminar.

---

## Enquanto o domínio não sai: mandar pela mão

Isto não é um plano B improvisado; é um caminho que o sistema prepara. O boletim
não precisa esperar por uma decisão de orçamento.

1. Em **Boletins**, escreva o boletim como sempre: assunto, texto, e as
   atividades a anunciar. O sistema monta a lista delas com data, hora e local
   vindos do cadastro — ninguém redigita nada, e não há como anunciar um horário
   que mudou.
2. Escolha o segmento (vínculo, etiqueta) e clique em
   **Preparar para mandar pela mão**.
3. A tela entrega três coisas prontas: a lista de e-mails de quem pode receber, o
   assunto, e a mensagem em duas versões — uma com formatação, para abrir numa
   aba e copiar com Ctrl+A, e uma de texto simples, que funciona em qualquer
   lugar.
4. No Gmail: cole os e-mails em **Cco**, cole o assunto e a mensagem, e mande.
5. Volte e clique em **Marcar como enviado**.

Três coisas que valem saber sobre este caminho:

**O Cco não é detalhe.** Uma lista de duzentos endereços no campo "Para" entrega
a base inteira do Centro para cada uma dessas duzentas pessoas. É um vazamento de
dado pessoal cometido com um clique, e não há como desfazer. A tela avisa, mas
quem cola é você.

**O pedido de saída muda de forma.** No disparo automático, cada pessoa recebe um
link só dela, de um clique. Numa mensagem de Cco isso não existe: é uma mensagem
só para todo mundo, e um link ali descadastraria a pessoa errada. Por isso a
versão da mão pede que a pessoa **responda com a palavra SAIR**. Quando alguém
responder, abra a ficha em Contatos e clique em **Descadastrado** — daí em diante
o sistema a mantém fora de tudo, inclusive se a planilha antiga for importada de
novo.

**Há um teto.** O Gmail de uma conta comum recusa por volta de 500 destinatários
por dia, e uma mensagem com centenas em Cco costuma cair no spam de quem recebe.
Até umas cem pessoas, funciona bem. Acima disso, divida em levas — ou trate como
o sinal de que chegou a hora de ligar o disparo.

O que fica guardado no sistema é só o que ele sabe de verdade: que alguém marcou
como enviado, quando, e quantas pessoas havia no segmento naquele dia. Ele não
inventa uma confirmação de entrega por pessoa, porque quem entregou foi outro
programa.

---

## Por que não dá para simplesmente mandar de @usp.br

Esta é a parte que não tem atalho, e é melhor entender antes de começar.

O Gmail e o Outlook só entregam na caixa de entrada um e-mail em massa quando o
**dono do domínio** autorizou, por escrito, quem pode enviar em nome dele. Essa
autorização são três registros de DNS. Para mandar como `@usp.br`, quem cadastra
esses registros é a TI da USP — não há como contornar, e tentar mandar sem eles
faz o boletim cair no spam ou ser recusado na porta.

Por isso o caminho aqui é o domínio próprio do Centro. Ele não depende de
ninguém, resolve-se numa tarde, e **não fecha a porta** para o caminho da USP
depois: se um dia a TI autorizar, passar a mandar como `@usp.br` é trocar duas
variáveis e publicar de novo. Nada mais muda — nem a base, nem os links de
descadastro que já foram para a caixa das pessoas, nem o calendário de ninguém.

---

## Passo 1 — Registrar o domínio do Centro

Escolha um nome curto e sóbrio. `cej-usp.org`, `estudosjudaicos.org`,
`cejusp.org` — algo que caiba num cartaz e que ninguém confunda com um endereço
oficial da universidade (evite qualquer coisa com "usp.br" dentro).

Onde registrar, dois caminhos igualmente bons:

- **Registro.br** (https://registro.br) — o registrador brasileiro oficial. Um
  `.org.br` custa por volta de R$ 40 por ano. Paga-se por boleto ou Pix, e é
  preciso um CPF ou CNPJ.
- **Cloudflare Registrar** (https://cloudflare.com) — para `.org` ou `.com`,
  por volta de US$ 10 ao ano, sem margem embutida. O painel de DNS é o mais
  simples de usar dos três passos seguintes.

Anote onde registrou: é lá que você vai voltar no passo 3.

> **Guarde a renovação no calendário.** Um domínio que vence derruba o envio de
> boletins sem aviso. Vale marcar uma atividade recorrente no próprio sistema, ou
> deixar a renovação automática ligada no registrador.

## Passo 2 — Criar a conta no Resend

1. Entre em https://resend.com e crie uma conta. O plano gratuito manda **3.000
   e-mails por mês e 100 por dia** — bem acima do que um centro de estudos usa.
   Uma base de 500 pessoas com boletim quinzenal gasta 1.000 por mês.
2. No menu da esquerda, **Domains** → **Add Domain**. Escreva o domínio do passo
   1 (`cej-usp.org`, sem `www` e sem `@`).
3. A tela passa a mostrar **três linhas de registro de DNS**. Deixe essa aba
   aberta: é o que você vai copiar no passo 3.

## Passo 3 — Cadastrar os três registros no domínio

Volte ao painel onde registrou o domínio, procure **DNS** (ou "Zona DNS", ou
"Gerenciar DNS") e cadastre as três linhas que o Resend mostrou. Cada uma tem um
**tipo** (TXT ou MX), um **nome** e um **valor** — copie exatamente, sem
espaços a mais no fim.

O que elas fazem, para você saber o que está cadastrando:

| Tipo | Para quê |
|---|---|
| TXT (SPF) | diz quais servidores podem enviar em nome do domínio |
| TXT (DKIM) | assina cada mensagem, provando que ela não foi forjada no caminho |
| MX ou TXT (DMARC) | diz o que fazer com quem tentar se passar pelo domínio |

Cadastradas as três, volte ao Resend e clique em **Verify**. A verificação
costuma levar minutos; às vezes horas. Quando o domínio ficar **Verified**,
siga.

## Passo 4 — Criar a chave e cadastrar na Vercel

No Resend: **API Keys** → **Create API Key**, nome `cej`, permissão de envio.
**Copie a chave agora** — ela aparece uma vez só.

Na Vercel, no projeto do sistema: **Settings** → **Environment Variables**, e
cadastre as três:

| Nome | Valor |
|---|---|
| `RESEND_API_KEY` | a chave que você acabou de copiar |
| `EMAIL_REMETENTE` | `Centro de Estudos Judaicos <boletim@cej-usp.org>` |
| `EMAIL_RESPONDER_PARA` | o e-mail `@usp.br` do Centro |

O endereço dentro de `EMAIL_REMETENTE` **precisa ser do domínio verificado no
passo 3**. Se não for, o Resend recusa — e o sistema mostra a recusa dele na
tela, escrita por extenso.

`EMAIL_RESPONDER_PARA` é o detalhe que faz o domínio novo passar despercebido:
quem responder ao boletim responde para a caixa de sempre, não para um endereço
que ninguém lê.

Publique de novo: **Deployments** → o mais recente → **Redeploy**.

## Passo 5 — Conferir, em dois minutos

No sistema, abra **Boletins → Como está o envio**. Os cinco passos aparecem
marcados. Mande o teste para você — e mande um segundo para um Gmail ou Outlook
**pessoal**, fora da USP: é assim que se descobre se a mensagem chega onde a
maior parte da base está.

Confira três coisas na mensagem que chegar:

1. caiu na **caixa de entrada**, e não no spam;
2. o remetente aparece com o nome do Centro;
3. responder leva ao e-mail `@usp.br` certo.

Se não chegou, a tela mostra o motivo que o serviço deu. Os dois mais comuns são
*domain is not verified* (o passo 3 não terminou) e *Invalid API key* (a chave
foi copiada pela metade).

---

## Se um dia a USP autorizar

Peça à TI da unidade o cadastro dos mesmos três registros, agora em `usp.br`.
Verificado o domínio no Resend, troque uma variável na Vercel —
`EMAIL_REMETENTE` para `Centro de Estudos Judaicos <boletim@usp.br>` — e publique
de novo.

É só isso. Os links de descadastro que já foram para a caixa das pessoas
continuam valendo (eles apontam para o endereço do sistema, não para o do
e-mail), a base não é tocada, e o calendário que cada um assinou no Google Agenda
segue igual.

Vale manter o domínio próprio renovado mesmo depois: dois caminhos abertos é
melhor que um, e o custo é o de um café por mês.

---

## Como o envio funciona, para você saber o que esperar

**Em lotes de 100.** Um servidor tem poucos segundos para responder a cada
pedido, e mil e-mails não cabem nisso. O sistema manda cem, marca quem já
recebeu, manda os cem seguintes. A tela mostra o andamento.

**Dá para fechar a página.** O que já saiu está marcado no banco. Ao reabrir o
boletim, o envio continua de onde parou — ninguém recebe duas vezes, ninguém
fica sem receber.

**Se o serviço recusar no meio**, o envio para, a tela mostra o motivo dele por
escrito, e as mensagens que não saíram ficam registradas uma a uma. Resolvido o
problema, o botão **Tentar de novo os que falharam** retoma só essas.

**A lista é congelada quando você clica em enviar.** Quem se cadastrar no meio
do disparo não entra nele; quem se descadastrar no meio, não recebe.

**Um boletim enviado não muda mais.** Ele já está na caixa das pessoas, e
editá-lo aqui só criaria uma segunda versão da verdade.

## A parte legal, em três frases

1. **Só recebe boletim quem tem consentimento registrado.** O sistema não
   permite outra coisa: contato sem essa marca fica fora de todos os envios,
   mesmo estando na base e ativo.
2. **Todo e-mail sai com link de descadastro**, e com o cabeçalho que faz o
   Gmail mostrar o botão "cancelar inscrição" no topo da mensagem. Quem usa esse
   botão não marca como spam — e é a marcação de spam que estraga a entrega de
   tudo o que vocês mandarem depois, para todo mundo.
3. **Quem sai, fica fora para sempre.** Importar a planilha antiga não traz
   ninguém de volta. Só a própria pessoa se recadastra.

Uma lista comprada, raspada de um site ou copiada de outro lugar não vira
consentimento por ser importada aqui. Disparar para uma lista assim é o jeito
mais rápido de a conta de envio do Centro ser suspensa — e aí nem os boletins
legítimos saem.

## Quanto custa, ao ano

| | |
|---|---|
| Domínio `.org.br` no Registro.br | ~R$ 40 |
| Resend, plano gratuito | R$ 0 |
| Vercel e banco, planos gratuitos | R$ 0 |

Um domínio `.org` na Cloudflare sai por volta de US$ 10. Em nenhum dos casos há
cobrança surpresa: os planos gratuitos avisam quando o limite chega, em vez de
faturar.
