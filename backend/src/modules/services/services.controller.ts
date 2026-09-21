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
import { Permissions } from "../../common/decorators/permissions.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { ServicesService } from "./services.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { ListServicesQuery } from "./dto/list-services.query";

@ApiTags("services")
@ApiBearerAuth()
@Controller("services")
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @Permissions(PERMISSIONS.SERVICE_READ)
  findAll(@Query() query: ListServicesQuery) {
    return this.servicesService.findAll(query);
  }

  @Get(":id")
  @Permissions(PERMISSIONS.SERVICE_READ)
  findOne(@Param("id") id: string) {
    return this.servicesService.findOne(id);
  }

  @Post()
  @Permissions(PERMISSIONS.SERVICE_CREATE)
  create(@Body() dto: CreateServiceDto) {
    return this.servicesService.create(dto);
  }

  @Patch(":id")
  @Permissions(PERMISSIONS.SERVICE_UPDATE)
  update(@Param("id") id: string, @Body() dto: UpdateServiceDto) {
    return this.servicesService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(PERMISSIONS.SERVICE_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string): Promise<void> {
    await this.servicesService.remove(id);
  }
}
