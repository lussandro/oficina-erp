import { Controller, Get } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";

// Fora do prefixo /api/v1 (main.ts exclui "health") — é o que o healthcheck
// do docker-compose.yml chama em http://localhost:3001/health.
@Public()
@Controller("health")
export class HealthController {
  @Get()
  check() {
    return { status: "ok" };
  }
}
