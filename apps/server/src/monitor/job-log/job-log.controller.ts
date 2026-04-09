import { Controller, Delete, Get, Param, Query, Res, StreamableFile } from '@nestjs/common'

import { JobLogService } from './job-log.service'

@Controller('monitor/jobLog')
export class JobLogController {
  constructor(private readonly jobLogService: JobLogService) {}

  @Get('list')
  list(@Query() query: Record<string, unknown>) {
    return this.jobLogService.list(query)
  }

  @Get('export')
  async export(@Query() query: Record<string, unknown>, @Res({ passthrough: true }) response: any) {
    const file = await this.jobLogService.export(query)
    response.setHeader('Content-Type', 'text/csv; charset=utf-8')
    response.setHeader('Content-Disposition', 'attachment; filename=' + file.fileName)
    return new StreamableFile(file.buffer)
  }

  @Delete('clean')
  clean() {
    return this.jobLogService.clean()
  }

  @Delete(':jobLogId')
  remove(@Param('jobLogId') jobLogId: string) {
    return this.jobLogService.remove(jobLogId)
  }
}