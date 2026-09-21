import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { ListServicesQuery } from "./dto/list-services.query";

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServiceDto) {
    try {
      return await this.prisma.service.create({
        data: {
          name: dto.name,
          description: dto.description,
          price: dto.price,
          estimatedTime: dto.estimatedTime,
          categoryId: dto.categoryId,
        },
      });
    } catch (err) {
      throw toServiceConflict(err);
    }
  }

  async findAll(query: ListServicesQuery) {
    const where: Prisma.ServiceWhereInput = {
      deletedAt: null,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { description: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.service.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { name: "asc" },
      }),
      this.prisma.service.count({ where }),
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
    const service = await this.prisma.service.findFirst({
      where: { id, deletedAt: null },
    });
    if (!service) {
      throw new NotFoundException("Serviço não encontrado");
    }
    return service;
  }

  async update(id: string, dto: UpdateServiceDto) {
    await this.findOne(id);
    try {
      return await this.prisma.service.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.estimatedTime !== undefined
            ? { estimatedTime: dto.estimatedTime }
            : {}),
          ...(dto.categoryId !== undefined
            ? { categoryId: dto.categoryId }
            : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
      });
    } catch (err) {
      throw toServiceConflict(err);
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.service.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }
}

function toServiceConflict(err: unknown): unknown {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    return new UnprocessableEntityException({
      message: "Já existe um serviço com este nome",
      details: { field: "name" },
    });
  }
  return err;
}
