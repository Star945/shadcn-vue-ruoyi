import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, StreamableFile } from '@nestjs/common'

import { DictDataService } from './data.service'

@Controller('system/dict/data')
export class DictDataController {
  constructor(private readonly dictDataService: DictDataService) {}

  @Get('list')
  list(@Query() query: Record<string, unknown>) {
    return this.dictDataService.list(query)
  }

  @Get('export')
  async export(@Query() query: Record<string, unknown>, @Res({ passthrough: true }) response: any) {
    const file = await this.dictDataService.export(query)
    response.setHeader('Content-Type', 'text/csv; charset=utf-8')
    response.setHeader('Content-Disposition', 'attachment; filename=' + file.fileName)
    return new StreamableFile(file.buffer)
  }

  @Get(':dictCode')
  get(@Param('dictCode') dictCode: string) {
    return this.dictDataService.get(Number(dictCode))
  }

  @Post()
  create(@Body() payload: Record<string, unknown>) {
    return this.dictDataService.create(payload)
  }

  @Put()
  update(@Body() payload: Record<string, unknown>) {
    return this.dictDataService.update(payload)
  }

  @Delete(':dictCode')
  remove(@Param('dictCode') dictCode: string) {
    return this.dictDataService.remove(Number(dictCode))
  }
}