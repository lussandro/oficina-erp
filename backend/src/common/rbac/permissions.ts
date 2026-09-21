import { Role } from "@prisma/client";

// Permissões nomeadas `<recurso>:<ação>` (ADR-0003, ARCHITECTURE.md §5).
// Mapa perfil → permissões vive aqui, em código versionado: mudar requer PR e review.
// Cada épico soma as permissões do seu módulo a este arquivo.
export const PERMISSIONS = {
  USER_READ: "user:read",
  USER_CREATE: "user:create",
  USER_UPDATE: "user:update",
  USER_MANAGE: "user:manage",
  CUSTOMER_READ: "customer:read",
  CUSTOMER_CREATE: "customer:create",
  CUSTOMER_UPDATE: "customer:update",
  CUSTOMER_MANAGE: "customer:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const CUSTOMER_FULL = [
  PERMISSIONS.CUSTOMER_READ,
  PERMISSIONS.CUSTOMER_CREATE,
  PERMISSIONS.CUSTOMER_UPDATE,
  PERMISSIONS.CUSTOMER_MANAGE,
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_MANAGE,
    ...CUSTOMER_FULL,
  ],
  // ARCHITECTURE.md §5: GERENTE tem operação completa (exceto gestão de usuários).
  [Role.GERENTE]: [PERMISSIONS.USER_READ, ...CUSTOMER_FULL],
  // ARCHITECTURE.md §5: clientes são escopo do ATENDENTE.
  [Role.ATENDENTE]: [...CUSTOMER_FULL],
  [Role.MECANICO]: [],
};

export function permissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role];
}
