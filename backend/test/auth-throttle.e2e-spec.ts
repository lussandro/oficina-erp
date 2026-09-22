import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

// Aceite da BAC-74: prova o rate limit real das 3 rotas sensíveis de auth.
// Usa o AppModule de verdade (o mesmo que sobe em main) e mocka só o Postgres,
// que não existe neste sandbox. Nenhum provider de guard/throttler é substituto.
describe("Rate limit em rotas de auth (BAC-74, e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_SECRET ??= "e2e-test-secret";
    process.env.JWT_REFRESH_SECRET ??= "e2e-test-refresh-secret";
    process.env.DATABASE_URL ??=
      "postgresql://unused:unused@localhost:5432/unused";

    const prismaMock = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue(null),
      },
      passwordResetToken: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
      },
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1", { exclude: ["health"] });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function hammer(path: string, body: Record<string, unknown>) {
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) {
      const res = await request(app.getHttpServer()).post(path).send(body);
      statuses.push(res.status);
    }
    return statuses;
  }

  it("POST /auth/login: 5x 401 e depois 429", async () => {
    const statuses = await hammer("/api/v1/auth/login", {
      email: "nao-existe@teste.com",
      password: "errada123",
    });
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses.slice(5)).toEqual([429, 429, 429]);
  });

  it("POST /auth/forgot-password: 5x 204 e depois 429", async () => {
    const statuses = await hammer("/api/v1/auth/forgot-password", {
      email: "nao-existe@teste.com",
    });
    expect(statuses.slice(0, 5)).toEqual([204, 204, 204, 204, 204]);
    expect(statuses.slice(5)).toEqual([429, 429, 429]);
  });

  it("POST /auth/reset-password: 5x 401 (token inválido) e depois 429", async () => {
    const statuses = await hammer("/api/v1/auth/reset-password", {
      token: "token-invalido",
      newPassword: "NovaSenha123!",
    });
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses.slice(5)).toEqual([429, 429, 429]);
  });
});
