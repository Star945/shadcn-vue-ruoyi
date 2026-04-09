import { Controller, Delete, Get, Param, Query, Res, StreamableFile } from '@nestjs/common'

import { LogininforService } from './logininfor.service'

@Controller('monitor/logininfor')
export class LogininforController {
  constructor(private readonly logininforService: LogininforService) {}

  @Get('list')
  list(@Query() query: Record<string, unknown>) {
    return this.logininforService.list(query)
  }

  @Get('unlock/:userName')
  unlock(@Param('userName') userName: string) {
    return this.logininforService.unlock(userName)
  }

  @Get('export')
  async export(@Query() query: Record<string, unknown>, @Res({ passthrough: true }) response: any) {
    const file = await this.logininforService.export(query)
    response.setHeader('Content-Type', 'text/csv; charset=utf-8')
    response.setHeader('Content-Disposition', 'attachment; filename=' + file.fileName)
    return new StreamableFile(file.buffer)
  }

  @Delete('clean')
  clean() {
    return this.logininforService.clean()
  }

  @Delete(':infoId')
  remove(@Param('infoId') infoId: string) {
    return this.logininforService.remove(infoId)
  }
}