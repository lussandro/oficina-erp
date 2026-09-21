import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

// Rota sem JwtAuthGuard. Usar só em auth/login, auth/refresh, auth/forgot-password, auth/reset-password.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
