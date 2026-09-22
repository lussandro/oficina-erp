import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuditAction } from "@prisma/client";
import { Audit } from "../../common/decorators/audit.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { VehiclesService } from "./vehicles.service";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import { ListVehiclesQuery } from "./dto/list-vehicles.query";

@ApiTags("vehicles")
@ApiBearerAuth()
@Controller("vehicles")
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @Permissions(PERMISSIONS.VEHICLE_READ)
  findAll(@Query() query: ListVehiclesQuery) {
    return this.vehiclesService.findAll(query);
  }

  @Get(":id")
  @Permissions(PERMISSIONS.VEHICLE_READ)
  findOne(@Param("id") id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Get(":id/history")
  @Permissions(PERMISSIONS.VEHICLE_READ)
  findHistory(@Param("id") id: string) {
    return this.vehiclesService.findHistory(id);
  }

  @Post()
  @Permissions(PERMISSIONS.VEHICLE_CREATE)
  @Audit("vehicle", AuditAction.CREATE)
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  @Patch(":id")
  @Permissions(PERMISSIONS.VEHICLE_UPDATE)
  @Audit("vehicle", AuditAction.UPDATE)
  update(@Param("id") id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(PERMISSIONS.VEHICLE_MANAGE)
  @Audit("vehicle", AuditAction.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string): Promise<void> {
    await this.vehiclesService.remove(id);
  }
}
