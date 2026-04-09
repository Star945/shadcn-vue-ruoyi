import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, StreamableFile } from '@nestjs/common'

import { DictTypeService } from './type.service'

@Controller('system/dict/type')
export class DictTypeController {
  constructor(private readonly dictTypeService: DictTypeService) {}

  @Get('list')
  list(@Query() query: Record<string, unknown>) {
    return this.dictTypeService.list(query)
  }

  @Get('export')
  async export(@Query() query: Record<string, unknown>, @Res({ passthrough: true }) response: any) {
    const file = await this.dictTypeService.export(query)
    response.setHeader('Content-Type', 'text/csv; charset=utf-8')
    response.setHeader('Content-Disposition', 'attachment; filename=' + file.fileName)
    return new StreamableFile(file.buffer)
  }

  @Delete('refreshCache')
  refreshCache() {
    return this.dictTypeService.refreshCache()
  }

  @Get('optionselect')
  optionselect() {
    return this.dictTypeService.optionselect()
  }

  @Get(':dictId')
  get(@Param('dictId') dictId: string) {
    return this.dictTypeService.get(Number(dictId))
  }

  @Post()
  create(@Body() payload: Record<string, unknown>) {
    return this.dictTypeService.create(payload)
  }

  @Put()
  update(@Body() payload: Record<string, unknown>) {
    return this.dictTypeService.update(payload)
  }

  @Delete(':dictId')
  remove(@Param('dictId') dictId: string) {
    return this.dictTypeService.remove(Number(dictId))
  }
}