import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

// ADR-0003: sem default inseguro. O backend recusa subir sem estes segredos.
const REQUIRED_ENV = ["JWT_SECRET", "JWT_REFRESH_SECRET", "DATABASE_URL"];

function assertRequiredEnv() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Variável(is) de ambiente obrigatória(s) ausente(s): ${missing.join(", ")}`,
    );
  }
}

async function bootstrap() {
  assertRequiredEnv();

  const app = await NestFactory.create(AppModule);
  const prefix = process.env.API_PREFIX ?? "api/v1";
  app.setGlobalPrefix(prefix);
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle("Oficina ERP API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  // ARCHITECTURE.md §6: Swagger em /api/docs, fora do prefixo versionado /api/v1.
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.BACKEND_PORT ?? 3001;
  await app.listen(port);
  Logger.log(
    `Oficina ERP API rodando em http://localhost:${port}/${prefix}`,
    "Bootstrap",
  );
}
bootstrap();
