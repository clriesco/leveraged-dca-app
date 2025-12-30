import { Controller, Get } from "@nestjs/common";

import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  healthCheck() {
    return this.appService.getStatus();
  }

  @Get("health")
  health() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
