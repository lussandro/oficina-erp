import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { of } from "rxjs";
import { AuditAction } from "@prisma/client";
import { AuditInterceptor } from "./audit.interceptor";
import { AuditService } from "../../modules/audit/audit.service";

// Regressão de BAC-73: audit_logs é somente-leitura e nunca apagada
// (docs/SECURITY.md §4), então passwordHash gravado em `before` vaza para sempre.
function contextFor(params: Record<string, string>, user?: { id: string }) {
  return {
    getHandler: () => jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ params, user }),
    }),
  } as unknown as ExecutionContext;
}

// Linha crua que o Prisma devolveria sem `select` — é isto que vazava.
const ROW_WITH_HASH = {
  id: "u1",
  name: "Ana",
  email: "ana@oficina.test",
  role: "ATENDENTE",
  phone: null,
  active: true,
  lastLoginAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$abc$def",
};

function interceptorFor(action: AuditAction, row: unknown) {
  const reflector = {
    get: () => ({ entity: "user", action, idParam: "id" }),
  } as unknown as Reflector;
  // Dublê fiel: sem `select` devolve a linha inteira, com `select` devolve só as
  // chaves projetadas. Assim o teste falha se alguém remover a projeção.
  const findUnique = jest.fn(
    (args: { select?: Record<string, boolean> }) => {
      const value = args?.select
        ? Object.fromEntries(
            Object.keys(args.select).map((k) => [
              k,
              (row as Record<string, unknown>)[k],
            ]),
          )
        : row;
      return Promise.resolve(value);
    },
  );
  // AuditService real: a asserção é sobre o JSON que chega em audit_logs, não
  // sobre o que o interceptor entrega — só assim a barreira de sanitize conta.
  const create = jest.fn().mockResolvedValue(undefined);
  const auditService = new AuditService({ auditLog: { create } } as any);
  const interceptor = new AuditInterceptor(
    reflector,
    { user: { findUnique } } as any,
    auditService,
  );
  return { interceptor, findUnique, create };
}

async function runPatch(action: AuditAction, row: unknown) {
  const { interceptor, findUnique, create } = interceptorFor(action, row);
  const after = { ...(row as Record<string, unknown>), role: "GERENTE" };
  const next = { handle: () => of(after) };
  const result$ = await interceptor.intercept(
    contextFor({ id: "u1" }, { id: "actor1" }),
    next as any,
  );
  await new Promise<void>((resolve) => result$.subscribe(() => resolve()));
  await Promise.resolve();
  return { findUnique, create, gravado: create.mock.calls[0]?.[0]?.data };
}

describe("AuditInterceptor — vazamento de passwordHash (BAC-73)", () => {
  it("PATCH /users/:id não grava passwordHash em audit_logs.before", async () => {
    const { findUnique, gravado } = await runPatch(
      AuditAction.UPDATE,
      ROW_WITH_HASH,
    );

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ select: expect.any(Object) }),
    );
    expect(findUnique).not.toHaveBeenCalledWith({ where: { id: "u1" } });

    expect(gravado.before).not.toHaveProperty("passwordHash");
    expect(gravado.after).not.toHaveProperty("passwordHash");
    expect(gravado.before).toMatchObject({ id: "u1", role: "ATENDENTE" });
  });

  it("DELETE /users/:id não grava passwordHash em audit_logs.before", async () => {
    const { gravado } = await runPatch(AuditAction.DELETE, ROW_WITH_HASH);

    expect(gravado.before).not.toHaveProperty("passwordHash");
    expect(gravado.after).toBeUndefined();
  });
});
