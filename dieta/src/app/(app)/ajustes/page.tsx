import webpush from "web-push";
import { bd } from "@/lib/bd";
import { ajustes } from "@/lib/consultas";
import { temGemini } from "@/lib/leitor";
import { chavePublica, pushConfigurado } from "@/lib/push";
import { TelaAjustes } from "./tela";

export default async function Ajustes() {
  const [a, aparelhos] = await Promise.all([
    ajustes(),
    bd.aparelho.findMany({ orderBy: { criadoEm: "asc" }, select: { nome: true, criadoEm: true } }),
  ]);
  const configurado = pushConfigurado();

  return (
    <TelaAjustes
      ajustes={a}
      chavePublica={chavePublica()}
      aparelhos={aparelhos.map((x) => ({ nome: x.nome || "Aparelho", desde: x.criadoEm.toISOString() }))}
      falta={{
        push: !configurado,
        cron: !process.env.CRON_SECRET,
        gemini: !temGemini(),
      }}
      // Sem chaves ainda: a tela já oferece um par novo para colar na Vercel, e
      // ninguém precisa abrir um terminal.
      chavesSugeridas={configurado ? null : webpush.generateVAPIDKeys()}
    />
  );
}
