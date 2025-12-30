import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

// Load .env from backend directory
dotenvConfig({
  path: resolve(__dirname, "../.env"),
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:3002",
    credentials: true,
  });

  app.setGlobalPrefix("api");
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3003);

  console.log(
    `🚀 Backend running on http://localhost:${process.env.PORT || 3003}/api`
  );
}

bootstrap();
