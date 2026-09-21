import { parseDurationMs } from "./duration";

describe("parseDurationMs", () => {
  it("converte unidades suportadas", () => {
    expect(parseDurationMs("15m")).toBe(15 * 60_000);
    expect(parseDurationMs("1h")).toBe(3_600_000);
    expect(parseDurationMs("7d")).toBe(7 * 86_400_000);
    expect(parseDurationMs("30s")).toBe(30_000);
  });

  it("rejeita formato inválido", () => {
    expect(() => parseDurationMs("abc")).toThrow("Duração inválida");
    expect(() => parseDurationMs("15")).toThrow("Duração inválida");
    expect(() => parseDurationMs("15x")).toThrow("Duração inválida");
  });
});
