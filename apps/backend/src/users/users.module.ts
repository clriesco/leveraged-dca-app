import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";

import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

/**
 * Module for user profile management
 */
@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}


