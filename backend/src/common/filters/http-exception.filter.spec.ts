import { ArgumentsHost, UnprocessableEntityException } from "@nestjs/common";
import { HttpExceptionFilter } from "./http-exception.filter";

function makeHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

// Achado ao validar BAC-38: exceção construída com payload de objeto (o padrão
// usado para conflito de documento/e-mail único) não tem `error` no body do
// Nest, e o filtro caía sempre em "Internal Server Error" mesmo para 422/404/etc.
describe("HttpExceptionFilter", () => {
  it("deriva `error` do status quando a exceção não traz o campo", () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = makeHost();

    filter.catch(
      new UnprocessableEntityException({
        message: "CPF já cadastrado para outro cliente",
        details: { field: "document" },
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalledWith({
      statusCode: 422,
      error: "Unprocessable Entity",
      message: "CPF já cadastrado para outro cliente",
      details: { field: "document" },
    });
  });
});
