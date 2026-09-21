import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { randomBytes, createHash } from "node:crypto";
import { Prisma, Role } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { permissionsForRole } from "../../common/rbac/permissions";
import { parseDurationMs } from "../../common/utils/duration";
import { AccessTokenPayload } from "./strategies/jwt.strategy";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    // Mensagem genérica em todo caminho de falha: não revela se o e-mail existe.
    const invalidCredentials = () =>
      new UnauthorizedException("Credenciais inválidas");

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.active || user.deletedAt) {
      throw invalidCredentials();
    }

    const passwordOk = await argon2.verify(user.passwordHash, password);
    if (!passwordOk) {
      throw invalidCredentials();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokenPair(user.id, user.role);
    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: permissionsForRole(user.role),
      },
    };
  }

  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const invalid = () =>
      new UnauthorizedException("Refresh token inválido ou expirado");

    const tokenHash = hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw invalid();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
    });
    if (!user || !user.active || user.deletedAt) {
      throw invalid();
    }

    // Rotação: o token usado é revogado e um novo é emitido, na mesma transação.
    const tokens = await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
      return this.issueTokenPair(user.id, user.role, tx);
    });

    return tokens;
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const ok = await argon2.verify(user.passwordHash, currentPassword);
    if (!ok) {
      throw new UnauthorizedException("Senha atual incorreta");
    }
    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  // Sempre silenciosa: não revela se o e-mail existe. Token não é enviado por e-mail
  // ainda — nenhum provedor foi decidido (fora do escopo do BAC-37). Fica logado em
  // dev para permitir o fluxo de reset-password ser exercitado manualmente/em teste.
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.active || user.deletedAt) {
      return;
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + parseDurationMs("1h"));

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    this.logger.log(
      `Token de recuperação de senha gerado para userId=${user.id} (envio por e-mail: fora do escopo atual)`,
    );
    if (this.config.get("NODE_ENV") !== "production") {
      this.logger.debug(`[dev] reset token para ${user.email}: ${rawToken}`);
    }
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const invalid = () =>
      new UnauthorizedException("Token de recuperação inválido ou expirado");

    const tokenHash = hashToken(rawToken);
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw invalid();
    }

    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  private async issueTokenPair(
    userId: string,
    role: Role,
    db: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<TokenPair> {
    const payload: AccessTokenPayload = {
      sub: userId,
      role,
      permissions: permissionsForRole(role),
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow("JWT_SECRET"),
      expiresIn: this.config.get("JWT_EXPIRES_IN", "15m"),
    });

    const rawRefreshToken = randomBytes(48).toString("hex");
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(
      Date.now() +
        parseDurationMs(this.config.get("JWT_REFRESH_EXPIRES_IN", "7d")),
    );
    await db.refreshToken.create({ data: { userId, tokenHash, expiresAt } });

    return { accessToken, refreshToken: rawRefreshToken };
  }
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
