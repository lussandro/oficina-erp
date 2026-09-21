import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Role } from "@prisma/client";
import { Permission } from "../../../common/rbac/permissions";

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  permissions: Permission[];
}

export interface AuthenticatedUser {
  id: string;
  role: Role;
  permissions: Permission[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_SECRET"),
    });
  }

  // Payload já carrega role/permissions (ADR-0003): sem consulta ao banco por request.
  validate(payload: AccessTokenPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      role: payload.role,
      permissions: payload.permissions,
    };
  }
}
