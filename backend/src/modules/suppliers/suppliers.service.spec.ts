import {
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { SuppliersService } from "./suppliers.service";

function makePrisma() {
  return {
    supplier: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    product: { findMany: jest.fn() },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe("SuppliersService.create", () => {
  it("traduz violação de CNPJ único (P2002) em 422", async () => {
    const prisma = makePrisma();
    prisma.supplier.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicado", {
        code: "P2002",
        clientVersion: "x",
      }),
    );
    const service = new SuppliersService(prisma as any);

    await expect(
      service.create({ document: "11222333000181", name: "A" } as any),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});

describe("SuppliersService.findAll", () => {
  it("busca por nome, nome fantasia e CNPJ (só dígitos) e pagina", async () => {
    const prisma = makePrisma();
    prisma.supplier.findMany.mockResolvedValue([]);
    prisma.supplier.count.mockResolvedValue(0);
    const service = new SuppliersService(prisma as any);

    const result = await service.findAll({
      page: 1,
      pageSize: 20,
      q: "11.222.333/0001-81",
    } as any);

    const where = prisma.supplier.findMany.mock.calls[0][0].where;
    expect(where.deletedAt).toBeNull();
    expect(where.OR).toEqual([
      { name: { contains: "11.222.333/0001-81", mode: "insensitive" } },
      { tradeName: { contains: "11.222.333/0001-81", mode: "insensitive" } },
      { document: { contains: "11222333000181" } },
    ]);
    expect(result.meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
  });
});

describe("SuppliersService.findOne", () => {
  it("lança 404 quando não encontra (ou está soft-deleted)", async () => {
    const prisma = makePrisma();
    prisma.supplier.findFirst.mockResolvedValue(null);
    const service = new SuppliersService(prisma as any);

    await expect(service.findOne("inexistente")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe("SuppliersService.remove", () => {
  it("faz soft delete: seta deletedAt e active=false, nunca apaga a linha", async () => {
    const prisma = makePrisma();
    prisma.supplier.findFirst.mockResolvedValue({ id: "s1" });
    const service = new SuppliersService(prisma as any);

    await service.remove("s1");

    expect(prisma.supplier.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { deletedAt: expect.any(Date), active: false },
    });
  });
});

describe("SuppliersService.findProducts", () => {
  it("lista os produtos vinculados ao fornecedor", async () => {
    const prisma = makePrisma();
    prisma.supplier.findFirst.mockResolvedValue({ id: "s1" });
    prisma.product.findMany.mockResolvedValue([{ id: "p1" }]);
    const service = new SuppliersService(prisma as any);

    await expect(service.findProducts("s1")).resolves.toEqual([{ id: "p1" }]);
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { supplierId: "s1", deletedAt: null },
      orderBy: { name: "asc" },
    });
  });
});
