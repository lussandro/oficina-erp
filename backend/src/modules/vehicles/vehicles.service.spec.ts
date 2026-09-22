import {
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { VehiclesService } from "./vehicles.service";

function makePrisma() {
  return {
    vehicle: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    customer: { findFirst: jest.fn() },
    serviceOrder: { findMany: jest.fn() },
    quote: { findMany: jest.fn() },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

const CUSTOMER_ID = "11111111-1111-4111-8111-111111111111";

describe("VehiclesService.create", () => {
  it("recusa cliente inexistente com 422 em vez de criar veículo órfão", async () => {
    const prisma = makePrisma();
    prisma.customer.findFirst.mockResolvedValue(null);
    const service = new VehiclesService(prisma as any);

    await expect(
      service.create({ plate: "ABC1234", brand: "VW", model: "Gol", customerId: CUSTOMER_ID } as any),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.vehicle.create).not.toHaveBeenCalled();
  });

  it("traduz placa duplicada (P2002) em 422 dizendo qual campo", async () => {
    const prisma = makePrisma();
    prisma.customer.findFirst.mockResolvedValue({ id: CUSTOMER_ID });
    prisma.vehicle.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicado", {
        code: "P2002",
        clientVersion: "x",
        meta: { target: ["plate"] },
      }),
    );
    const service = new VehiclesService(prisma as any);

    await expect(
      service.create({ plate: "ABC1234", brand: "VW", model: "Gol", customerId: CUSTOMER_ID } as any),
    ).rejects.toMatchObject({
      response: { details: { field: "plate" } },
    });
  });

  it("traduz chassi duplicado (P2002 em vin) com a mensagem do chassi", async () => {
    const prisma = makePrisma();
    prisma.customer.findFirst.mockResolvedValue({ id: CUSTOMER_ID });
    prisma.vehicle.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicado", {
        code: "P2002",
        clientVersion: "x",
        meta: { target: ["vin"] },
      }),
    );
    const service = new VehiclesService(prisma as any);

    await expect(
      service.create({
        plate: "ABC1234",
        brand: "VW",
        model: "Gol",
        vin: "9BWZZZ377VT004251",
        customerId: CUSTOMER_ID,
      } as any),
    ).rejects.toMatchObject({
      response: { details: { field: "vin" } },
    });
  });
});

describe("VehiclesService.findOne", () => {
  it("lança 404 quando não encontra (ou está soft-deleted)", async () => {
    const prisma = makePrisma();
    prisma.vehicle.findFirst.mockResolvedValue(null);
    const service = new VehiclesService(prisma as any);

    await expect(service.findOne("inexistente")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe("VehiclesService.remove", () => {
  it("faz soft delete: só seta deletedAt, nunca apaga a linha", async () => {
    const prisma = makePrisma();
    prisma.vehicle.findFirst.mockResolvedValue({ id: "v1" });
    const service = new VehiclesService(prisma as any);

    await service.remove("v1");

    expect(prisma.vehicle.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { deletedAt: expect.any(Date) },
    });
  });
});

describe("VehiclesService.findHistory", () => {
  it("devolve OS e orçamentos do veículo, filtrando soft-deleted", async () => {
    const prisma = makePrisma();
    prisma.vehicle.findFirst.mockResolvedValue({ id: "v1" });
    prisma.serviceOrder.findMany.mockResolvedValue([]);
    prisma.quote.findMany.mockResolvedValue([]);
    const service = new VehiclesService(prisma as any);

    await service.findHistory("v1");

    expect(prisma.serviceOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { vehicleId: "v1", deletedAt: null } }),
    );
    expect(prisma.quote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { vehicleId: "v1", deletedAt: null } }),
    );
  });
});
