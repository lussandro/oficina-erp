import {
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ServicesService } from "./services.service";

function makePrisma() {
  return {
    service: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe("ServicesService.create", () => {
  it("traduz violação de nome único (P2002) em 422", async () => {
    const prisma = makePrisma();
    prisma.service.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicado", {
        code: "P2002",
        clientVersion: "x",
      }),
    );
    const service = new ServicesService(prisma as any);

    await expect(
      service.create({ name: "Troca de óleo", price: 100 } as any),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});

describe("ServicesService.findOne", () => {
  it("lança 404 quando não encontra (ou está soft-deleted)", async () => {
    const prisma = makePrisma();
    prisma.service.findFirst.mockResolvedValue(null);
    const service = new ServicesService(prisma as any);

    await expect(service.findOne("inexistente")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe("ServicesService.remove", () => {
  it("é soft-delete: marca deletedAt e active=false, não apaga a linha", async () => {
    const prisma = makePrisma();
    prisma.service.findFirst.mockResolvedValue({ id: "s1" });
    prisma.service.update.mockResolvedValue({});
    const service = new ServicesService(prisma as any);

    await service.remove("s1");

    const callArg = prisma.service.update.mock.calls[0][0];
    expect(callArg.where).toEqual({ id: "s1" });
    expect(callArg.data.active).toBe(false);
    expect(callArg.data.deletedAt).toBeInstanceOf(Date);
  });
});

describe("ServicesService.findAll", () => {
  it("filtra soft-deleted por padrão e aplica active/categoryId/q", async () => {
    const prisma = makePrisma();
    prisma.service.findMany.mockResolvedValue([]);
    prisma.service.count.mockResolvedValue(0);
    const service = new ServicesService(prisma as any);

    await service.findAll({
      page: 1,
      pageSize: 20,
      active: false,
      categoryId: "c1",
      q: "óleo",
    } as any);

    const where = prisma.service.findMany.mock.calls[0][0].where;
    expect(where.deletedAt).toBeNull();
    expect(where.active).toBe(false);
    expect(where.categoryId).toBe("c1");
    expect(where.OR).toBeDefined();
  });
});
