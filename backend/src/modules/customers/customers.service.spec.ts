import {
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CustomersService } from "./customers.service";

function makePrisma() {
  return {
    customer: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    vehicle: { findMany: jest.fn() },
    serviceOrder: { findMany: jest.fn() },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe("CustomersService.create", () => {
  it("traduz violação de documento único (P2002) em 422", async () => {
    const prisma = makePrisma();
    prisma.customer.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicado", {
        code: "P2002",
        clientVersion: "x",
      }),
    );
    const service = new CustomersService(prisma as any);

    await expect(
      service.create({
        document: "52998224725",
        name: "A",
        phone: "11999999999",
      } as any),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});

describe("CustomersService.findOne", () => {
  it("lança 404 quando não encontra (ou está soft-deleted)", async () => {
    const prisma = makePrisma();
    prisma.customer.findFirst.mockResolvedValue(null);
    const service = new CustomersService(prisma as any);

    await expect(service.findOne("inexistente")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe("CustomersService.remove", () => {
  it("faz soft delete: seta deletedAt e active=false, nunca apaga a linha", async () => {
    const prisma = makePrisma();
    prisma.customer.findFirst.mockResolvedValue({ id: "c1" });
    const service = new CustomersService(prisma as any);

    await service.remove("c1");

    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { deletedAt: expect.any(Date), active: false },
    });
  });
});
