import { Module, Global } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/**
 * Global Prisma module that provides database access across the application
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
