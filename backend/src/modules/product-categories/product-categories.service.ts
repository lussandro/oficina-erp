import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateProductCategoryDto } from "./dto/create-product-category.dto";
import { UpdateProductCategoryDto } from "./dto/update-product-category.dto";
import { ListProductCategoriesQuery } from "./dto/list-product-categories.query";

@Injectable()
export class ProductCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductCategoryDto) {
    try {
      return await this.prisma.productCategory.create({ data: dto });
    } catch (err) {
      throw toNameConflict(err);
    }
  }

  async findAll(query: ListProductCategoriesQuery) {
    const where: Prisma.ProductCategoryWhereInput = query.q
      ? { name: { contains: query.q, mode: "insensitive" } }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.productCategory.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { name: "asc" },
      }),
      this.prisma.productCategory.count({ where }),
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
    const category = await this.prisma.productCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException("Categoria de produto não encontrada");
    }
    return category;
  }

  async update(id: string, dto: UpdateProductCategoryDto) {
    await this.findOne(id);
    try {
      return await this.prisma.productCategory.update({
        where: { id },
        data: dto,
      });
    } catch (err) {
      throw toNameConflict(err);
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    // onDelete: SetNull no schema — produtos ficam sem categoria, não bloqueiam a exclusão.
    await this.prisma.productCategory.delete({ where: { id } });
  }
}

function toNameConflict(err: unknown): unknown {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    return new UnprocessableEntityException({
      message: "Categoria já cadastrada com este nome",
      details: { field: "name" },
    });
  }
  return err;
}
