import { Controller, Delete, Get, Param, Query } from '@nestjs/common'

import { OnlineService } from './online.service'

@Controller('monitor/online')
export class OnlineController {
  constructor(private readonly onlineService: OnlineService) {}

  @Get('list')
  list(@Query() query: Record<string, unknown>) {
    return this.onlineService.list(query)
  }

  @Delete(':tokenId')
  forceLogout(@Param('tokenId') tokenId: string) {
    return this.onlineService.forceLogout(tokenId)
  }
}
