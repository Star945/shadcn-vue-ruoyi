import { Controller, Delete, Get, Param, Query, Res, StreamableFile } from '@nestjs/common'

import { OperlogService } from './operlog.service'

@Controller('monitor/operlog')
export class OperlogController {
  constructor(private readonly operlogService: OperlogService) {}

  @Get('list')
  list(@Query() query: Record<string, unknown>) {
    return this.operlogService.list(query)
  }

  @Get('export')
  async export(@Query() query: Record<string, unknown>, @Res({ passthrough: true }) response: any) {
    const file = await this.operlogService.export(query)
    response.setHeader('Content-Type', 'text/csv; charset=utf-8')
    response.setHeader('Content-Disposition', 'attachment; filename=' + file.fileName)
    return new StreamableFile(file.buffer)
  }

  @Delete('clean')
  clean() {
    return this.operlogService.clean()
  }

  @Delete(':operId')
  remove(@Param('operId') operId: string) {
    return this.operlogService.remove(operId)
  }
}