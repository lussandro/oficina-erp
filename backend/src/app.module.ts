import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./common/prisma/prisma.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { ServicesModule } from "./modules/services/services.module";
import { ProductsModule } from "./modules/products/products.module";
import { ProductCategoriesModule } from "./modules/product-categories/product-categories.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    ServicesModule,
    ProductsModule,
    ProductCategoriesModule,
  ],
  controllers: [HealthController],
  providers: [
    // Toda rota exige token válido por padrão; use @Public() para abrir exceção (ADR-0003).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
