# O que esta plataforma não coleta

A planilha original guardava CPF e RG dos madrichim. Este sistema não guarda
nem isso nem os nomes: para calcular preço, basta saber **quantos são e quanto
cada um paga**. Se alguém pedir para adicionar cadastro de pessoas, a resposta
padrão é não — e a pergunta de volta é para que serviria, já que o cálculo não
precisa.

## Regras

1. **Nada de documento, nada de nome.** Sem CPF, RG, endereço, telefone ou dado
   de saúde. Não existe tabela de pessoas nesta plataforma.
2. **Ninguém é cadastrado individualmente.** Boa parte dos madrichim e **todos**
   os chanichim são menores de idade. O cálculo precisa de quantidades por
   categoria, não de gente identificada. Controle de quem pagou o quê, se a
   coordenação precisar, é assunto da tesouraria — não deste sistema.
3. **Tudo atrás de autenticação.** Não há rota pública com dado nenhum. O
   `middleware.ts` barra qualquer caminho sem cookie de sessão; a conferência da
   assinatura acontece no servidor.
4. **Registro de quem mexeu.** Peso do rateio, política de preço, gastos e
   status ficam em `RegistroAlteracao`, com autor, data, valor de antes e
   justificativa. É prestação de contas, não vigilância: nada de rastrear
   navegação.
5. **Entrada por um código só.** Não há contas, e-mails nem tokens: um código
   compartilhado, comparado em tempo constante, e um cookie assinado que vale
   seis meses. A plataforma não sabe quem é quem — e, como não guarda dado
   pessoal nenhum, não precisa saber.

   Senha compartilhada tem o defeito de toda senha compartilhada: quem sai do
   movimento continua sabendo. Troque o código quando a coordenação mudar; é
   uma variável de ambiente, leva um minuto.

## O que fazer quando alguém pede os dados de volta

Não há o que devolver nem o que apagar: a plataforma não guarda dado pessoal de
ninguém. O que existe são quantidades, valores e o registro de quais e-mails da
coordenação alteraram o quê — este último é prestação de contas do próprio uso
do sistema, e some junto com a machané quando ela é apagada.

## Divulgação

O texto e o PDF de divulgação levam preço, datas e o recado sobre bolsas. Nunca
nome de família, valor individual ou quem recebeu bolsa. Quem recebeu bolsa é
assunto da coordenação, não do grupo de pais.
