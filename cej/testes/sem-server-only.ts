/**
 * O `server-only` no lugar dele, durante os testes.
 *
 * Esse pacote existe para **quebrar o build** se um módulo de servidor for
 * importado por um componente de cliente — é uma proteção boa, e foi ela que
 * impediu a chave de e-mail de ir parar no navegador. Mas ele quebra igual
 * dentro do vitest, que não é nem servidor nem cliente.
 *
 * Trocá-lo por este arquivo vazio nos testes não afrouxa nada: quem continua
 * conferindo de verdade é o `next build`.
 */
export {};
