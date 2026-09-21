import { AuditAction } from "@prisma/client";
import { AuditService } from "./audit.service";

function makePrisma() {
  return {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe("AuditService.record", () => {
  it("serializa before/after (inclusive Decimal/Date) para JSON puro", async () => {
    const prisma = makePrisma();
    const service = new AuditService(prisma as any);

    await service.record({
      action: AuditAction.UPDATE,
      entity: "user",
      entityId: "u1",
      before: { role: "ATENDENTE", createdAt: new Date("2026-01-01") },
      after: { role: "GERENTE", createdAt: new Date("2026-01-01") },
      userId: "actor1",
    });

    const data = prisma.auditLog.create.mock.calls[0][0].data;
    expect(data.entity).toBe("user");
    expect(data.entityId).toBe("u1");
    expect(data.before).toEqual({
      role: "ATENDENTE",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(data.userId).toBe("actor1");
  });

  it("propaga erro de escrita (quem decide engolir é o AuditInterceptor, não o service)", async () => {
    const prisma = makePrisma();
    prisma.auditLog.create.mockRejectedValue(new Error("db fora do ar"));
    const service = new AuditService(prisma as any);

    await expect(
      service.record({ action: AuditAction.CREATE, entity: "user", entityId: "u1" }),
    ).rejects.toThrow("db fora do ar");
  });
});

describe("AuditService.findAll", () => {
  it("filtra por entity, action e intervalo de datas", async () => {
    const prisma = makePrisma();
    prisma.auditLog.findMany.mockResolvedValue([]);
    prisma.auditLog.count.mockResolvedValue(0);
    const service = new AuditService(prisma as any);

    await service.findAll({
      page: 1,
      pageSize: 20,
      entity: "user",
      action: AuditAction.UPDATE,
      from: new Date("2026-01-01"),
      to: new Date("2026-01-31"),
    } as any);

    const where = prisma.auditLog.findMany.mock.calls[0][0].where;
    expect(where.entity).toBe("user");
    expect(where.action).toBe(AuditAction.UPDATE);
    expect(where.createdAt).toEqual({
      gte: new Date("2026-01-01"),
      lte: new Date("2026-01-31"),
    });
  });
});
