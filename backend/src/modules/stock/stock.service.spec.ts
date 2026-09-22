import {
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { StockMovementType } from "@prisma/client";
import { StockService } from "./stock.service";

/** Transação falsa: `$queryRaw` do lock devolve o saldo dado, e os writes
 *  ficam registrados para inspeção. */
function makePrisma(stockQty: number | null = 10) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue(
      stockQty === null
        ? []
        : [{ id: "p1", stockQty, deletedAt: null }],
    ),
    stockMovement: { create: jest.fn((args: any) => args.data) },
    product: { update: jest.fn((args: any) => args) },
  };
  return {
    tx,
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
}

describe("StockService.createMovement", () => {
  it("ENTRADA soma e grava o saldo resultante no produto", async () => {
    const prisma = makePrisma(10);
    const service = new StockService(prisma as any);

    await service.createMovement(
      { productId: "p1", type: StockMovementType.ENTRADA, quantity: 5 } as any,
      "u1",
    );

    expect(prisma.tx.stockMovement.create.mock.calls[0][0].data.quantity).toBe(5);
    expect(prisma.tx.stockMovement.create.mock.calls[0][0].data.resultingQty).toBe(15);
    expect(prisma.tx.product.update.mock.calls[0][0].data).toEqual({ stockQty: 15 });
  });

  it("SAIDA subtrai: quantity negativo, resultado 10 - 4 = 6", async () => {
    const prisma = makePrisma(10);
    const service = new StockService(prisma as any);

    await service.createMovement(
      { productId: "p1", type: StockMovementType.SAIDA, quantity: 4 } as any,
      "u1",
    );

    expect(prisma.tx.stockMovement.create.mock.calls[0][0].data.quantity).toBe(-4);
    expect(prisma.tx.stockMovement.create.mock.calls[0][0].data.resultingQty).toBe(6);
  });

  it("recusa saída maior que o saldo, sem escrever nada", async () => {
    const prisma = makePrisma(3);
    const service = new StockService(prisma as any);

    await expect(
      service.createMovement(
        { productId: "p1", type: StockMovementType.SAIDA, quantity: 4 } as any,
        "u1",
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.tx.stockMovement.create).not.toHaveBeenCalled();
    expect(prisma.tx.product.update).not.toHaveBeenCalled();
  });

  it("DEVOLUCAO exige reason — movimento sem motivo não é auditável", async () => {
    const prisma = makePrisma(10);
    const service = new StockService(prisma as any);

    await expect(
      service.createMovement(
        { productId: "p1", type: StockMovementType.DEVOLUCAO, quantity: 1 } as any,
        "u1",
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("propaga 404 de produto inexistente/soft-deleted", async () => {
    const prisma = makePrisma(null);
    const service = new StockService(prisma as any);

    await expect(
      service.createMovement(
        { productId: "x", type: StockMovementType.ENTRADA, quantity: 1 } as any,
        "u1",
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("StockService.createAdjustment", () => {
  it("grava o delta contado, não o alvo, e move o saldo até o alvo", async () => {
    const prisma = makePrisma(10);
    const service = new StockService(prisma as any);

    await service.createAdjustment(
      { productId: "p1", targetQty: 7, reason: "contagem" } as any,
      "u1",
    );

    const data = prisma.tx.stockMovement.create.mock.calls[0][0].data;
    expect(data.type).toBe(StockMovementType.AJUSTE);
    expect(data.quantity).toBe(-3);
    expect(data.resultingQty).toBe(7);
    expect(prisma.tx.product.update.mock.calls[0][0].data).toEqual({ stockQty: 7 });
  });

  it("ajuste para o saldo que já está lá não gera movimento", async () => {
    const prisma = makePrisma(7);
    const service = new StockService(prisma as any);

    await expect(
      service.createAdjustment(
        { productId: "p1", targetQty: 7, reason: "contagem" } as any,
        "u1",
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.tx.stockMovement.create).not.toHaveBeenCalled();
  });
});
