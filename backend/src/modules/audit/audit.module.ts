import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditLogsController } from "./audit-logs.controller";
import { AuditService } from "./audit.service";
import { AuditInterceptor } from "../../common/interceptors/audit.interceptor";

@Module({
  controllers: [AuditLogsController],
  providers: [
    AuditService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditService],
})
export class AuditModule {}
