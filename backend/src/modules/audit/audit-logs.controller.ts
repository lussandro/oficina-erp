import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { AuditService } from "./audit.service";
import { ListAuditLogsQuery } from "./dto/list-audit-logs.query";

@ApiTags("audit-logs")
@ApiBearerAuth()
@Controller("audit-logs")
export class AuditLogsController {
  constructor(private readonly auditService: AuditService) {}

  // Somente leitura (docs/API_CONTRACT.md §Auditoria): sem rota de escrita nem de exclusão.
  @Get()
  @Permissions(PERMISSIONS.AUDIT_READ)
  findAll(@Query() query: ListAuditLogsQuery) {
    return this.auditService.findAll(query);
  }
}
