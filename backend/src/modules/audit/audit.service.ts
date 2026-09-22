import { Injectable } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { ListAuditLogsQuery } from "./dto/list-audit-logs.query";

export interface AuditEntry {
  action: AuditAction;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  userId?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  // Propaga erro de escrita — quem chama (AuditInterceptor) decide não derrubar a
  // requisição por causa disso; aqui a responsabilidade é só persistir.
  async record(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        before: toJson(sanitize(entry.before)),
        after: toJson(sanitize(entry.after)),
        userId: entry.userId,
      },
    });
  }

  async findAll(query: ListAuditLogsQuery) {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
}

// Última barreira antes do JSON (BAC-73): audit_logs é somente-leitura e nunca
// apagada (docs/SECURITY.md §4), então um campo sensível que chegue aqui vaza
// para sempre — não há rota de exclusão depois. A projeção do interceptor
// resolve `user`, mas `after` vem do retorno do handler e não passa por ela.
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "password_hash",
  "token",
  "accessToken",
  "refreshToken",
]);

function sanitize(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  // Date, Decimal e afins são folhas — copiar Object.entries deles esvaziaria o
  // valor (Date vira {}). Só objeto simples é percorrido.
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      continue;
    }
    out[key] = sanitize(item);
  }
  return out;
}
