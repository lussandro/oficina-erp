import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import { ListVehiclesQuery } from "./dto/list-vehicles.query";

// Campos únicos do veículo e a mensagem certa para cada um: o P2002 do Prisma
// não diz qual constraint caiu, só o nome do índice (`vehicles_plate_key`).
const UNIQUE_FIELDS: Record<string, { message: string; field: string }> = {
  plate: { message: "Placa já cadastrada para outro veículo", field: "plate" },
  vin: { message: "Chassi já cadastrado para outro veículo", field: "vin" },
};

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVehicleDto) {
    // O veículo é do cliente: sem cliente existente o vínculo nasce órfão.
    await this.assertCustomerExists(dto.customerId);
    try {
      return await this.prisma.vehicle.create({ data: dto });
    } catch (err) {
      throw toVehicleConflict(err);
    }
  }

  async findAll(query: ListVehiclesQuery) {
    const where: Prisma.VehicleWhereInput = {
      deletedAt: null,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.plate ? { plate: query.plate } : {}),
      ...(query.q
        ? {
            OR: [
              { plate: { contains: query.q.toUpperCase(), mode: "insensitive" } },
              { brand: { contains: query.q, mode: "insensitive" } },
              { model: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
        },
      }),
      this.prisma.vehicle.count({ where }),
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
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
    });
    if (!vehicle) {
      throw new NotFoundException("Veículo não encontrado");
    }
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findOne(id);
    if (dto.customerId) {
      await this.assertCustomerExists(dto.customerId);
    }
    try {
      return await this.prisma.vehicle.update({ where: { id }, data: dto });
    } catch (err) {
      throw toVehicleConflict(err);
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.vehicle.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /// Histórico do veículo: as OS e os orçamentos em que ele entrou, do mais
  /// recente para o mais antigo. `deletedAt` filtra dos dois lados — OS
  /// cancelada continua no histórico (tem `status`), apagada não.
  async findHistory(id: string) {
    await this.findOne(id);
    const [serviceOrders, quotes] = await this.prisma.$transaction([
      this.prisma.serviceOrder.findMany({
        where: { vehicleId: id, deletedAt: null },
        orderBy: { entryAt: "desc" },
      }),
      this.prisma.quote.findMany({
        where: { vehicleId: id, deletedAt: null },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return { vehicleId: id, serviceOrders, quotes };
  }

  private async assertCustomerExists(customerId: string): Promise<void> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) {
      throw new UnprocessableEntityException({
        message: "Cliente não encontrado",
        details: { field: "customerId" },
      });
    }
  }
}

function toVehicleConflict(err: unknown): unknown {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    const target = err.meta?.target;
    const field = Array.isArray(target) ? String(target[0]) : undefined;
    const known = field ? UNIQUE_FIELDS[field] : undefined;
    return new UnprocessableEntityException({
      message: known?.message ?? "Veículo já cadastrado",
      details: { field: known?.field ?? field },
    });
  }
  // P2003: FK inexistente (cliente apagado entre a checagem e o insert).
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2003"
  ) {
    return new UnprocessableEntityException({
      message: "Cliente não encontrado",
      details: { field: "customerId" },
    });
  }
  return err;
}
