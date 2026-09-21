import * as request from "supertest";
import { INestApplication } from "@nestjs/common";
import * as argon2 from "argon2";
import { Role } from "@prisma/client";
import { createTestApp, cleanAuthTables } from "./utils/test-app";
import { PrismaService } from "../src/common/prisma/prisma.service";

describe("Users (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const password = "senha-forte-123";
  let adminToken: string;
  let gerenteToken: string;
  let atendenteToken: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  async function loginToken(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password })
      .expect(201);
    return res.body.accessToken;
  }

  beforeEach(async () => {
    await cleanAuthTables(prisma);
    const passwordHash = await argon2.hash(password);
    await prisma.user.createMany({
      data: [
        { name: "Admin", email: "admin@oficina.local", passwordHash, role: Role.ADMIN },
        { name: "Gerente", email: "gerente@oficina.local", passwordHash, role: Role.GERENTE },
        { name: "Atendente", email: "atendente@oficina.local", passwordHash, role: Role.ATENDENTE },
      ],
    });

    [adminToken, gerenteToken, atendenteToken] = await Promise.all([
      loginToken("admin@oficina.local"),
      loginToken("gerente@oficina.local"),
      loginToken("atendente@oficina.local"),
    ]);
  });

  describe("GET /users (RBAC: user:read)", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer()).get("/api/v1/users").expect(401);
    });

    it("retorna 403 para ATENDENTE (sem user:read)", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${atendenteToken}`)
        .expect(403);
    });

    it("retorna 200 para GERENTE (tem user:read)", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${gerenteToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("POST /users (RBAC: user:create)", () => {
    const newUser = {
      name: "Novo Usuário",
      email: "novo@oficina.local",
      password: "senha12345",
      role: Role.ATENDENTE,
    };

    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/users")
        .send(newUser)
        .expect(401);
    });

    it("retorna 403 para GERENTE (sem user:create)", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${gerenteToken}`)
        .send(newUser)
        .expect(403);
    });

    it("cria usuário com ADMIN (tem user:create)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newUser)
        .expect(201);

      expect(res.body).toMatchObject({ email: newUser.email, role: Role.ATENDENTE });
      expect(res.body.passwordHash).toBeUndefined();
    });

    it("retorna 422 ao reusar um e-mail já cadastrado", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...newUser, email: "admin@oficina.local" })
        .expect(422);

      expect(res.body.details).toMatchObject({ field: "email" });
    });
  });
});
