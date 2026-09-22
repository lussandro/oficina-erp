import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as argon2 from "argon2";
import { PrismaService } from "../../common/prisma/prisma.service";
import { permissionsForRole } from "../../common/rbac/permissions";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ListUsersQuery } from "./dto/list-users.query";
import { UpdateProfileDto } from "../auth/dto/update-profile.dto";

// Exportado para o AuditInterceptor (BAC-73) — o `before` do audit_logs não pode
// carregar passwordHash, e a lista de campos públicos tem uma fonte só: esta.
export const PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const passwordHash = await argon2.hash(dto.password);
    try {
      return await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email.toLowerCase(),
          passwordHash,
          role: dto.role,
          phone: dto.phone,
        },
        select: PUBLIC_SELECT,
      });
    } catch (err) {
      throw toEmailConflict(err);
    }
  }

  async findAll(query: ListUsersQuery) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.role ? { role: query.role } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { email: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: PUBLIC_SELECT,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
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
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: PUBLIC_SELECT,
    });
    if (!user) {
      throw new NotFoundException("Usuário não encontrado");
    }
    return user;
  }

  async findSelf(id: string) {
    const user = await this.findOne(id);
    return { ...user, permissions: permissionsForRole(user.role) };
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.email !== undefined
            ? { email: dto.email.toLowerCase() }
            : {}),
          ...(dto.role !== undefined ? { role: dto.role } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
        select: PUBLIC_SELECT,
      });
    } catch (err) {
      throw toEmailConflict(err);
    }
  }

  async updateSelf(id: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      },
      select: PUBLIC_SELECT,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }
}

function toEmailConflict(err: unknown): unknown {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    return new UnprocessableEntityException({
      message: "E-mail já cadastrado para outro usuário",
      details: { field: "email" },
    });
  }
  return err;
}
