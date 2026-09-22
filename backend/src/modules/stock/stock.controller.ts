import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { StockService } from "./stock.service";
import { CreateMovementDto } from "./dto/create-movement.dto";
import { CreateAdjustmentDto } from "./dto/create-adjustment.dto";
import { ListMovementsQuery } from "./dto/list-movements.query";
import { ListLowStockQuery } from "./dto/list-low-stock.query";

@ApiTags("stock")
@ApiBearerAuth()
@Controller("stock")
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get("movements")
  @Permissions(PERMISSIONS.STOCK_READ)
  findMovements(@Query() query: ListMovementsQuery) {
    return this.stockService.findAll(query);
  }

  @Get("low")
  @Permissions(PERMISSIONS.STOCK_READ)
  findLowStock(@Query() query: ListLowStockQuery) {
    return this.stockService.findLowStock(query);
  }

  @Post("movements")
  @Permissions(PERMISSIONS.STOCK_WRITE)
  createMovement(
    @Body() dto: CreateMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stockService.createMovement(dto, user.id);
  }

  // Permissão própria: ajuste é o único movimento que pode inventar saldo sem
  // origem externa que o justifique (docs/API.md §Estoque).
  @Post("adjustments")
  @Permissions(PERMISSIONS.STOCK_ADJUST)
  createAdjustment(
    @Body() dto: CreateAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stockService.createAdjustment(dto, user.id);
  }
}
