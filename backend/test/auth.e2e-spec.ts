import * as request from "supertest";
import { INestApplication } from "@nestjs/common";
import * as argon2 from "argon2";
import { Role } from "@prisma/client";
import { createTestApp, cleanAuthTables } from "./utils/test-app";
import { PrismaService } from "../src/common/prisma/prisma.service";

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const password = "senha-correta-123";
  const email = "teste@oficina.local";

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanAuthTables(prisma);
    await prisma.user.create({
      data: {
        name: "Usuária Teste",
        email,
        passwordHash: await argon2.hash(password),
        role: Role.ATENDENTE,
      },
    });
  });

  describe("POST /auth/login", () => {
    it("retorna tokens e perfil com credenciais válidas", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password })
        .expect(201);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({ email, role: Role.ATENDENTE });
    });

    it("rejeita senha incorreta com 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: "senha-errada" })
        .expect(401);
    });

    it("rejeita e-mail inexistente com 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: "ninguem@oficina.local", password })
        .expect(401);
    });
  });

  describe("POST /auth/refresh", () => {
    it("rotaciona o refresh token e revoga o anterior", async () => {
      const login = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password })
        .expect(201);

      const refreshed = await request(app.getHttpServer())
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: login.body.refreshToken })
        .expect(201);

      expect(refreshed.body.accessToken).toEqual(expect.any(String));
      expect(refreshed.body.refreshToken).not.toBe(login.body.refreshToken);

      await request(app.getHttpServer())
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: login.body.refreshToken })
        .expect(401);
    });

    it("rejeita refresh token inválido com 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: "token-que-nao-existe" })
        .expect(401);
    });
  });

  describe("GET /auth/me", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer()).get("/api/v1/auth/me").expect(401);
    });

    it("retorna o perfil autenticado com token válido", async () => {
      const login = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${login.body.accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({ email, role: Role.ATENDENTE });
    });
  });
});
