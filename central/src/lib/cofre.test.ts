import { describe, expect, it } from "vitest";
import { cifrar, decifrar } from "./cofre";

describe("cofre", () => {
  it("devolve o que guardou", () => {
    const t = "1//0g-token-de-teste-çãé";
    expect(decifrar(cifrar(t))).toBe(t);
  });
  it("cifra diferente a cada vez", () => {
    expect(cifrar("x")).not.toBe(cifrar("x"));
  });
  it("recusa texto adulterado", () => {
    const [iv, tag, corpo] = cifrar("segredo").split(".");
    const outro = Buffer.from(corpo, "base64url");
    outro[0] ^= 1;
    expect(() => decifrar([iv, tag, outro.toString("base64url")].join("."))).toThrow();
  });
});
