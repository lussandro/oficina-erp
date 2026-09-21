import {
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma, Role } from "@prisma/client";
import { UsersService } from "./users.service";

function makePrisma() {
  return {
    user: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe("UsersService.create", () => {
  it("cria usuário com senha em hash (nunca em texto puro)", async () => {
    const prisma = makePrisma();
    prisma.user.create.mockResolvedValue({ id: "u1", email: "a@a.com" });
    const service = new UsersService(prisma as any);

    await service.create({
      name: "A",
      email: "A@A.com",
      password: "senha123",
      role: Role.ATENDENTE,
    } as any);

    const callArg = prisma.user.create.mock.calls[0][0];
    expect(callArg.data.email).toBe("a@a.com");
    expect(callArg.data.passwordHash).not.toBe("senha123");
    expect(callArg.data).not.toHaveProperty("password");
  });

  it("traduz violação de e-mail único (P2002) em 422", async () => {
    const prisma = makePrisma();
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicado", {
        code: "P2002",
        clientVersion: "x",
      }),
    );
    const service = new UsersService(prisma as any);

    await expect(
      service.create({
        name: "A",
        email: "a@a.com",
        password: "x",
        role: Role.ATENDENTE,
      } as any),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});

describe("UsersService.findOne", () => {
  it("lança 404 quando não encontra (ou está soft-deleted)", async () => {
    const prisma = makePrisma();
    prisma.user.findMany.mockResolvedValue([]);
    (prisma.user as any).findFirst = jest.fn().mockResolvedValue(null);
    const service = new UsersService(prisma as any);

    await expect(service.findOne("inexistente")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
