# Como colocar o sistema do Centro no ar

Guia para quem não programa. São uns 20 minutos, tudo pelo navegador, sem
instalar nada. Precisa de duas contas gratuitas: **GitHub** (você já tem) e
**Vercel** (você já usou para o machanot e para o Termômetro).

Por que não dá para "só abrir um arquivo": este sistema é de **equipe**. Várias
pessoas precisam ver a mesma coisa do computador delas, e cada uma entra com a
própria conta. Isso exige um servidor e um banco de dados — é o mesmo caminho do
Termômetro, e não o do diário de treino, que roda inteiro dentro do celular.

---

## Passo 1 — Criar o banco de dados

O Centro precisa do banco **dele**, separado dos outros apps. São sistemas
diferentes; um não deve poder mexer nos dados do outro.

1. Entre em https://vercel.com com a conta do GitHub.
2. No menu de cima: **Storage** → **Create Database** → **Postgres** (o plano
   gratuito serve) → dê o nome `cej` → **Create**.
3. Abra o banco criado, vá na aba **.env.local** e clique em **Copy Snippet**.
   Guarde esse texto — é o que você vai colar no passo 2.

   **Não mande esse texto por WhatsApp, e-mail ou chat nenhum.** Ele é a chave do
   banco: quem o tiver lê e escreve tudo, sem precisar de senha nenhuma.

O nome que a Vercel dá ao banco pode sair sorteado (`neon-amber-school` e coisas
assim). Não faz diferença.

## Passo 2 — Publicar o sistema

1. Na Vercel: **Add New…** → **Project**.
2. Na lista de repositórios, escolha **diario-de-treino** → **Import**.
3. **Este é o passo que mais confunde:** em *Root Directory*, clique em **Edit**
   e escolha a pasta **`cej`**. Sem isso a Vercel publica o diário de treino de
   novo, não o sistema do Centro.
4. Abra **Environment Variables** e:

   - **cole o snippet inteiro** do passo 1 dentro do campo de valor. A Vercel
     entende que são várias linhas e cria todas as variáveis de uma vez. Uma
     delas é a `DATABASE_URL_UNPOOLED`, que o sistema usa só na hora de criar as
     tabelas — sem ela o primeiro deploy falha com um erro que não explica nada;
   - depois cadastre mais duas, uma a uma:

   | Nome | Valor |
   |---|---|
   | `AUTH_SECRET` | um texto longo e aleatório, pelo menos 32 letras |
   | `CODIGO_DE_FUNDACAO` | uma senha só sua, que você vai digitar uma única vez |

   **`AUTH_SECRET`** ninguém digita nunca: é o que o sistema usa por dentro para
   assinar quem está logado. Invente um texto comprido e esqueça. (Se um dia
   você trocá-lo, todo mundo cai para fora e entra de novo — o que é
   exatamente o que se quer se um computador se perder.)

   **`CODIGO_DE_FUNDACAO`** é a chave da primeira conta. Sem ele, o primeiro
   estranho que topasse com o endereço viraria a coordenação do Centro. Ele só
   funciona enquanto não existir ninguém cadastrado; feita a sua conta, ele para
   de valer sozinho.

5. Clique em **Deploy** e espere. No fim sai o endereço, algo como
   `cej.vercel.app`.

## Passo 3 — Criar a sua conta, e já

Abra o endereço. Como ainda não há ninguém, o sistema oferece **Criar a primeira
conta**. Preencha nome, e-mail, uma senha e o `CODIGO_DE_FUNDACAO` do passo 2.

Faça isso agora, antes de mandar o endereço para qualquer pessoa. É a única
janela em que essa tela existe.

## Passo 4 — Cadastrar a equipe

Vá em **Equipe** → *Cadastrar alguém*. Para cada pessoa: nome, e-mail, e se ela
é da **Equipe** ou da **Coordenação** (coordenação é quem pode cadastrar,
promover e desativar gente; o resto todo mundo faz igual).

Ao cadastrar, o sistema mostra um **link de primeiro acesso**. Copie e mande
para a pessoa por onde você preferir. Nele, ela escolhe a própria senha.

Três coisas que vale saber sobre esse link:

- ele aparece **uma vez só** — depois disso, o sistema guarda dele apenas um
  rastro embaralhado, e nem ele mesmo consegue mostrá-lo de novo;
- vale por **sete dias** e serve **uma vez**;
- se alguém esquecer a senha, é o mesmo caminho: **Equipe** → *Link para nova
  senha*. Você nunca precisa saber a senha de ninguém.

## Passo 5 — Levar o calendário para o Google Agenda

Cada pessoa faz isso uma vez, no computador dela:

1. No sistema, abra **Calendário** e role até o fim. Copie o endereço que
   aparece lá (ele é pessoal — o seu é diferente do meu).
2. Abra o Google Agenda. Na coluna da esquerda, clique no **+** ao lado de
   *Outras agendas* → **De URL**.
3. Cole o endereço → **Adicionar agenda**.

A partir daí, as atividades e reuniões do Centro aparecem dentro da agenda
pessoal e se atualizam sozinhas. O Google costuma buscar as novidades a cada
poucas horas, não na hora: uma reunião remarcada agora pode demorar um pouco
para mudar de lugar lá. No sistema ela muda na hora.

Esse endereço funciona **sem senha** — é a única forma de o Google conseguir
buscá-lo. Por isso ele não deve ser publicado em lugar aberto. Se um dia vazar,
a pessoa (ou a coordenação) troca a chave em **Equipe**, e o endereço antigo
morre na hora.

---

## Perguntas que vão aparecer

**Quanto custa?** Nada, nos planos gratuitos da Vercel e do banco, para o
tamanho de uso de uma equipe. Não há cobrança escondida: se o limite gratuito
for atingido, o serviço avisa em vez de cobrar.

**O banco "dorme"?** Sim. Se ninguém usar por um tempo, a primeira visita do dia
demora alguns segundos a mais enquanto o banco acorda. É normal e não é defeito.
Para conferir se o sistema está de pé sem precisar entrar, abra
`https://<seu-endereço>/api/saude` — ele responde `{"ok":true}`.

**Como eu atualizo?** Todo `push` para o `main` publica sozinho. Você não faz
nada.

**Quem apagar alguma coisa, apaga mesmo?** Não. Atividades, reuniões e
encaminhamentos apagados saem das listas mas continuam guardados no banco. Numa
equipe, "onde foi parar aquilo que eu cadastrei?" é uma pergunta que se faz — e
uma linha que sumiu de verdade não responde.

**E se todo mundo da coordenação perder a senha ao mesmo tempo?** O sistema não
deixa você chegar lá: ele recusa desativar ou rebaixar a última pessoa da
coordenação que ainda está ativa. Se ainda assim acontecer, é preciso alguém com
acesso ao banco para destravar.

**Dá para o sistema mandar e-mail?** Hoje não, de propósito: mandar e-mail exige
contratar um serviço, configurar domínio, e é onde este tipo de projeto costuma
travar. Os links de primeiro acesso você manda pela mão, por onde a equipe já
conversa.
