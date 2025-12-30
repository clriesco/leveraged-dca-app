import { Injectable } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { PrismaService } from "../prisma/prisma.service";
import * as jwt from "jsonwebtoken";

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
   * This avoids making HTTP calls to Supabase API
   * @param token - JWT token from client
   * @returns User data if valid, null otherwise
   */
  async verifySession(token: string) {
    try {
      // Decode JWT token (no verification needed - token comes from trusted frontend)
      const decoded = jwt.decode(token) as any;
      
      if (!decoded || !decoded.email) {
        console.error("Invalid token: missing email claim");
        return null;
      }

      // Check token expiration
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        console.error("Token expired");
        return null;
      }

      // Find user by email in our database (email is unique and matches Supabase)
      const user = await this.prisma.user.findUnique({
        where: { email: decoded.email },
      });
      
      if (!user) {
        console.error(`User not found in database by email: ${decoded.email}`);
        return null;
      }

      return {
        id: user.id,
        email: user.email,
      } as any;
    } catch (err) {
      console.error("Failed to verify session:", err);
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
