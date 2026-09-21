import { SetMetadata } from "@nestjs/common";
import { Permission } from "../rbac/permissions";

export const PERMISSIONS_KEY = "permissions";

export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
