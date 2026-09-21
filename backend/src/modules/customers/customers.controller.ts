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
import { CustomersService } from "./customers.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { ListCustomersQuery } from "./dto/list-customers.query";

@ApiTags("customers")
@ApiBearerAuth()
@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Permissions(PERMISSIONS.CUSTOMER_READ)
  findAll(@Query() query: ListCustomersQuery) {
    return this.customersService.findAll(query);
  }

  @Get(":id")
  @Permissions(PERMISSIONS.CUSTOMER_READ)
  findOne(@Param("id") id: string) {
    return this.customersService.findOne(id);
  }

  @Get(":id/vehicles")
  @Permissions(PERMISSIONS.CUSTOMER_READ)
  findVehicles(@Param("id") id: string) {
    return this.customersService.findVehicles(id);
  }

  @Get(":id/service-orders")
  @Permissions(PERMISSIONS.CUSTOMER_READ)
  findServiceOrders(@Param("id") id: string) {
    return this.customersService.findServiceOrders(id);
  }

  @Post()
  @Permissions(PERMISSIONS.CUSTOMER_CREATE)
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Patch(":id")
  @Permissions(PERMISSIONS.CUSTOMER_UPDATE)
  update(@Param("id") id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(PERMISSIONS.CUSTOMER_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string): Promise<void> {
    await this.customersService.remove(id);
  }
}
