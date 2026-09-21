import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { Role } from "@prisma/client";
import { AuthService } from "./auth.service";

type MockPrisma = ReturnType<typeof makePrisma>;

function makePrisma() {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((arg: unknown) =>
    Array.isArray(arg)
      ? Promise.all(arg)
      : (arg as (tx: MockPrisma) => unknown)(prisma),
  );
  return prisma;
}

function makeAuthService(prisma: ReturnType<typeof makePrisma>) {
  const jwt = {
    signAsync: jest.fn().mockResolvedValue("signed.jwt.token"),
  } as unknown as JwtService;
  const config = {
    getOrThrow: () => "test-secret",
    get: (key: string, fallback?: unknown) => fallback,
  } as unknown as ConfigService;
  return new AuthService(prisma as any, jwt, config);
}

describe("AuthService.login", () => {
  it("lança 401 quando o usuário não existe (Aceite do BAC-37)", async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const service = makeAuthService(prisma);

    await expect(service.login("x@x.com", "errada")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("lança 401 quando a senha está errada", async () => {
    const prisma = makePrisma();
    const passwordHash = await argon2.hash("senha-correta");
    prisma.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "x@x.com",
      passwordHash,
      active: true,
      deletedAt: null,
      role: Role.ATENDENTE,
      name: "X",
    });
    const service = makeAuthService(prisma);

    await expect(service.login("x@x.com", "errada")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("lança 401 quando o usuário está inativo", async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "x@x.com",
      passwordHash: await argon2.hash("senha"),
      active: false,
      deletedAt: null,
      role: Role.ATENDENTE,
    });
    const service = makeAuthService(prisma);

    await expect(service.login("x@x.com", "senha")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("retorna tokens e dados públicos do usuário quando as credenciais são válidas", async () => {
    const prisma = makePrisma();
    const passwordHash = await argon2.hash("senha-correta");
    prisma.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "x@x.com",
      passwordHash,
      active: true,
      deletedAt: null,
      role: Role.ADMIN,
      name: "Fulano",
    });
    const service = makeAuthService(prisma);

    const result = await service.login("x@x.com", "senha-correta");

    expect(result.accessToken).toBe("signed.jwt.token");
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.user).toMatchObject({
      id: "u1",
      email: "x@x.com",
      role: Role.ADMIN,
    });
    expect(prisma.refreshToken.create).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "u1" } }),
    );
  });
});

describe("AuthService.changePassword", () => {
  it("lança 401 quando a senha atual está incorreta", async () => {
    const prisma = makePrisma();
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: "u1",
      passwordHash: await argon2.hash("correta"),
    });
    const service = makeAuthService(prisma);

    await expect(
      service.changePassword("u1", "errada", "nova-senha"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
