# Como colocar o Assistente no ar

Guia para quem não programa. Uns 40 minutos, tudo em site. São quatro contas:
**GitHub** e **Vercel** (você já tem), **Anthropic** (o Claude) e **Meta for
Developers** (o WhatsApp).

Por que tantas: o WhatsApp não deixa um programa entrar no seu número pessoal.
O caminho oficial é a Meta dar ao assistente um número dele, e você conversar
com esse número como conversa com qualquer contato.

> Nada de colar token, chave ou senha deste guia em chat, e-mail ou WhatsApp.
> Eles vão só nos campos da Vercel.

---

## Passo 1 — A chave do Claude

1. Entre em https://console.anthropic.com e crie a conta.
2. **Billing** → coloque um cartão e alguns dólares de crédito. Uma mensagem
   comum custa por volta de 2 a 5 centavos de dólar; uma com pesquisa na
   internet ou foto, um pouco mais.
3. **API Keys** → **Create Key** → copie e guarde. Ela começa com `sk-ant-`.

Dica: em **Limits** dá para pôr um teto de gasto por mês.

## Passo 2 — O banco de dados

Igual ao Termômetro, mas um banco **só dele**.

1. Na Vercel: **Storage** → **Create Database** → **Postgres** (gratuito) →
   nome `assistente` → **Create**.
2. Aba **.env.local** → **Copy Snippet**. Guarde para o passo 4.

## Passo 3 — O número do WhatsApp (Meta)

1. Entre em https://developers.facebook.com com a sua conta do Facebook →
   **Meus apps** → **Criar app**.
2. Caso de uso: **Outro** → tipo **Empresa** → dê um nome (ex.: "Assistente")
   → criar. Se pedir um portfólio empresarial, crie um com o seu nome.
3. Na página do app, em **Adicionar produtos**, ache **WhatsApp** →
   **Configurar**.
4. Vá em **WhatsApp → Configuração da API** (API Setup). A Meta já deu um
   **número de teste**, gratuito — esse vai ser o número do assistente.
   Anote o **Identificador do número de telefone** (Phone number ID).
5. Na mesma tela, em **Para**, clique em **Gerenciar lista de números** e
   adicione o **seu** celular. Chega um código no WhatsApp para confirmar.
   (O número de teste só conversa com números dessa lista — ótimo aqui: é
   mais uma trava para ninguém além de você usar.)
6. **Configurações do app → Básico** → **Chave secreta do app** → **Mostrar**.
   Guarde.

### O token que não vence

O token que aparece na Configuração da API vence em 24 horas. Para um que
dure:

1. Entre em https://business.facebook.com → **Configurações** →
   **Usuários** → **Usuários do sistema** → **Adicionar** → nome
   "assistente", função **Administrador**.
2. Com ele selecionado: **Atribuir ativos** → **Apps** → o seu app →
   **Controle total**. Depois **Contas do WhatsApp** → a conta de teste →
   **Controle total**.
3. **Gerar novo token** → o seu app → validade **Nunca** → marque
   `whatsapp_business_messaging` e `whatsapp_business_management` → gerar.
   Copie: esse é o `WHATSAPP_TOKEN`.

## Passo 4 — Publicar o app

1. Na Vercel: **Add New…** → **Project** → **diario-de-treino** → **Import**.
2. *Root Directory* → **Edit** → pasta **`assistente`**. (O passo que mais
   confunde: sem isso a Vercel publica o diário de treino.)
3. **Environment Variables**: cole o snippet inteiro do passo 2 e depois
   cadastre, uma a uma:

   | Nome | Valor |
   |---|---|
   | `ANTHROPIC_API_KEY` | a chave do passo 1 |
   | `WHATSAPP_TOKEN` | o token que não vence |
   | `WHATSAPP_NUMERO_ID` | o identificador do número de teste |
   | `META_APP_SECRET` | a chave secreta do app |
   | `WHATSAPP_TOKEN_VERIFICACAO` | invente um texto qualquer (ex.: `abacaxi-azul-42`) |
   | `DONO_WHATSAPP` | o seu celular com 55 e DDD, só números: `5511912345678` |
   | `DONO_NOME` | como o assistente chama você |
   | `CRON_SECRET` | outro texto longo e aleatório, inventado |

4. **Deploy**. Sai um endereço como `assistente-xyz.vercel.app`. Abra: a
   página mostra ✅ para cada peça configurada.

## Passo 5 — Ligar o WhatsApp ao app

1. De volta ao app na Meta: **WhatsApp → Configuração** (Configuration) →
   **Webhook** → **Editar**.
2. **URL de callback**: `https://SEU-ENDEREÇO.vercel.app/api/whatsapp`
3. **Verificar token**: o mesmo texto de `WHATSAPP_TOKEN_VERIFICACAO`.
4. **Verificar e salvar**. Se der erro, confira se o texto é idêntico e se o
   deploy terminou.
5. Logo abaixo, em **Campos do webhook**, clique em **Assinar** na linha
   **messages**.

Agora mande "oi" para o número de teste. Salve-o nos contatos como
"Assistente" 🙂.

## Passo 6 — O relógio dos lembretes

A Vercel gratuita só roda tarefas agendadas uma vez por dia, pouco para
lembrete. Quem chama o relógio a cada minuto é o https://cron-job.org
(gratuito):

1. Crie a conta → **Create cronjob**.
2. **URL**: `https://SEU-ENDEREÇO.vercel.app/api/lembretes?chave=SEU_CRON_SECRET`
3. **Execution schedule**: **Every 1 minute** → **Create**.

Teste: "me lembra daqui a 2 minutos de beber água".

## Passo 7 — Lembretes depois de 24 horas sem conversa (opcional)

Ver "A janela de 24 horas" no [README](../README.md). Para cadastrar o modelo:

1. https://business.facebook.com/wa/manage/message-templates →
   **Criar modelo**.
2. Categoria **Utilidade**, nome `lembrete`, idioma **Português (BR)**.
3. Corpo: `⏰ Lembrete: {{1}}` (exemplo para a Meta: `tomar o remédio`).
4. Enviar para análise; costuma sair em minutos.
5. Na Vercel, cadastre `WHATSAPP_MODELO_LEMBRETE` = `lembrete` e faça
   **Redeploy**.

---

## Quando algo não funciona

- **Mandei "oi" e nada.** Abra o projeto na Vercel → **Logs**. Sem nenhuma
  linha de `/api/whatsapp`: o webhook não está assinado em **messages**
  (passo 5.5). Com "número não autorizado": o `DONO_WHATSAPP` está diferente
  do número que mandou. Com erro de "invalid x-api-key": a chave do Claude.
- **Chegou "Tive um problema para responder".** O motivo está nos Logs, na
  linha logo acima. Os mais comuns: crédito do Claude acabou, ou o token do
  WhatsApp venceu (use o do usuário do sistema).
- **O lembrete não chegou.** Confira no cron-job.org se as chamadas estão
  voltando `200`. Se voltam `401`, a `chave=` não bate com o `CRON_SECRET`. Se
  aparece `falhas` com "re-engagement", é a janela de 24 horas (passo 7).
- **Quero um número de verdade, não o de teste.** Em **Configuração da API** →
  **Adicionar número de telefone**. Precisa ser um número que **não** esteja
  em uso no aplicativo do WhatsApp. Depois troque o `WHATSAPP_NUMERO_ID`.
