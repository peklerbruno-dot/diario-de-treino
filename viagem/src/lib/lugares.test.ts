import { describe, expect, it } from "vitest";
import {
  distanciaKm,
  ehLinkDoInstagram,
  ehLinkDoMaps,
  lerLinkDoMaps,
  linkDaRotaDoDia,
  linkDeRota,
  primeiroLink,
} from "./lugares";
import { interpretarResposta } from "./leitor";
import { diasEntre, periodo, porExtenso } from "./datas";

describe("links do Google Maps", () => {
  it("lê nome e o ponto exato de um link de lugar", () => {
    const l = lerLinkDoMaps(
      "https://www.google.com/maps/place/Contramar/@19.4194,-99.1682,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d19.4196!4d-99.1672",
    );
    expect(l).toEqual({ nome: "Contramar", lat: 19.4196, lng: -99.1672 });
  });
  it("lê coordenadas soltas em ?q=", () => {
    expect(lerLinkDoMaps("https://maps.google.com/?q=15.8612,-97.0677")).toEqual({ lat: 15.8612, lng: -97.0677 });
  });
  it("recusa o que não é do Google", () => {
    expect(lerLinkDoMaps("https://example.com/maps/place/X")).toBeNull();
  });
  it("reconhece os tipos de link", () => {
    expect(ehLinkDoMaps("https://maps.app.goo.gl/abc123")).toBe(true);
    expect(ehLinkDoInstagram("https://www.instagram.com/reel/C8xYz_1ab/?igsh=xyz")).toBe(true);
    expect(ehLinkDoInstagram("https://www.instagram.com/contramar/")).toBe(false);
  });
  it("acha o link no meio do texto compartilhado", () => {
    expect(primeiroLink("Olha isso! https://www.instagram.com/p/ABC/.")).toBe("https://www.instagram.com/p/ABC/");
  });
});

describe("rotas", () => {
  it("manda o nome ao Google, não só as coordenadas", () => {
    const u = new URL(linkDeRota({ nome: "Contramar", cidade: "Cidade do México", lat: 1, lng: 2 }, "walking"));
    expect(u.searchParams.get("destination")).toBe("Contramar, Cidade do México");
    expect(u.searchParams.get("travelmode")).toBe("walking");
  });
  it("a rota do dia põe as paradas no meio", () => {
    const u = new URL(linkDaRotaDoDia([{ nome: "A" }, { nome: "B" }, { nome: "C" }])!);
    expect(u.searchParams.get("waypoints")).toBe("A|B");
    expect(u.searchParams.get("destination")).toBe("C");
  });
  it("distância em linha reta", () => {
    // Zócalo → Coyoacán: uns 10 km
    const d = distanciaKm({ lat: 19.4326, lng: -99.1332 }, { lat: 19.3467, lng: -99.1617 });
    expect(d).toBeGreaterThan(9);
    expect(d).toBeLessThan(11);
  });
});

describe("resposta do leitor", () => {
  it("limpa, deduplica e corrige a categoria", () => {
    const r = interpretarResposta(
      JSON.stringify({
        resumo: "Carrossel de tacos",
        lugares: [
          { nome: "El Califa de León", categoria: "restaurante", cidade: "CDMX", endereco: "", descricao: "Taco de bistec", dicas: "" },
          { nome: "El Califa de Leon", categoria: "restaurante", cidade: "CDMX", endereco: "", descricao: "", dicas: "" },
          { nome: "Mercado", categoria: "mercado-inexistente", cidade: "", endereco: "", descricao: "", dicas: "" },
          { nome: "", categoria: "bar" },
        ],
      }),
    );
    expect(r.lugares.map((l) => l.nome)).toEqual(["El Califa de León", "Mercado"]);
    expect(r.lugares[1].categoria).toBe("outro");
  });
  it("aceita JSON dentro de bloco de código", () => {
    expect(interpretarResposta('```json\n{"resumo":"x","lugares":[]}\n```').resumo).toBe("x");
  });
  it("recusa lixo com uma mensagem legível", () => {
    expect(() => interpretarResposta("não sei")).toThrow(/formato/);
  });
});

describe("datas", () => {
  it("dias da viagem", () => {
    expect(diasEntre("2026-12-30", "2027-01-02")).toEqual(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
  });
  it("por extenso", () => {
    expect(porExtenso("2026-12-04")).toBe("sexta, 4 de dezembro");
    expect(periodo("2026-12-04", "2026-12-14")).toBe("4 a 14 de dezembro de 2026");
    expect(periodo("2026-12-28", "2027-01-03")).toBe("28 de dezembro de 2026 a 3 de janeiro de 2027");
  });
});
