# O que esta plataforma não coleta

A planilha original guardava CPF e RG dos madrichim. Este sistema não guarda, e
o schema não tem esses campos. Se alguém pedir para adicioná-los, a resposta
padrão é não: para cobrar, prestar contas e achar a pessoa bastam **nome,
telefone e kvutzá**.

## Regras

1. **Nada de documento.** Sem CPF, RG, foto de documento, endereço ou dado de
   saúde. `Madrich` tem nome, telefone, kvutzá, turma e valores — só.
2. **Chanichim não são cadastrados.** Boa parte dos madrichim e **todos** os
   chanichim são menores de idade. O cálculo precisa de quantidades, não de
   crianças identificadas. Não existe tabela de chanich nominal, e não deve
   passar a existir.
3. **Tudo atrás de autenticação.** Não há rota pública com dado nenhum. O
   `middleware.ts` barra qualquer caminho sem cookie de sessão; a conferência da
   assinatura acontece no servidor.
4. **Registro de quem mexeu.** Peso do rateio, política de preço, gastos e
   status ficam em `RegistroAlteracao`, com autor, data, valor de antes e
   justificativa. É prestação de contas, não vigilância: nada de rastrear
   navegação.
5. **Entrada controlada.** A lista `EMAILS_AUTORIZADOS` decide quem entra, nos
   dois caminhos. No link mágico, o token vale 15 minutos, serve uma vez e fica
   guardado como hash. No código de acesso, o código é comparado em tempo
   constante e a recusa é a mesma frase para e-mail errado e para código errado,
   para não revelar qual dos dois falhou — nem quem está na lista.

   O código de acesso é senha compartilhada, com o defeito que toda senha
   compartilhada tem: quem sai do movimento continua sabendo. Troque o código
   quando a coordenação mudar, e prefira ligar o envio de e-mail assim que
   possível — aí cada pessoa passa a entrar pelo próprio e-mail, sem senha
   nenhuma circulando.

## O que fazer quando alguém pede os dados de volta

O cadastro de madrichim é apagável pela própria tela (Madrichim → ×), e o
apagamento é definitivo, em cascata com os pagamentos. Apagar a machané inteira
apaga tudo que pende dela.

## Divulgação

O texto e o PDF de divulgação levam preço, datas e o recado sobre bolsas. Nunca
nome de família, valor individual ou quem recebeu bolsa. Quem recebeu bolsa é
assunto da coordenação, não do grupo de pais.
