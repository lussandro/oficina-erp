import { plainToInstance } from "class-transformer";
import { ListUsersQuery } from "./list-users.query";

// Regressão do bug achado na revisão do PR #5 (BAC-68): @Type(() => Boolean)
// convertia qualquer string não vazia com Boolean(value), então
// ?active=false virava active:true.
describe("ListUsersQuery.active", () => {
  it("mantém active=false como false", () => {
    expect(plainToInstance(ListUsersQuery, { active: "false" }).active).toBe(
      false,
    );
  });

  it("mantém active=true como true", () => {
    expect(plainToInstance(ListUsersQuery, { active: "true" }).active).toBe(
      true,
    );
  });

  it("fica undefined quando o filtro não é enviado", () => {
    expect(plainToInstance(ListUsersQuery, {}).active).toBeUndefined();
  });
});
