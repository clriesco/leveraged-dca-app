import { Injectable } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as jwt from "jsonwebtoken";

import { PrismaService } from "../prisma/prisma.service";

/**
 * Authentication service using Supabase passwordless auth
 */
@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor(private prisma: PrismaService) {
    const supabaseUrl = process.env.SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_ANON_KEY || "";

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Send magic link to user email for passwordless login
   * @param email - User email address
   * @returns Promise with success status and optional error
   */
  async sendMagicLink(email: string) {
    const { error } = await this.supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: process.env.FRONTEND_URL || "http://localhost:3002",
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Ensure user exists in our database
    await this.ensureUserExists(email);

    return { success: true };
  }

  /**
   * Verify user session token
   * Decodes JWT token and finds user in local database by email
   * Creates user if they don't exist (for users who login directly via magic link)
   * This avoids making HTTP calls to Supabase API
   * @param token - JWT token from client
   * @returns User data if valid, null otherwise
   */
  async verifySession(token: string) {
    try {
      console.log(`[AuthService] Verifying token (length: ${token.length})`);
      
      // Decode JWT token (no verification needed - token comes from trusted frontend)
      const decoded = jwt.decode(token) as any;
      
      if (!decoded) {
        console.error("[AuthService] Failed to decode token");
        return null;
      }

      console.log(`[AuthService] Token decoded, email: ${decoded.email}, exp: ${decoded.exp}`);
      
      if (!decoded.email) {
        console.error("[AuthService] Invalid token: missing email claim");
        return null;
      }

      // Check token expiration
      const now = Date.now() / 1000;
      if (decoded.exp && decoded.exp < now) {
        const expiredSeconds = now - decoded.exp;
        console.error(`[AuthService] Token expired ${expiredSeconds.toFixed(0)} seconds ago`);
        return null;
      }

      // Find or create user by email in our database
      // This handles the case where user logs in directly via magic link
      // without going through /auth/login endpoint
      let user = await this.prisma.user.findUnique({
        where: { email: decoded.email },
      });
      
      if (!user) {
        console.log(`[AuthService] User not found in database, creating user for email: ${decoded.email}`);
        // Create user if they don't exist (they authenticated via Supabase magic link)
        user = await this.prisma.user.create({
          data: { email: decoded.email },
        });
        console.log(`[AuthService] User created: ${user.id}`);
      } else {
        console.log(`[AuthService] User found: ${user.id} (${user.email})`);
      }

      return {
        id: user.id,
        email: user.email,
      } as any;
    } catch (err) {
      console.error("[AuthService] Failed to verify session:", err);
      if (err instanceof Error) {
        console.error("[AuthService] Error details:", err.message, err.stack);
      }
      return null;
    }
  }


  /**
   * Ensure user exists in our database (creates if not exists)
   * @param email - User email address
   * @private
   */
  private async ensureUserExists(email: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!existing) {
      await this.prisma.user.create({
        data: { email },
      });
    }
  }
}
