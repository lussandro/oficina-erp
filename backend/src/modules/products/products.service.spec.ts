import {
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ProductsService } from "./products.service";

function makePrisma() {
  return {
    product: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe("ProductsService.create", () => {
  it("traduz violação de SKU único (P2002) em 422", async () => {
    const prisma = makePrisma();
    prisma.product.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicado", {
        code: "P2002",
        clientVersion: "x",
        meta: { target: ["sku"] },
      }),
    );
    const service = new ProductsService(prisma as any);

    await expect(
      service.create({ sku: "A1", name: "Filtro", salePrice: "10.00" } as any),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("assume custo zero quando não informado", async () => {
    const prisma = makePrisma();
    prisma.product.create.mockResolvedValue({ id: "p1" });
    const service = new ProductsService(prisma as any);

    await service.create({
      sku: "A1",
      name: "Filtro",
      salePrice: "10.00",
    } as any);

    expect(prisma.product.create.mock.calls[0][0].data.costPrice).toBe("0");
  });
});

describe("ProductsService.findOne", () => {
  it("lança 404 quando não encontra (ou está soft-deleted)", async () => {
    const prisma = makePrisma();
    prisma.product.findFirst.mockResolvedValue(null);
    const service = new ProductsService(prisma as any);

    await expect(service.findOne("inexistente")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
