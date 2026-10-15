import { afterEach, describe, expect, it, vi } from "vitest";
import { enderecoDeRetorno } from "./endereco";

const req = new Request("https://diario-de-treino-jq2z-abc123-peklerbruno-9555s-projects.vercel.app/api/google/conectar");

afterEach(() => vi.unstubAllEnvs());

describe("enderecoDeRetorno", () => {
  it("usa APP_URL quando existe, sem barra no fim", () => {
    vi.stubEnv("APP_URL", "https://central.exemplo.com/");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "diario-de-treino-jq2z.vercel.app");
    expect(enderecoDeRetorno(req)).toBe("https://central.exemplo.com/api/google/retorno");
  });
  it("sem APP_URL, usa o domínio de produção que a Vercel informa", () => {
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "diario-de-treino-jq2z.vercel.app");
    expect(enderecoDeRetorno(req)).toBe("https://diario-de-treino-jq2z.vercel.app/api/google/retorno");
  });
  it("fora da Vercel, usa o endereço por onde chegou", () => {
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(enderecoDeRetorno(new Request("http://localhost:3000/x"))).toBe("http://localhost:3000/api/google/retorno");
  });
});
