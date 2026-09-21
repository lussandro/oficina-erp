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
import { SuppliersService } from "./suppliers.service";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";
import { ListSuppliersQuery } from "./dto/list-suppliers.query";

@ApiTags("suppliers")
@ApiBearerAuth()
@Controller("suppliers")
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @Permissions(PERMISSIONS.SUPPLIER_READ)
  findAll(@Query() query: ListSuppliersQuery) {
    return this.suppliersService.findAll(query);
  }

  @Get(":id")
  @Permissions(PERMISSIONS.SUPPLIER_READ)
  findOne(@Param("id") id: string) {
    return this.suppliersService.findOne(id);
  }

  @Get(":id/products")
  @Permissions(PERMISSIONS.SUPPLIER_READ)
  findProducts(@Param("id") id: string) {
    return this.suppliersService.findProducts(id);
  }

  @Post()
  @Permissions(PERMISSIONS.SUPPLIER_CREATE)
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Patch(":id")
  @Permissions(PERMISSIONS.SUPPLIER_UPDATE)
  update(@Param("id") id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(PERMISSIONS.SUPPLIER_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string): Promise<void> {
    await this.suppliersService.remove(id);
  }
}
