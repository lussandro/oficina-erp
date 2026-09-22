import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { StockMovementType } from "@prisma/client";
import { IsEnum, IsInt, IsNumberString, IsOptional, IsString, IsUUID, Min } from "class-validator";

/** Tipos que `POST /stock/movements` aceita. `AJUSTE` tem rota própria porque
 *  não é entrada nem saída de mercadoria: é correção de saldo, outra permissão
 *  (`stock:adjust`) e outro formato (`targetQty`, não `quantity`). */
export const MOVEMENT_TYPES = [
  StockMovementType.ENTRADA,
  StockMovementType.SAIDA,
  StockMovementType.DEVOLUCAO,
  StockMovementType.CONSUMO,
] as const;

export class CreateMovementDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ enum: MOVEMENT_TYPES })
  @IsEnum(MOVEMENT_TYPES)
  type: (typeof MOVEMENT_TYPES)[number];

  @ApiProperty({ minimum: 1, description: "Sempre positivo; o tipo define o sinal." })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Custo unitário em string, ex.: "12.50"' })
  @IsOptional()
  @IsNumberString()
  unitCost?: string;

  @ApiPropertyOptional({ description: "Motivo/origem legível, ex.: NF 1234" })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: "Documento de origem (NF, pedido)" })
  @IsOptional()
  @IsString()
  documentRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceOrderId?: string;
}
