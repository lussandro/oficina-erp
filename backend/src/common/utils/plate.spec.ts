import { isValidPlate, normalizePlate } from "./plate";

describe("normalizePlate", () => {
  it("tira separador e sobe para maiúsculas", () => {
    expect(normalizePlate("abc-1234")).toBe("ABC1234");
    expect(normalizePlate(" ab c 1d23 ")).toBe("ABC1D23");
  });
});

describe("isValidPlate", () => {
  it("aceita padrão antigo e Mercosul", () => {
    expect(isValidPlate("ABC1234")).toBe(true);
    expect(isValidPlate("abc-1d23")).toBe(true);
  });

  it("recusa o que não é placa", () => {
    expect(isValidPlate("AB1234")).toBe(false);
    expect(isValidPlate("ABCD1234")).toBe(false);
    expect(isValidPlate("")).toBe(false);
  });
});
