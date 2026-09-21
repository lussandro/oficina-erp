import * as request from "supertest";
import { INestApplication } from "@nestjs/common";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { createTestApp, cleanAuthTables } from "./utils/test-app";
import { PrismaService } from "../src/common/prisma/prisma.service";

// ADR-0006 + docs/TESTING.md regra 6: banco vazio -> migrations + seed -> login
// do admin funciona é teste, não expectativa. Roda o script de seed de verdade
// (prisma/seed.ts), não uma reimplementação da lógica dele.
describe("Bootstrap do admin inicial (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const adminEmail = "admin-bootstrap-e2e@oficina.local";
  const adminPassword = "senha-bootstrap-e2e-123";

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it("banco vazio -> seed -> login do admin funciona", async () => {
    await cleanAuthTables(prisma);

    execFileSync("npx", ["ts-node", "prisma/seed.ts"], {
      cwd: join(__dirname, ".."),
      env: {
        ...process.env,
        SEED_ADMIN_EMAIL: adminEmail,
        SEED_ADMIN_PASSWORD: adminPassword,
      },
      stdio: "pipe",
    });

    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: adminPassword })
      .expect(201);

    expect(res.body.user).toMatchObject({ email: adminEmail, role: "ADMIN" });
  });
});
