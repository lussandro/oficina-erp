import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { of } from "rxjs";
import { AuditAction } from "@prisma/client";
import { AuditInterceptor } from "./audit.interceptor";

function contextFor(params: Record<string, string>, user?: { id: string }) {
  return {
    getHandler: () => jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ params, user }),
    }),
  } as unknown as ExecutionContext;
}

describe("AuditInterceptor", () => {
  it("não toca no prisma nem no audit service quando a rota não tem @Audit", async () => {
    const reflector = { get: () => undefined } as unknown as Reflector;
    const prisma = { user: { findUnique: jest.fn() } };
    const auditService = { record: jest.fn() };
    const interceptor = new AuditInterceptor(
      reflector,
      prisma as any,
      auditService as any,
    );

    const next = { handle: () => of({ id: "u1" }) };
    await interceptor.intercept(contextFor({}), next as any);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it("em UPDATE, busca o valor anterior antes do handler e grava antes/depois", async () => {
    const reflector = {
      get: () => ({ entity: "user", action: AuditAction.UPDATE, idParam: "id" }),
    } as unknown as Reflector;
    const before = { id: "u1", role: "ATENDENTE" };
    const after = { id: "u1", role: "GERENTE" };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(before) } };
    const auditService = { record: jest.fn().mockResolvedValue(undefined) };
    const interceptor = new AuditInterceptor(
      reflector,
      prisma as any,
      auditService as any,
    );

    const next = { handle: () => of(after) };
    const result$ = await interceptor.intercept(
      contextFor({ id: "u1" }, { id: "actor1" }),
      next as any,
    );
    await new Promise<void>((resolve) => result$.subscribe(() => resolve()));
    await Promise.resolve();

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: "u1" } });
    expect(auditService.record).toHaveBeenCalledWith({
      action: AuditAction.UPDATE,
      entity: "user",
      entityId: "u1",
      before,
      after,
      userId: "actor1",
    });
  });

  it("em DELETE, grava o valor anterior e depois vazio (exclusão lógica)", async () => {
    const reflector = {
      get: () => ({ entity: "user", action: AuditAction.DELETE, idParam: "id" }),
    } as unknown as Reflector;
    const before = { id: "u1", active: true };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(before) } };
    const auditService = { record: jest.fn().mockResolvedValue(undefined) };
    const interceptor = new AuditInterceptor(
      reflector,
      prisma as any,
      auditService as any,
    );

    const next = { handle: () => of(undefined) };
    const result$ = await interceptor.intercept(
      contextFor({ id: "u1" }, { id: "actor1" }),
      next as any,
    );
    await new Promise<void>((resolve) => result$.subscribe(() => resolve()));
    await Promise.resolve();

    expect(auditService.record).toHaveBeenCalledWith({
      action: AuditAction.DELETE,
      entity: "user",
      entityId: "u1",
      before,
      after: undefined,
      userId: "actor1",
    });
  });
});
