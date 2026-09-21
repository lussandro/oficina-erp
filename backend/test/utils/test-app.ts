import { ValidationPipe, INestApplication } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../../src/common/prisma/prisma.module";
import { PrismaService } from "../../src/common/prisma/prisma.service";
import { JwtAuthGuard } from "../../src/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../src/common/guards/permissions.guard";
import { HttpExceptionFilter } from "../../src/common/filters/http-exception.filter";
import { AuthModule } from "../../src/modules/auth/auth.module";
import { UsersModule } from "../../src/modules/users/users.module";

// Mesma composição do AppModule (guards globais + filtro), mas sem HealthController:
// fora do escopo desta issue (auth/RBAC) e sem endpoint versionado, então sem valor
// aqui — evita duplicar setup do que já é exercitado manualmente.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
class TestAppModule {}

export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const moduleRef = await Test.createTestingModule({
    imports: [TestAppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix("api/v1", { exclude: ["health"] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  return { app, prisma: app.get(PrismaService) };
}

// Limpa só as tabelas do domínio auth/RBAC (escopo desta suíte). TRUNCATE
// ... CASCADE também esvazia refresh_tokens/password_reset_tokens (FK em users).
export async function cleanAuthTables(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');
}
