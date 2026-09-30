# Lançar sem clicar em nada (quase)

`scripts/lancar.mjs` faz sozinho o que o [`COLOCAR-NO-AR.md`](COLOCAR-NO-AR.md)
manda fazer à mão: cria o banco no Neon, cria o projeto na Vercel apontando para
a pasta `viagem`, cadastra todas as variáveis (sorteando `AUTH_SECRET` e o
código de criação) e publica a `main`.

Ele precisa de três chaves, que só o dono das contas consegue gerar:

| Variável | Onde pegar |
|---|---|
| `VERCEL_TOKEN` | https://vercel.com/account/tokens → **Create** (escopo: sua conta; validade à vontade) |
| `NEON_API_KEY` | https://console.neon.tech → entre com o GitHub → **Account settings → API keys → Create** |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey → **Create API key** |

**Nunca cole essas chaves num chat.** No Claude Code na web, elas vão nas
configurações do ambiente (menu do ambiente no título da sessão → **Editar** →
variáveis de ambiente). Numa sessão nova, é só pedir “lança o app da viagem”,
ou rodar:

```sh
node viagem/scripts/lancar.mjs --conferir   # só testa as chaves
node viagem/scripts/lancar.mjs              # cria tudo e publica
```

No fim ele mostra o endereço do app e o código para criar a primeira conta.
