import { PartialType } from "@nestjs/swagger";
import { CreateVehicleDto } from "./create-vehicle.dto";

// PATCH é atualização parcial (docs/API.md §Métodos): todo campo vira opcional,
// mantendo as mesmas validações e normalizações do create.
export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}
