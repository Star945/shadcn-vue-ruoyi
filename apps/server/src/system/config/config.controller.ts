import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, StreamableFile } from '@nestjs/common'

import { ConfigService } from './config.service'

@Controller('system/config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get('list')
  list(@Query() query: Record<string, unknown>) {
    return this.configService.list(query)
  }

  @Get('export')
  async export(@Query() query: Record<string, unknown>, @Res({ passthrough: true }) response: any) {
    const file = await this.configService.export(query)
    response.setHeader('Content-Type', 'text/csv; charset=utf-8')
    response.setHeader('Content-Disposition', 'attachment; filename=' + file.fileName)
    return new StreamableFile(file.buffer)
  }

  @Delete('refreshCache')
  refreshCache() {
    return this.configService.refreshCache()
  }

  @Get(':configId')
  get(@Param('configId') configId: string) {
    return this.configService.get(Number(configId))
  }

  @Post()
  create(@Body() payload: Record<string, unknown>) {
    return this.configService.create(payload)
  }

  @Put()
  update(@Body() payload: Record<string, unknown>) {
    return this.configService.update(payload)
  }

  @Delete(':configId')
  remove(@Param('configId') configId: string) {
    return this.configService.remove(Number(configId))
  }
}