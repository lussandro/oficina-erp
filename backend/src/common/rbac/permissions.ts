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
  // Catálogo de serviços (/services, /service-categories) — Épico 5.
  SERVICE_READ: "service:read",
  SERVICE_CREATE: "service:create",
  SERVICE_UPDATE: "service:update",
  SERVICE_MANAGE: "service:manage",
  // Produtos e peças (/products, /product-categories) — Épico 6.
  PRODUCT_READ: "product:read",
  PRODUCT_CREATE: "product:create",
  PRODUCT_UPDATE: "product:update",
  PRODUCT_MANAGE: "product:manage",
  PRODUCT_CATEGORY_READ: "productcategory:read",
  PRODUCT_CATEGORY_CREATE: "productcategory:create",
  PRODUCT_CATEGORY_UPDATE: "productcategory:update",
  PRODUCT_CATEGORY_MANAGE: "productcategory:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const CUSTOMER_FULL = [
  PERMISSIONS.CUSTOMER_READ,
  PERMISSIONS.CUSTOMER_CREATE,
  PERMISSIONS.CUSTOMER_UPDATE,
  PERMISSIONS.CUSTOMER_MANAGE,
];

const SERVICE_FULL = [
  PERMISSIONS.SERVICE_READ,
  PERMISSIONS.SERVICE_CREATE,
  PERMISSIONS.SERVICE_UPDATE,
  PERMISSIONS.SERVICE_MANAGE,
];

const PRODUCT_FULL = [
  PERMISSIONS.PRODUCT_READ,
  PERMISSIONS.PRODUCT_CREATE,
  PERMISSIONS.PRODUCT_UPDATE,
  PERMISSIONS.PRODUCT_MANAGE,
  PERMISSIONS.PRODUCT_CATEGORY_READ,
  PERMISSIONS.PRODUCT_CATEGORY_CREATE,
  PERMISSIONS.PRODUCT_CATEGORY_UPDATE,
  PERMISSIONS.PRODUCT_CATEGORY_MANAGE,
];

// Peças/produtos: toda a equipe consulta (orçamento, OS, balcão); só
// ADMIN/GERENTE cadastra e ajusta o catálogo (custo é dado sensível).
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_MANAGE,
    ...CUSTOMER_FULL,
    ...SERVICE_FULL,
    ...PRODUCT_FULL,
  ],
  // ARCHITECTURE.md §5: GERENTE tem operação completa (exceto gestão de usuários).
  [Role.GERENTE]: [
    PERMISSIONS.USER_READ,
    ...CUSTOMER_FULL,
    ...SERVICE_FULL,
    ...PRODUCT_FULL,
  ],
  // ARCHITECTURE.md §5: clientes são escopo do ATENDENTE.
  [Role.ATENDENTE]: [
    ...CUSTOMER_FULL,
    // Abre orçamento/OS: precisa ver o catálogo, não editá-lo.
    PERMISSIONS.SERVICE_READ,
    // Consulta produtos/peças para orçamento/OS.
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.PRODUCT_CATEGORY_READ,
  ],
  [Role.MECANICO]: [
    PERMISSIONS.SERVICE_READ,
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.PRODUCT_CATEGORY_READ,
  ],
};

export function permissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role];
}
