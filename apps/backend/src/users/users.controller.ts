import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UsersService } from "./users.service";

/**
 * Controller for user profile management
 */
@Controller("users")
@UseGuards(AuthGuard)
export class UsersController {
  constructor(
    private usersService: UsersService
  ) {}

  /**
   * Get current user profile
   * GET /api/users/profile
   */
  @Get("profile")
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  /**
   * Update current user profile
   * PUT /api/users/profile
   */
  @Put("profile")
  async updateProfile(
    @CurrentUser() user: any,
    @Body() data: UpdateProfileDto
  ) {
    return this.usersService.updateProfile(user.id, data);
  }
}

