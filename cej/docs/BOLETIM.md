# Como ligar o envio de boletins

Guia para quem não programa. O sistema inteiro — a base de contatos, a
segmentação, as inscrições, o descadastro — **funciona sem isto**. O que esta
página liga é uma coisa só: o disparo de e-mail a partir do sistema.

Enquanto não estiver ligado, você continua podendo escrever e montar boletins
(ficam guardados como rascunho) e baixar a lista segmentada em planilha, na tela
Contatos, para mandar por onde vocês já mandam hoje.

---

## A pergunta que decide tudo: de qual endereço os e-mails saem?

Esta é a parte que não tem atalho, e é melhor entender antes de começar.

O Gmail e o Outlook só entregam na caixa de entrada um e-mail em massa quando o
**dono do domínio** autorizou, por escrito, quem pode enviar em nome dele. Essa
autorização são três registros de DNS. Para mandar como `@usp.br`, quem cadastra
esses registros é a TI da USP — não há como contornar, e tentar mandar sem eles
faz o boletim cair em spam ou ser recusado na porta.

São dois caminhos, e os dois funcionam:

### Caminho A — pedir à TI da USP

O certo, se vocês conseguirem. Peça à equipe de TI da unidade o cadastro dos
registros SPF e DKIM que o serviço de envio vai mostrar (é copiar e colar três
linhas). Costuma ser um chamado simples; a demora é de agenda, não de trabalho.

### Caminho B — um domínio do próprio Centro

Registre um domínio barato — `cej-usp.org`, `estudosjudaicos.org`, algo assim —
por volta de R$ 50 por ano, no Registro.br ou em qualquer registrador. Vocês
mesmos cadastram os registros, em uma tarde, sem depender de ninguém.

Os boletins saem de `boletim@cej-usp.org` e o **responder-para** aponta para o
e-mail `@usp.br` do Centro: quem responder, responde para a caixa de sempre.
Para quem recebe, a diferença é uma linha no cabeçalho que quase ninguém olha.

Se estiverem em dúvida, comece pelo B: ele não depende de terceiros e não
atrapalha o A depois.

---

## Passo 1 — Criar a conta no Resend

1. Entre em https://resend.com e crie uma conta (o plano gratuito manda 3.000
   e-mails por mês e 100 por dia — bem acima do que um centro de estudos usa).
2. Em **Domains** → **Add Domain**, escreva o domínio de onde os boletins vão
   sair (`cej-usp.org`, ou `usp.br` se estiverem no caminho A).
3. A tela mostra três registros de DNS. Cadastre-os onde o domínio está
   registrado — ou mande esta tela para a TI, se for o caminho A.
4. Espere a verificação (costuma levar minutos; pode levar horas). Quando o
   domínio ficar **Verified**, siga.
5. Em **API Keys** → **Create API Key**, dê o nome `cej` e permissão de envio.
   **Copie a chave agora** — ela aparece uma vez só.

## Passo 2 — Cadastrar três variáveis na Vercel

No projeto do sistema, em **Settings** → **Environment Variables**:

| Nome | Valor | Para quê |
|---|---|---|
| `RESEND_API_KEY` | a chave do passo 1 | a permissão de enviar |
| `EMAIL_REMETENTE` | `Centro de Estudos Judaicos <boletim@cej-usp.org>` | de quem o e-mail vem |
| `EMAIL_RESPONDER_PARA` | o e-mail `@usp.br` do Centro | para onde vão as respostas |

O endereço em `EMAIL_REMETENTE` precisa ser do domínio verificado no passo 1.
Se não for, o Resend recusa o envio — e o sistema mostra a recusa dele na tela,
escrita por extenso, em vez de um erro sem explicação.

Publique de novo (**Deployments** → o mais recente → **Redeploy**).

## Passo 3 — Conferir, em dois minutos

1. No sistema, abra **Boletins** → **Novo boletim**.
2. Escreva qualquer coisa e clique em **Guardar o rascunho**.
3. Clique em **Mandar um teste para (o seu e-mail)**.
4. Olhe a sua caixa — inclusive o spam. Se chegou, está pronto.

Se não chegou, a tela mostra o motivo que o serviço deu. Os dois mais comuns:
*domain is not verified* (o passo 1 não terminou) e *Invalid API key* (a chave
foi copiada pela metade).

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

---

## A parte legal, em três frases

1. **Só recebe boletim quem tem consentimento registrado.** O sistema não
   permite outra coisa: contato sem essa marca fica fora de todos os envios,
   mesmo que ele esteja na base e ativo.
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

## Quanto custa

Nada, no plano gratuito do Resend, para o volume de um centro de estudos: 3.000
e-mails por mês. Uma base de 500 pessoas com um boletim quinzenal usa 1.000. O
domínio próprio, se vocês forem por esse caminho, custa por volta de R$ 50 ao
ano.
