import {
  Controller,
  Post,
  Body,
  Get,
  Headers,
  UnauthorizedException,
} from "@nestjs/common";

import { AuthService } from "./auth.service";

/**
 * Authentication controller for passwordless login
 */
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Send magic link to user email
   * POST /api/auth/login
   */
  @Post("login")
  async login(@Body("email") email: string) {
    if (!email) {
      throw new UnauthorizedException("Email is required");
    }

    const result = await this.authService.sendMagicLink(email);

    if (!result.success) {
      throw new UnauthorizedException(result.error);
    }

    return {
      message: "Magic link sent to your email",
      email,
    };
  }

  /**
   * Verify current session
   * GET /api/auth/me
   */
  @Get("me")
  async me(@Headers("authorization") authHeader: string) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("No token provided");
    }

    const token = authHeader.substring(7);
    const user = await this.authService.verifySession(token);

    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    return {
      id: user.id,
      email: user.email,
    };
  }
}
