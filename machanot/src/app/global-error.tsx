"use client";

/**
 * Último recurso: erro tão cedo que nem o layout carregou. Sem componentes,
 * sem CSS do projeto — só texto legível e o caminho de volta.
 */
export default function ErroGlobal({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f6f2",
          color: "#22262e",
        }}
      >
        <div style={{ maxWidth: 460, padding: 24 }}>
          <h1 style={{ fontSize: 18, marginBottom: 12 }}>O sistema não respondeu agora</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>
            Nada do que você digitou se perdeu. Tente de novo em alguns instantes.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: "8px 14px",
              borderRadius: 6,
              border: "none",
              background: "#1a5d8f",
              color: "#fff",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Tentar de novo
          </button>
          {error.digest ? (
            <p style={{ marginTop: 16, fontSize: 11, color: "#6b7280" }}>
              código do erro: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
