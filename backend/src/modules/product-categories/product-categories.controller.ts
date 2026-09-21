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
import { ProductCategoriesService } from "./product-categories.service";
import { CreateProductCategoryDto } from "./dto/create-product-category.dto";
import { UpdateProductCategoryDto } from "./dto/update-product-category.dto";
import { ListProductCategoriesQuery } from "./dto/list-product-categories.query";

@ApiTags("product-categories")
@ApiBearerAuth()
@Controller("product-categories")
export class ProductCategoriesController {
  constructor(
    private readonly productCategoriesService: ProductCategoriesService,
  ) {}

  @Get()
  @Permissions(PERMISSIONS.PRODUCT_CATEGORY_READ)
  findAll(@Query() query: ListProductCategoriesQuery) {
    return this.productCategoriesService.findAll(query);
  }

  @Get(":id")
  @Permissions(PERMISSIONS.PRODUCT_CATEGORY_READ)
  findOne(@Param("id") id: string) {
    return this.productCategoriesService.findOne(id);
  }

  @Post()
  @Permissions(PERMISSIONS.PRODUCT_CATEGORY_CREATE)
  create(@Body() dto: CreateProductCategoryDto) {
    return this.productCategoriesService.create(dto);
  }

  @Patch(":id")
  @Permissions(PERMISSIONS.PRODUCT_CATEGORY_UPDATE)
  update(@Param("id") id: string, @Body() dto: UpdateProductCategoryDto) {
    return this.productCategoriesService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(PERMISSIONS.PRODUCT_CATEGORY_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string): Promise<void> {
    await this.productCategoriesService.remove(id);
  }
}
