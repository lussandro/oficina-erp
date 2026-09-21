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
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { ServiceCategoriesService } from "./service-categories.service";
import { CreateServiceCategoryDto } from "./dto/create-service-category.dto";
import { UpdateServiceCategoryDto } from "./dto/update-service-category.dto";

@ApiTags("service-categories")
@ApiBearerAuth()
@Controller("service-categories")
export class ServiceCategoriesController {
  constructor(
    private readonly serviceCategoriesService: ServiceCategoriesService,
  ) {}

  @Get()
  @Permissions(PERMISSIONS.SERVICE_READ)
  findAll() {
    return this.serviceCategoriesService.findAll();
  }

  @Get(":id")
  @Permissions(PERMISSIONS.SERVICE_READ)
  findOne(@Param("id") id: string) {
    return this.serviceCategoriesService.findOne(id);
  }

  @Post()
  @Permissions(PERMISSIONS.SERVICE_CREATE)
  create(@Body() dto: CreateServiceCategoryDto) {
    return this.serviceCategoriesService.create(dto);
  }

  @Patch(":id")
  @Permissions(PERMISSIONS.SERVICE_UPDATE)
  update(@Param("id") id: string, @Body() dto: UpdateServiceCategoryDto) {
    return this.serviceCategoriesService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(PERMISSIONS.SERVICE_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string): Promise<void> {
    await this.serviceCategoriesService.remove(id);
  }
}
