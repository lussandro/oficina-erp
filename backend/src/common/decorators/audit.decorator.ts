import { SetMetadata } from "@nestjs/common";
import { AuditAction } from "@prisma/client";

export const AUDIT_KEY = "audit";

export interface AuditMeta {
  /// Nome do model Prisma em minúsculas (ex.: "user") — usado para buscar o valor anterior.
  entity: string;
  action: AuditAction;
  /// Nome do param de rota com o id da entidade. Ausente em POST (id só existe após criar).
  idParam?: string;
}

export const Audit = (entity: string, action: AuditAction, idParam = "id") =>
  SetMetadata(AUDIT_KEY, { entity, action, idParam } satisfies AuditMeta);
