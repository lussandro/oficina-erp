import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ListProductsQuery } from "./dto/list-products.query";

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    try {
      return await this.prisma.product.create({
        data: {
          sku: dto.sku,
          barcode: dto.barcode,
          name: dto.name,
          description: dto.description,
          manufacturer: dto.manufacturer,
          costPrice: dto.costPrice ?? "0",
          salePrice: dto.salePrice,
          unit: dto.unit ?? "UN",
          stockQty: dto.stockQty ?? 0,
          minStockQty: dto.minStockQty ?? 0,
          location: dto.location,
          categoryId: dto.categoryId,
          supplierId: dto.supplierId,
        },
      });
    } catch (err) {
      throw toConflict(err);
    }
  }

  async findAll(query: ListProductsQuery) {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.q
        ? {
            OR: [
              { sku: { contains: query.q, mode: "insensitive" } },
              { name: { contains: query.q, mode: "insensitive" } },
              { barcode: { contains: query.q, mode: "insensitive" } },
              { manufacturer: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException("Produto não encontrado");
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
          ...(dto.barcode !== undefined ? { barcode: dto.barcode } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.manufacturer !== undefined
            ? { manufacturer: dto.manufacturer }
            : {}),
          ...(dto.costPrice !== undefined ? { costPrice: dto.costPrice } : {}),
          ...(dto.salePrice !== undefined ? { salePrice: dto.salePrice } : {}),
          ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
          ...(dto.stockQty !== undefined ? { stockQty: dto.stockQty } : {}),
          ...(dto.minStockQty !== undefined
            ? { minStockQty: dto.minStockQty }
            : {}),
          ...(dto.location !== undefined ? { location: dto.location } : {}),
          ...(dto.categoryId !== undefined
            ? { categoryId: dto.categoryId }
            : {}),
          ...(dto.supplierId !== undefined
            ? { supplierId: dto.supplierId }
            : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
      });
    } catch (err) {
      throw toConflict(err);
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }
}

function toConflict(err: unknown): unknown {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    const field = Array.isArray(err.meta?.target)
      ? (err.meta?.target as string[])[0]
      : "sku";
    return new UnprocessableEntityException({
      message:
        field === "barcode"
          ? "Código de barras já cadastrado para outro produto"
          : "SKU já cadastrado para outro produto",
      details: { field },
    });
  }
  return err;
}
