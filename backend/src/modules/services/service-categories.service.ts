import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateServiceCategoryDto } from "./dto/create-service-category.dto";
import { UpdateServiceCategoryDto } from "./dto/update-service-category.dto";

@Injectable()
export class ServiceCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.serviceCategory.findMany({ orderBy: { name: "asc" } });
  }

  async findOne(id: string) {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException("Categoria de serviço não encontrada");
    }
    return category;
  }

  async create(dto: CreateServiceCategoryDto) {
    try {
      return await this.prisma.serviceCategory.create({
        data: { name: dto.name },
      });
    } catch (err) {
      throw toNameConflict(err);
    }
  }

  async update(id: string, dto: UpdateServiceCategoryDto) {
    await this.findOne(id);
    try {
      return await this.prisma.serviceCategory.update({
        where: { id },
        data: { ...(dto.name !== undefined ? { name: dto.name } : {}) },
      });
    } catch (err) {
      throw toNameConflict(err);
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    // Sem soft-delete no schema para esta tabela: apagar desvincula os
    // serviços da categoria (onDelete: SetNull), não apaga o serviço.
    await this.prisma.serviceCategory.delete({ where: { id } });
  }
}

function toNameConflict(err: unknown): unknown {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    return new UnprocessableEntityException({
      message: "Já existe uma categoria com este nome",
      details: { field: "name" },
    });
  }
  return err;
}
