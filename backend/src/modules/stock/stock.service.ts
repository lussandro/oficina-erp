import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma, StockMovementType } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateMovementDto } from "./dto/create-movement.dto";
import { CreateAdjustmentDto } from "./dto/create-adjustment.dto";
import { ListMovementsQuery } from "./dto/list-movements.query";
import { ListLowStockQuery } from "./dto/list-low-stock.query";

/** Sinal de cada tipo sobre o saldo. `AJUSTE` não está aqui: o alvo é dado
 *  pelo usuário, não o delta. */
const SIGN: Record<StockMovementType, 1 | -1 | 0> = {
  ENTRADA: 1,
  DEVOLUCAO: 1,
  SAIDA: -1,
  CONSUMO: -1,
  AJUSTE: 0,
};

/** Tipos que exigem origem declarada — sem motivo, o movimento não é auditável. */
const REASON_REQUIRED: StockMovementType[] = [
  StockMovementType.AJUSTE,
  StockMovementType.DEVOLUCAO,
];

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra um movimento e reescreve `Product.stockQty` na **mesma transação**.
   *
   * `stockQty` é derivado da série de movimentos (docs/DATABASE.md §5.3), então
   * ele nunca é escrito sem o movimento que o justifica. O `SELECT ... FOR UPDATE`
   * serializa movimentos concorrentes do mesmo produto: sem ele, duas saídas
   * simultâneas leem o mesmo saldo e uma sobrescreve a outra.
   */
  async createMovement(dto: CreateMovementDto, userId: string) {
    if (REASON_REQUIRED.includes(dto.type) && !dto.reason) {
      throw new UnprocessableEntityException({
        message: `Movimento do tipo ${dto.type} exige reason`,
        details: { field: "reason" },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await lockProduct(tx, dto.productId);
      const resultingQty = product.stockQty + SIGN[dto.type] * dto.quantity;

      if (resultingQty < 0) {
        throw new UnprocessableEntityException({
          message: `Saldo insuficiente: ${product.stockQty} em estoque, ${dto.quantity} solicitado(s)`,
          details: {
            field: "quantity",
            stockQty: product.stockQty,
            requested: dto.quantity,
          },
        });
      }

      return this.persist(tx, {
        ...dto,
        quantity: SIGN[dto.type] * dto.quantity,
        resultingQty,
        createdById: userId,
      });
    });
  }

  /**
   * Ajuste informa o saldo contado; o delta e o motivo ficam registrados como
   * movimento `AJUSTE`. Ajustar para o valor que já está lá não gera movimento —
   * registro de delta zero só polui a auditoria.
   */
  async createAdjustment(dto: CreateAdjustmentDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const product = await lockProduct(tx, dto.productId);
      const delta = dto.targetQty - product.stockQty;

      if (delta === 0) {
        throw new UnprocessableEntityException({
          message: `Saldo já é ${dto.targetQty}; nada a ajustar`,
          details: { field: "targetQty", stockQty: product.stockQty },
        });
      }

      return this.persist(tx, {
        type: StockMovementType.AJUSTE,
        productId: dto.productId,
        quantity: delta,
        resultingQty: dto.targetQty,
        reason: dto.reason,
        createdById: userId,
      });
    });
  }

  async findAll(query: ListMovementsQuery) {
    const where: Prisma.StockMovementWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.serviceOrderId ? { serviceOrderId: query.serviceOrderId } : {}),
      ...(query.createdById ? { createdById: query.createdById } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { id: true, sku: true, name: true, unit: true } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
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

  /** Produtos ativos com saldo no limite ou abaixo. `minStockQty = 0` (padrão
   *  de quem nunca configurou mínimo) fica de fora: senão o relatório inteiro
   *  vira ruído de item zerado sem mínimo definido. */
  async findLowStock(query: ListLowStockQuery) {
    // Comparação entre duas colunas (`stockQty <= minStockQty`): o Prisma não
    // expressa isso em `where` sem field reference, então as duas consultas
    // vão em SQL cru. Filtro de fornecedor entra como parâmetro, nunca
    // interpolado — Prisma.sql escapa o valor, `Prisma.raw` não escaparia.
    const supplier = query.supplierId
      ? Prisma.sql`AND p."supplierId" = ${query.supplierId}`
      : Prisma.empty;

    const [data, [{ total }]] = await this.prisma.$transaction([
      this.prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT p.*
        FROM products p
        WHERE p."deletedAt" IS NULL
          AND p.active
          AND p."minStockQty" > 0
          AND p."stockQty" <= p."minStockQty"
          ${supplier}
        ORDER BY (p."stockQty" - p."minStockQty") ASC, p.name ASC
        LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}
      `,
      this.prisma.$queryRaw<Array<{ total: number }>>`
        SELECT COUNT(*)::int AS total
        FROM products p
        WHERE p."deletedAt" IS NULL
          AND p.active
          AND p."minStockQty" > 0
          AND p."stockQty" <= p."minStockQty"
          ${supplier}
      `,
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

  private async persist(
    tx: Prisma.TransactionClient,
    data: {
      type: StockMovementType;
      productId: string;
      quantity: number;
      resultingQty: number;
      unitCost?: string;
      reason?: string;
      documentRef?: string;
      supplierId?: string;
      serviceOrderId?: string;
      createdById: string;
    },
  ) {
    const movement = await tx.stockMovement.create({
      data: {
        type: data.type,
        productId: data.productId,
        quantity: data.quantity,
        resultingQty: data.resultingQty,
        unitCost: data.unitCost,
        reason: data.reason,
        documentRef: data.documentRef,
        supplierId: data.supplierId,
        serviceOrderId: data.serviceOrderId,
        createdById: data.createdById,
      },
    });

    await tx.product.update({
      where: { id: data.productId },
      data: { stockQty: data.resultingQty },
    });

    return movement;
  }
}

/** Trava a linha do produto até o fim da transação. */
async function lockProduct(tx: Prisma.TransactionClient, id: string) {
  const [product] = await tx.$queryRaw<
    Array<{ id: string; stockQty: number; deletedAt: Date | null }>
  >`SELECT id, "stockQty", "deletedAt" FROM products WHERE id = ${id} FOR UPDATE`;

  if (!product || product.deletedAt) {
    throw new NotFoundException("Produto não encontrado");
  }
  return product;
}
