import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, StreamableFile } from '@nestjs/common'

import { JobService } from './job.service'

@Controller('monitor/job')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Get('list')
  list(@Query() query: Record<string, unknown>) {
    return this.jobService.list(query)
  }

  @Get('export')
  async export(@Query() query: Record<string, unknown>, @Res({ passthrough: true }) response: any) {
    const file = await this.jobService.export(query)
    response.setHeader('Content-Type', 'text/csv; charset=utf-8')
    response.setHeader('Content-Disposition', 'attachment; filename=' + file.fileName)
    return new StreamableFile(file.buffer)
  }

  @Get(':jobId')
  get(@Param('jobId') jobId: string) {
    return this.jobService.get(Number(jobId))
  }

  @Post()
  create(@Body() payload: Record<string, unknown>) {
    return this.jobService.create(payload)
  }

  @Put()
  update(@Body() payload: Record<string, unknown>) {
    return this.jobService.update(payload)
  }

  @Put('changeStatus')
  changeStatus(@Body() payload: Record<string, unknown>) {
    return this.jobService.changeStatus(payload)
  }

  @Put('run')
  run(@Body() payload: Record<string, unknown>) {
    return this.jobService.run(payload)
  }

  @Delete(':jobId')
  remove(@Param('jobId') jobId: string) {
    return this.jobService.remove(jobId)
  }
}