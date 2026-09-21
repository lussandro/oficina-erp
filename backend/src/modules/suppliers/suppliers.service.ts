import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";
import { ListSuppliersQuery } from "./dto/list-suppliers.query";

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSupplierDto) {
    try {
      return await this.prisma.supplier.create({ data: dto });
    } catch (err) {
      throw toDocumentConflict(err);
    }
  }

  async findAll(query: ListSuppliersQuery) {
    const where: Prisma.SupplierWhereInput = {
      deletedAt: null,
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { tradeName: { contains: query.q, mode: "insensitive" } },
              { document: { contains: query.q.replace(/\D/g, "") } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.supplier.count({ where }),
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
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
    });
    if (!supplier) {
      throw new NotFoundException("Fornecedor não encontrado");
    }
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);
    try {
      return await this.prisma.supplier.update({ where: { id }, data: dto });
    } catch (err) {
      throw toDocumentConflict(err);
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }

  /// Vínculo fornecedor → produtos: o produto é quem guarda `supplierId`
  /// (Épico 6), então a leitura vem por aqui e a escrita é
  /// `PATCH /products/:id` com `supplierId`.
  async findProducts(id: string) {
    await this.findOne(id);
    return this.prisma.product.findMany({
      where: { supplierId: id, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }
}

function toDocumentConflict(err: unknown): unknown {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    return new UnprocessableEntityException({
      message: "CNPJ já cadastrado para outro fornecedor",
      details: { field: "document" },
    });
  }
  return err;
}
