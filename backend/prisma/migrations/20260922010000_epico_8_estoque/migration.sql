-- Épico 8: rastreabilidade de quem movimentou o estoque.
-- Faltava a FK: `createdById` existia desde o Épico 0 sem relação, e sem
-- o nome de quem registrou o movimento não há rastreabilidade de verdade.
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "stock_movements_createdById_idx" ON "stock_movements"("createdById");
