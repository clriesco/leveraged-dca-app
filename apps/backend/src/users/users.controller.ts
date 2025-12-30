import {
  Controller,
  Get,
  Put,
  Body,
  Headers,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { AuthService } from "../auth/auth.service";

/**
 * Controller for user profile management
 */
@Controller("users")
export class UsersController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService
  ) {}

  /**
   * Get current user profile
   * GET /api/users/profile
   */
  @Get("profile")
  async getProfile(@Headers("authorization") authHeader: string) {
    const userId = await this.getUserIdFromHeader(authHeader);
    return this.usersService.getProfile(userId);
  }

  /**
   * Update current user profile
   * PUT /api/users/profile
   */
  @Put("profile")
  async updateProfile(
    @Headers("authorization") authHeader: string,
    @Body() data: UpdateProfileDto
  ) {
    const userId = await this.getUserIdFromHeader(authHeader);
    return this.usersService.updateProfile(userId, data);
  }

  /**
   * Helper to extract user ID from authorization header
   * @private
   */
  private async getUserIdFromHeader(
    authHeader: string | undefined
  ): Promise<string> {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("No token provided");
    }

    const token = authHeader.substring(7);
    const user = await this.authService.verifySession(token);

    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    return user.id;
  }
}

