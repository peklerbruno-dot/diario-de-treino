/**
 * A única página: diz se cada peça está configurada. Mostra só "sim" ou "não"
 * — nunca o valor de uma variável —, então pode ficar aberta sem senha.
 */
export const dynamic = "force-dynamic";

const PECAS: [string, string][] = [
  ["DATABASE_URL", "Banco de dados"],
  ["ANTHROPIC_API_KEY", "Chave do Claude"],
  ["WHATSAPP_TOKEN", "Token do WhatsApp"],
  ["WHATSAPP_NUMERO_ID", "Id do número do WhatsApp"],
  ["WHATSAPP_TOKEN_VERIFICACAO", "Token de verificação do webhook"],
  ["META_APP_SECRET", "Chave secreta do app da Meta"],
  ["DONO_WHATSAPP", "Seu número"],
  ["CRON_SECRET", "Senha do relógio dos lembretes"],
];

export default function Pagina() {
  const faltando = PECAS.filter(([v]) => !process.env[v]);
  return (
    <main>
      <h1>🤖 Assistente</h1>
      <p>Esta é a casa do seu assistente no WhatsApp. A conversa acontece lá, não aqui.</p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {PECAS.map(([v, nome]) => (
          <li key={v}>
            {process.env[v] ? "✅" : "❌"} {nome} <code style={{ opacity: 0.6 }}>{v}</code>
          </li>
        ))}
      </ul>
      <p>
        {faltando.length
          ? `Faltam ${faltando.length} variável(is). Veja docs/COLOCAR-NO-AR.md.`
          : "Tudo configurado. Mande um “oi” para o número do assistente."}
      </p>
    </main>
  );
}
