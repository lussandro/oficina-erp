import {
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ServiceCategoriesService } from "./service-categories.service";

function makePrisma() {
  return {
    serviceCategory: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe("ServiceCategoriesService.create", () => {
  it("traduz violação de nome único (P2002) em 422", async () => {
    const prisma = makePrisma();
    prisma.serviceCategory.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicado", {
        code: "P2002",
        clientVersion: "x",
      }),
    );
    const service = new ServiceCategoriesService(prisma as any);

    await expect(
      service.create({ name: "Mecânica" } as any),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});

describe("ServiceCategoriesService.findOne", () => {
  it("lança 404 quando não encontra", async () => {
    const prisma = makePrisma();
    prisma.serviceCategory.findUnique.mockResolvedValue(null);
    const service = new ServiceCategoriesService(prisma as any);

    await expect(service.findOne("inexistente")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe("ServiceCategoriesService.remove", () => {
  it("apaga a linha (sem soft-delete no schema); serviços ficam com categoryId nulo", async () => {
    const prisma = makePrisma();
    prisma.serviceCategory.findUnique.mockResolvedValue({ id: "c1" });
    prisma.serviceCategory.delete.mockResolvedValue({});
    const service = new ServiceCategoriesService(prisma as any);

    await service.remove("c1");

    expect(prisma.serviceCategory.delete).toHaveBeenCalledWith({
      where: { id: "c1" },
    });
  });
});
