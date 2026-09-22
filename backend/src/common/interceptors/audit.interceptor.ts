import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuditAction } from "@prisma/client";
import { Observable, tap } from "rxjs";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../../modules/audit/audit.service";
import { AuthenticatedUser } from "../../modules/auth/strategies/jwt.strategy";
import { AUDIT_KEY, AuditMeta } from "../decorators/audit.decorator";
import { PUBLIC_SELECT } from "../../modules/users/users.service";

type PrismaDelegate = { findUnique: (args: unknown) => Promise<unknown> };

// Projeção por entidade. `user` não pode devolver a linha crua: passwordHash
// iria direto para audit_logs.before, que é somente-leitura e nunca apagada
// (docs/SECURITY.md §4 — BAC-73). Entidade sem projeção aqui não é auditada
// com `before`; some a projeção, some o dado — nunca o contrário.
const SAFE_SELECT: Record<string, Record<string, boolean>> = {
  user: PUBLIC_SELECT,
};

export const auditSafeSelectFor = (entity: string) => SAFE_SELECT[entity];

// Genérico por design: cada módulo soma auditoria só com @Audit(entity, action)
// no controller, sem tocar no service (ARCHITECTURE.md §3 — controller não calcula,
// e audit é infra, não regra de negócio).
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const meta = this.reflector.get<AuditMeta | undefined>(
      AUDIT_KEY,
      context.getHandler(),
    );
    if (!meta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    const routeId: string | undefined = meta.idParam
      ? request.params[meta.idParam]
      : undefined;
    // Busca o valor anterior ANTES do handler rodar — depois do update já seria o novo.
    const before = routeId
      ? await this.fetchEntity(meta.entity, routeId)
      : undefined;

    return next.handle().pipe(
      tap((result) => {
        const entityId = routeId ?? (result as { id?: string } | undefined)?.id;
        if (!entityId) {
          return;
        }
        const after =
          meta.action === AuditAction.DELETE ? undefined : (result ?? before);
        this.auditService
          .record({
            action: meta.action,
            entity: meta.entity,
            entityId,
            before,
            after,
            userId: user?.id,
          })
          .catch((err) =>
            this.logger.error(
              `Falha ao gravar audit log de ${meta.entity}/${entityId}`,
              err instanceof Error ? err.stack : err,
            ),
          );
      }),
    );
  }

  private async fetchEntity(entity: string, id: string): Promise<unknown> {
    const delegate = (this.prisma as unknown as Record<string, PrismaDelegate>)[
      entity
    ];
    const select = auditSafeSelectFor(entity);
    if (!delegate?.findUnique || !select) {
      return undefined;
    }
    return delegate.findUnique({ where: { id }, select });
  }
}
