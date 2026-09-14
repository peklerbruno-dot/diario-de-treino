import { useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { db } from "../dados/bd.js";
import { MOD, ORDEM } from "../dados/constantes.js";
import { fmt, fmtLonga, resumo } from "../dados/calculos.js";

export default function Historico({ exercicios, sessoes, avisar, Excluir, limparConfirmacao, abrirSessao }) {
  const [grafico, setGrafico] = useState("semana");
  const [exGraf, setExGraf] = useState(1);

  const excluirSessao = async (id) => {
    await db.sessoes.delete(id);
    limparConfirmacao();
    avisar("Treino excluído");
  };

  // Seis semanas para trás, contando os treinos de cada modalidade.
  const semanas = Array.from({ length: 6 }, (_, k) => {
    const fim = new Date();
    fim.setDate(fim.getDate() - (5 - k) * 7);
    const ini = new Date(fim);
    ini.setDate(ini.getDate() - 6);
    const dentro = (s) => {
      const d = new Date(s.data + "T12:00:00");
      return d >= ini && d <= fim;
    };
    const r = { semana: fmt(ini.toISOString().slice(0, 10)) };
    ORDEM.forEach((m) => (r[m] = sessoes.filter((s) => s.mod === m && dentro(s)).length));
    return r;
  });

  // O exercício escolhido pode ter sido apagado da biblioteca; cai no primeiro da lista.
  const deMusc = exercicios.filter((e) => e.mod === "musc");
  const exSel = deMusc.some((e) => e.id === exGraf) ? exGraf : (deMusc[0]?.id ?? null);

  // Carga máxima do exercício escolhido, sessão a sessão.
  const progressao = sessoes
    .filter((s) => s.mod === "musc" && (s.itens || []).some((i) => i.exId === exSel && (i.series || []).length))
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((s) => ({
      data: fmt(s.data),
      carga: Math.max(...s.itens.find((i) => i.exId === exSel).series.map((r) => Number(r.carga) || 0)),
    }));

  const vazio = sessoes.length === 0;
  const eixo = { fontSize: 12, fill: "#7A7468", fontFamily: "inherit" };
  const caixa = { fontFamily: "inherit", background: "#FFFDF8", border: "1px solid #D8D2C4" };

  return (
    <>
      <div className="top">
        <h1>Histórico</h1>
        <div className="sub">
          {sessoes.length
            ? `${sessoes.length} ${sessoes.length === 1 ? "treino registrado" : "treinos registrados"}`
            : "Nenhum treino ainda"}
        </div>
      </div>
      <div className="sec">
        {vazio ? (
          <div className="vazio" style={{ paddingTop: 30 }}>
            Aqui ficam todos os treinos que você registrou, com gráficos de frequência por semana e evolução de carga
            por exercício. Registre o primeiro na tela Início; depois, um toque em qualquer treino abre para conferir e
            corrigir.
          </div>
        ) : (
          <>
            <div className="seg" style={{ marginTop: 10 }}>
              <button className={grafico === "semana" ? "on" : ""} onClick={() => setGrafico("semana")}>
                Treinos por semana
              </button>
              <button className={grafico === "carga" ? "on" : ""} onClick={() => setGrafico("carga")}>
                Evolução de carga
              </button>
            </div>

            {grafico === "semana" ? (
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={semanas} barGap={2}>
                  <CartesianGrid vertical={false} stroke="#EAE5D9" />
                  <XAxis dataKey="semana" tick={eixo} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} width={22} tick={eixo} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={caixa} />
                  {ORDEM.map((m) => (
                    <Bar key={m} dataKey={m} name={MOD[m].nome} fill={MOD[m].cor} radius={[2, 2, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <>
                <select value={exSel ?? ""} onChange={(e) => setExGraf(Number(e.target.value))} style={{ marginBottom: 12 }}>
                  {deMusc.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
                </select>
                {progressao.length ? (
                  <ResponsiveContainer width="100%" height={170}>
                    <LineChart data={progressao}>
                      <CartesianGrid vertical={false} stroke="#EAE5D9" />
                      <XAxis dataKey="data" tick={eixo} axisLine={false} tickLine={false} />
                      <YAxis
                        width={34}
                        tick={eixo}
                        axisLine={false}
                        tickLine={false}
                        domain={["dataMin - 5", "dataMax + 5"]}
                      />
                      <Tooltip formatter={(v) => [`${v} kg`, "Carga máxima"]} contentStyle={caixa} />
                      <Line type="monotone" dataKey="carga" stroke={MOD.musc.cor} strokeWidth={2} dot={{ r: 4, fill: MOD.musc.cor }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="vazio">Registre um treino com esse exercício para ver a evolução.</div>
                )}
              </>
            )}

            <h2>Todos os treinos</h2>
            {[...sessoes]
              .sort((a, b) => b.data.localeCompare(a.data))
              .map((s) => (
                <div key={s.id} className="cabx">
                  <button className="lin" onClick={() => abrirSessao(s)}>
                    <span className="mk" style={{ "--c": MOD[s.mod].cor }} />
                    <span className="t">
                      {s.nome}
                      <small>{fmtLonga(s.data)}</small>
                    </span>
                    <span className="num">{resumo(s)}</span>
                  </button>
                  <Excluir id={`s-${s.id}`} onConfirm={() => excluirSessao(s.id)} />
                </div>
              ))}
          </>
        )}
      </div>
    </>
  );
}
