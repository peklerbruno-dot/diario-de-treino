import { useEffect, useRef, useState } from "react";
import { db, gravarAjuste } from "../dados/bd.js";
import { MOD, ORDEM, hojeISO } from "../dados/constantes.js";
import { fmt, fmtLonga, resumo, mesNome, numBR } from "../dados/calculos.js";
import {
  dadosDoMes,
  gerarPDF,
  gerarCSV,
  montarBackup,
  restaurarBackup,
  conferirBackup,
  entregar,
  nomeDeArquivo,
} from "../dados/relatorio.js";

export default function Exportar({ sessoes, exercicios, treinos, ex, avisar, ajustes }) {
  const [mes, setMes] = useState(hojeISO().slice(0, 7));
  const [jsPDF, setJsPDF] = useState(null);
  const [ocupado, setOcupado] = useState("");
  const [aRestaurar, setARestaurar] = useState(null);
  const arquivo = useRef(null);

  // O gerador de PDF vem antes do toque: assim a geração é imediata e o iPhone
  // ainda considera o compartilhamento parte do seu toque.
  useEffect(() => {
    let vivo = true;
    import("jspdf").then((m) => vivo && setJsPDF(() => m.jsPDF));
    return () => {
      vivo = false;
    };
  }, []);

  const meses = [...new Set(sessoes.map((s) => s.data.slice(0, 7)))].sort().reverse();
  if (!meses.includes(mes) && meses.length) meses.unshift(mes);
  const doMes = sessoes.filter((s) => s.data.startsWith(mes)).sort((a, b) => a.data.localeCompare(b.data));
  const vazio = sessoes.length === 0;
  const detalhe = { color: "var(--cinza)", fontSize: 13 };
  const ultimoBackup = ajustes?.find((a) => a.chave === "ultimoBackup")?.valor;

  const pdf = async () => {
    if (!jsPDF) return avisar("Um instante, ainda preparando…");
    setOcupado("pdf");
    try {
      const blob = gerarPDF(jsPDF, dadosDoMes(sessoes, exercicios, mes));
      const nome = nomeDeArquivo(mes, "pdf");
      const r = await entregar(new File([blob], nome, { type: "application/pdf" }));
      if (r === "baixado") avisar("PDF salvo");
    } catch (e) {
      avisar("Não consegui gerar o PDF");
      console.error(e);
    }
    setOcupado("");
  };

  const planilha = async () => {
    setOcupado("csv");
    try {
      const csv = gerarCSV(sessoes, exercicios);
      const nome = nomeDeArquivo("planilha", "csv");
      const r = await entregar(new File([csv], nome, { type: "text/csv" }));
      if (r === "baixado") avisar("Planilha salva");
    } catch (e) {
      avisar("Não consegui gerar a planilha");
      console.error(e);
    }
    setOcupado("");
  };

  const backup = async () => {
    setOcupado("backup");
    try {
      const dados = montarBackup({ exercicios, treinos, sessoes, ajustes });
      const nome = nomeDeArquivo(`backup-${hojeISO()}`, "json");
      const r = await entregar(new File([JSON.stringify(dados)], nome, { type: "application/json" }));
      if (r !== "cancelado") {
        await gravarAjuste("ultimoBackup", hojeISO());
        avisar("Backup guardado");
      }
    } catch (e) {
      avisar("Não consegui gerar o backup");
      console.error(e);
    }
    setOcupado("");
  };

  const escolherArquivo = async (ev) => {
    const f = ev.target.files?.[0];
    ev.target.value = "";
    if (!f) return;
    try {
      const dados = JSON.parse(await f.text());
      const erro = conferirBackup(dados);
      if (erro) return avisar(erro);
      setARestaurar(dados);
    } catch {
      avisar("Não consegui ler esse arquivo");
    }
  };

  const restaurar = async () => {
    setOcupado("restaurar");
    try {
      const n = await restaurarBackup(db, aRestaurar);
      setARestaurar(null);
      avisar(`${n.sessoes} ${n.sessoes === 1 ? "treino restaurado" : "treinos restaurados"}`);
    } catch (e) {
      avisar(e.message || "Não consegui restaurar");
    }
    setOcupado("");
  };

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
            {meses.length > 1 && (
              <div className="campo">
                Mês do relatório
                <select value={mes} onChange={(e) => setMes(e.target.value)}>
                  {meses.map((m) => (
                    <option key={m} value={m}>
                      {mesNome(m)} de {m.slice(0, 4)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="rel">
              <h3>Diário de treino</h3>
              <div style={{ color: "var(--cinza)", fontStyle: "italic" }}>
                {mesNome(mes)} de {mes.slice(0, 4)}
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
                              .map((i) => `${ex(i.exId).nome}: ${i.series.map((r) => `${numBR(r.carga)}×${r.reps}`).join(", ")}`)
                              .join(" · ")}
                          </div>
                        )}
                        {s.mod === "natacao" && (
                          <div style={detalhe}>
                            {s.itens.map((i) => `${ex(i.exId).nome} ${numBR(i.metros)} m em ${i.tempoMin} min`).join(" · ")}
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

            <button className="btn" disabled={ocupado === "pdf"} onClick={pdf}>
              {ocupado === "pdf" ? "Montando o PDF…" : "Gerar PDF do mês"}
            </button>
            <button className="btn q" disabled={ocupado === "csv"} onClick={planilha}>
              {ocupado === "csv" ? "Montando a planilha…" : "Exportar tudo em planilha"}
            </button>
          </>
        )}

        <h2>Backup</h2>
        <div className="vazio" style={{ paddingTop: 6 }}>
          Os dados ficam só neste aparelho. O Safari pode apagá-los se você passar semanas sem abrir o app, e trocar de
          iPhone também leva tudo embora — guarde um backup nos Arquivos ou no iCloud de vez em quando.
          {ultimoBackup && (
            <>
              <br />
              Último backup: {fmtLonga(ultimoBackup)}.
            </>
          )}
        </div>

        {aRestaurar ? (
          <>
            <div className="aviso">
              O arquivo tem {aRestaurar.sessoes.length} {aRestaurar.sessoes.length === 1 ? "treino" : "treinos"},{" "}
              {aRestaurar.treinos.length} {aRestaurar.treinos.length === 1 ? "modelo" : "modelos"} e{" "}
              {aRestaurar.exercicios.length} exercícios
              {aRestaurar.em ? `, guardado em ${fmt(aRestaurar.em.slice(0, 10))}` : ""}. Restaurar substitui tudo o que
              está neste aparelho.
            </div>
            <button className="btn" disabled={ocupado === "restaurar"} onClick={restaurar}>
              {ocupado === "restaurar" ? "Restaurando…" : "Substituir tudo por este backup"}
            </button>
            <button className="btn q" onClick={() => setARestaurar(null)}>Cancelar</button>
          </>
        ) : (
          <>
            <button className="btn q" disabled={ocupado === "backup"} onClick={backup}>
              {ocupado === "backup" ? "Montando o backup…" : "Exportar backup"}
            </button>
            <button className="btn q" onClick={() => arquivo.current?.click()}>Restaurar backup</button>
            <input
              ref={arquivo}
              type="file"
              accept="application/json,.json"
              onChange={escolherArquivo}
              style={{ display: "none" }}
            />
          </>
        )}
      </div>
    </>
  );
}
