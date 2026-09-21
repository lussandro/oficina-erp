import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "./permissions.guard";
import { PERMISSIONS } from "../rbac/permissions";

function contextWithUser(permissions: string[] | undefined): ExecutionContext {
  return {
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: permissions ? { permissions } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe("PermissionsGuard", () => {
  it("libera quando a rota não exige permissão", () => {
    const reflector = {
      getAllAndOverride: () => undefined,
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(contextWithUser(undefined))).toBe(true);
  });

  it("libera quando o usuário tem todas as permissões exigidas", () => {
    const reflector = {
      getAllAndOverride: () => [PERMISSIONS.USER_READ],
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(contextWithUser([PERMISSIONS.USER_READ]))).toBe(
      true,
    );
  });

  it("nega (403) quando falta permissão", () => {
    const reflector = {
      getAllAndOverride: () => [PERMISSIONS.USER_MANAGE],
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(() =>
      guard.canActivate(contextWithUser([PERMISSIONS.USER_READ])),
    ).toThrow(ForbiddenException);
  });
});
