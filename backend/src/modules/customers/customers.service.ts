import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { ListCustomersQuery } from "./dto/list-customers.query";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    try {
      return await this.prisma.customer.create({ data: dto });
    } catch (err) {
      throw toDocumentConflict(err);
    }
  }

  async findAll(query: ListCustomersQuery) {
    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { document: { contains: query.q.replace(/\D/g, "") } },
              { phone: { contains: query.q } },
              { phoneAlt: { contains: query.q } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.customer.count({ where }),
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
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundException("Cliente não encontrado");
    }
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    try {
      return await this.prisma.customer.update({ where: { id }, data: dto });
    } catch (err) {
      throw toDocumentConflict(err);
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }

  async findVehicles(id: string) {
    await this.findOne(id);
    return this.prisma.vehicle.findMany({
      where: { customerId: id, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  async findServiceOrders(id: string) {
    await this.findOne(id);
    return this.prisma.serviceOrder.findMany({
      where: { customerId: id, deletedAt: null },
      orderBy: { entryAt: "desc" },
    });
  }
}

function toDocumentConflict(err: unknown): unknown {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    return new UnprocessableEntityException({
      message: "CPF já cadastrado para outro cliente",
      details: { field: "document" },
    });
  }
  return err;
}
