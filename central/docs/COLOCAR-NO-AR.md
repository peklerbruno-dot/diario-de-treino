# Como colocar a Central no ar

Guia para quem não programa. São uns 40 minutos, tudo em site. A parte mais
chata é a do Google (passo 3): ela existe porque a Central vai ler o seu e-mail,
e o Google exige que você mesmo registre quem pode fazer isso.

Você vai precisar de: **Vercel** (que você já usa), uma conta no **Google Cloud**
(é a mesma conta do Gmail pessoal) e uma chave do **Gemini**. Tudo no plano
gratuito: o custo é zero.

---

## Passo 1 — O banco de dados

Igual ao do Termômetro, mas um banco só da Central:

1. Na Vercel: **Storage** → **Create Database** → **Postgres** (plano gratuito)
   → nome `central` → **Create**.
2. Aba **.env.local** → **Copy Snippet**. Guarde para o passo 2. É a chave do
   banco: não mande por chat nem e-mail.

## Passo 2 — Publicar o app (primeira vez)

1. Na Vercel: **Add New…** → **Project** → **diario-de-treino** → **Import**.
2. Em *Root Directory*, **Edit** → escolha a pasta **`central`**.
3. Em **Environment Variables**, cole o snippet inteiro do passo 1 e cadastre:

   | Nome | Valor |
   |---|---|
   | `AUTH_SECRET` | um texto longo e aleatório (32 letras ou mais). Ninguém digita; ele protege o login e cifra o acesso às suas contas. **Não troque depois**: trocar obriga a reconectar as contas. |
   | `CODIGO_DE_ACESSO` | a senha que você vai digitar para entrar. Atrás dela está o seu e-mail: escolha uma boa. |
   | `CRON_SECRET` | outro texto aleatório. É o que deixa a Vercel atualizar a Central sozinha toda manhã. |

4. **Deploy**. Anote o endereço que sair, algo como `central-xyz.vercel.app`.
   Ele é usado no passo 3.

O app já abre e aceita o código, mas ainda não conecta contas. Falta o Google.

## Passo 3 — Registrar a Central no Google

Use a conta do Gmail **pessoal** (é ela que vai "ser dona" do registro).

**3a. Criar o projeto e ligar as APIs**

1. Abra https://console.cloud.google.com → no topo, **Selecionar projeto** →
   **Novo projeto** → nome `Central` → **Criar**.
2. Menu ☰ → **APIs e serviços** → **Biblioteca**. Procure e **ative**, uma por
   uma: **Gmail API**, **Google Calendar API** e **Google Drive API**.

**3b. A tela de permissão**

1. Menu ☰ → **APIs e serviços** → **Tela de permissão OAuth** (ou "Google Auth
   Platform") → **Começar**.
2. Nome do app: `Central`. E-mail de suporte: o seu. Público: **Externo**.
   Contato: o seu e-mail. **Criar**.
3. Em **Acesso a dados** → **Adicionar ou remover escopos**, cole na caixa
   "Adicionar escopos manualmente" estas três linhas e confirme:

   ```
   https://www.googleapis.com/auth/gmail.modify
   https://www.googleapis.com/auth/calendar.events
   https://www.googleapis.com/auth/drive.file
   ```

4. Em **Público**, clique em **Publicar app** → **Confirmar**.

   Por que publicar: enquanto o app fica "em teste", o Google corta o acesso a
   cada 7 dias e você teria que reconectar as três contas toda semana. Publicado
   sem verificação, ele funciona normalmente para você. O único efeito é um aviso
   na hora de conectar (passo 5).

**3c. As credenciais**

1. Menu ☰ → **APIs e serviços** → **Credenciais** (ou "Clientes") →
   **Criar credenciais** → **ID do cliente OAuth**.
2. Tipo: **Aplicativo da Web**. Nome: `Central`.
3. Em **URIs de redirecionamento autorizados** → **Adicionar URI** e cole o
   endereço do passo 2 seguido de `/api/google/retorno`. Exemplo:

   ```
   https://central-xyz.vercel.app/api/google/retorno
   ```

4. **Criar**. Aparecem o **ID do cliente** e a **chave secreta**. Copie os dois.

## Passo 4 — A chave do Gemini (grátis)

1. Abra https://aistudio.google.com com a conta do Gmail pessoal.
2. **Get API key** → **Create API key** → escolha o projeto `Central` do passo 3
   → copie a chave. Não precisa de cartão.

No plano gratuito, o Google pode usar o que passa pelo Gemini para melhorar os
produtos dele (o README explica). Se um dia quiser fechar isso, é só ativar o
faturamento no AI Studio; o uso de uma pessoa sai por centavos.

## Passo 5 — Juntar tudo

1. Na Vercel, no projeto da Central → **Settings** → **Environment Variables**,
   cadastre:

   | Nome | Valor |
   |---|---|
   | `GOOGLE_CLIENT_ID` | o ID do cliente (passo 3c) |
   | `GOOGLE_CLIENT_SECRET` | a chave secreta (passo 3c) |
   | `GEMINI_API_KEY` | a chave do Gemini (passo 4) |
   | `APP_URL` | o endereço do passo 2, sem barra no fim (`https://central-xyz.vercel.app`) |

2. **Deployments** → nos três pontinhos do último → **Redeploy**.
3. Abra o endereço, entre com o código → **Ajustes** → **+ Conectar conta Google**.
4. O Google vai avisar "O Google não verificou este app". É o aviso do passo
   3b: clique em **Avançado** → **Acessar Central (não seguro)**. Escolha a conta,
   **deixe todas as caixas marcadas** e confirme.
5. Repita o **+ Conectar conta Google** para as outras duas contas.
6. Volte ao **Painel** e toque em **Atualizar**. A primeira vez lê duas semanas
   de e-mail das três contas: são umas duzentas conversas, triadas 64 por vez.
   Toque em **Atualizar** de novo enquanto ela avisar que há conversas na fila.

Depois disso a Central se atualiza sozinha toda manhã, às 6h. Durante o dia, é
tocar em **Atualizar**.

## Passo 6 — No iPhone

Abra o endereço no **Safari** → entre → **Compartilhar** → **Adicionar à Tela
de Início**. No computador, é o mesmo endereço no navegador.

---

## Se aparecer "Acesso bloqueado" numa conta do CIP ou da USP

Contas de instituição têm um administrador que pode proibir apps não verificados
de ler o e-mail. Se ao conectar a do CIP (ou a da USP) aparecer *"Acesso
bloqueado: o administrador da sua organização…"*, não há o que fazer do seu lado:
peça à TI para **liberar o app pelo ID do cliente**. O caminho, para ela, é:
Admin Console → Segurança → Controles de API → Controle de acesso a apps →
Adicionar app → *ID do cliente OAuth* → colar o `GOOGLE_CLIENT_ID` → **Confiável**.

Enquanto isso, as outras contas funcionam normalmente.

## Se uma conta pedir para reconectar

Acontece se você trocar a senha do Google, revogar o acesso, ou trocar o
`AUTH_SECRET`. O Painel avisa; em Ajustes, **Reconectar**. A triagem e as regras
continuam lá.
