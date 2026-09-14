import { MOD, ORDEM, hojeISO } from "../dados/constantes.js";
import { fmt, resumo } from "../dados/calculos.js";

export default function Exportar({ sessoes, ex, avisar }) {
  const mesAtual = hojeISO().slice(0, 7);
  const doMes = sessoes.filter((s) => s.data.startsWith(mesAtual)).sort((a, b) => a.data.localeCompare(b.data));
  const vazio = sessoes.length === 0;
  const detalhe = { color: "var(--cinza)", fontSize: 13 };

  return (
    <>
      <div className="top">
        <h1>Exportar</h1>
        <div className="sub">Prévia do relatório em PDF</div>
      </div>
      <div className="sec" style={{ paddingTop: 14 }}>
        {vazio ? (
          <div className="vazio" style={{ paddingTop: 16 }}>
            O relatório mensal reúne todos os treinos do mês, exercício por exercício, com os totais de cada
            modalidade. Ele aparece aqui assim que houver o primeiro registro.
          </div>
        ) : (
          <>
            <div className="rel">
              <h3>Diário de treino</h3>
              <div style={{ color: "var(--cinza)", fontStyle: "italic" }}>
                {new Date(mesAtual + "-15T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </div>
              <div className="kpis">
                {ORDEM.map((m) => {
                  const n = doMes.filter((s) => s.mod === m).length;
                  return n ? (
                    <div key={m} className="kpi">
                      <b style={{ color: MOD[m].cor }}>{n}</b>
                      <span>{MOD[m].nome}</span>
                    </div>
                  ) : null;
                })}
              </div>
              <table>
                <tbody>
                  {doMes.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <b style={{ fontWeight: 400 }}>{fmt(s.data)}</b> · {s.nome}
                        {s.mod === "musc" && (
                          <div style={detalhe}>
                            {s.itens
                              .map((i) => `${ex(i.exId).nome}: ${i.series.map((r) => `${r.carga}×${r.reps}`).join(", ")}`)
                              .join(" · ")}
                          </div>
                        )}
                        {s.mod === "natacao" && (
                          <div style={detalhe}>
                            {s.itens.map((i) => `${ex(i.exId).nome} ${i.metros} m em ${i.tempoMin} min`).join(" · ")}
                          </div>
                        )}
                        {s.mod === "pilates" && s.obs && <div style={{ ...detalhe, fontStyle: "italic" }}>{s.obs}</div>}
                      </td>
                      <td>{resumo(s)}</td>
                    </tr>
                  ))}
                  {!doMes.length && (
                    <tr>
                      <td className="vazio">Nenhum treino neste mês ainda.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <button className="btn" onClick={() => avisar("O PDF do mês chega na etapa 5")}>Gerar PDF do mês</button>
            <button className="btn q" onClick={() => avisar("A planilha chega na etapa 5")}>Exportar tudo em planilha</button>
          </>
        )}
      </div>
    </>
  );
}
