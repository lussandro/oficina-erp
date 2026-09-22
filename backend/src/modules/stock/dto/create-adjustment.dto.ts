import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsString, IsUUID, Min, MinLength } from "class-validator";

/**
 * Ajuste informa o **saldo alvo**, não a diferença: quem conta a prateleira
 * sabe que tem 7, não quanto o sistema achava que tinha. O service calcula
 * `quantity` e `resultingQty` a partir daí — assim o frontend não precisa ler
 * o saldo atual para acertar a conta.
 */
export class CreateAdjustmentDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ minimum: 0, description: "Saldo real contado, após o ajuste." })
  @IsInt()
  @Min(0)
  targetQty: number;

  @ApiProperty({ description: "Por que o saldo divergiu. Obrigatório: ajuste sem motivo é buraco na auditoria." })
  @IsString()
  @MinLength(3)
  reason: string;
}
