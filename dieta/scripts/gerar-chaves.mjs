/**
 * Gera o par de chaves das notificações (VAPID). Rode uma vez só:
 *
 *     npm run chaves
 *
 * e cole as duas linhas nas variáveis de ambiente da Vercel. Trocar as chaves
 * depois desliga as notificações de todo aparelho já cadastrado — cada um
 * precisa tocar em "Ativar avisos" de novo.
 */
import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
