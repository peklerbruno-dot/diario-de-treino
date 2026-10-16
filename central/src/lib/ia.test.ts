import { ApiError } from "@google/genai";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { diagnostico } = await import("./ia");

const erro = (status: number, message: string) => new ApiError({ status, message });

describe("diagnostico do erro do Gemini", () => {
  it("separa cota do dia de cota por minuto", () => {
    expect(diagnostico(erro(429, '{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}')).tipo).toBe("dia");
    const m = diagnostico(erro(429, '{"quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier","retryDelay":"23s"}'));
    expect(m).toEqual({ tipo: "minuto", esperaMs: 23_000 });
  });
  it("trata 503 como sobrecarga e o resto como outro erro", () => {
    expect(diagnostico(erro(503, "high demand")).tipo).toBe("sobrecarga");
    expect(diagnostico(erro(400, "bad")).tipo).toBe("outro");
    expect(diagnostico(new Error("x")).tipo).toBe("outro");
  });
});
