import webpush from "web-push";
import { bd } from "@/lib/bd";
import { ajustes, lembretes } from "@/lib/consultas";
import { temGemini } from "@/lib/leitor";
import { hoje } from "@/lib/datas";
import { chavePublica, pushConfigurado } from "@/lib/push";
import { TelaAjustes } from "./tela";

export default async function Ajustes() {
  const [a, aparelhos, lista] = await Promise.all([
    ajustes(),
    bd.aparelho.findMany({ orderBy: { criadoEm: "asc" }, select: { nome: true, criadoEm: true } }),
    lembretes(),
  ]);
  const configurado = pushConfigurado();

  return (
    <TelaAjustes
      ajustes={a}
      lembretes={lista}
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
      hoje={hoje()}
    />
  );
}
