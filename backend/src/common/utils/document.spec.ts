import { isValidCNPJ, isValidCPF } from "./document";

describe("isValidCPF", () => {
  it("aceita CPF com dígito verificador correto", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
  });

  it("rejeita CPF com dígito verificador errado", () => {
    expect(isValidCPF("529.982.247-26")).toBe(false);
  });

  it("rejeita sequência repetida", () => {
    expect(isValidCPF("111.111.111-11")).toBe(false);
  });

  it("rejeita tamanho errado", () => {
    expect(isValidCPF("123")).toBe(false);
  });
});

describe("isValidCNPJ", () => {
  it("aceita CNPJ com dígito verificador correto", () => {
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
  });

  it("rejeita CNPJ com dígito verificador errado", () => {
    expect(isValidCNPJ("11.222.333/0001-82")).toBe(false);
  });

  it("rejeita sequência repetida", () => {
    expect(isValidCNPJ("11.111.111/1111-11")).toBe(false);
  });
});
