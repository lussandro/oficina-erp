import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuditAction } from "@prisma/client";
import { Audit } from "../../common/decorators/audit.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ListUsersQuery } from "./dto/list-users.query";

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions(PERMISSIONS.USER_READ)
  findAll(@Query() query: ListUsersQuery) {
    return this.usersService.findAll(query);
  }

  @Get(":id")
  @Permissions(PERMISSIONS.USER_READ)
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Permissions(PERMISSIONS.USER_CREATE)
  @Audit("user", AuditAction.CREATE)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(":id")
  @Permissions(PERMISSIONS.USER_UPDATE)
  @Audit("user", AuditAction.UPDATE)
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(PERMISSIONS.USER_MANAGE)
  @Audit("user", AuditAction.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}
