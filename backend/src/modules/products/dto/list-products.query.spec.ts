import { plainToInstance } from "class-transformer";
import { ListProductsQuery } from "./list-products.query";

// Mesma regressão do PR #5 (BAC-68) em ListUsersQuery: @Type(() => Boolean)
// convertia qualquer string não vazia com Boolean(value); ?active=false virava true.
describe("ListProductsQuery.active", () => {
  it("mantém active=false como false", () => {
    expect(plainToInstance(ListProductsQuery, { active: "false" }).active).toBe(
      false,
    );
  });

  it("mantém active=true como true", () => {
    expect(plainToInstance(ListProductsQuery, { active: "true" }).active).toBe(
      true,
    );
  });

  it("fica undefined quando o filtro não é enviado", () => {
    expect(plainToInstance(ListProductsQuery, {}).active).toBeUndefined();
  });
});
