import { Controller, Get } from '@nestjs/common'

import { ServerService } from './server.service'

@Controller('monitor/server')
export class ServerController {
  constructor(private readonly serverService: ServerService) {}

  @Get()
  getServer() {
    return this.serverService.getServer()
  }
}
