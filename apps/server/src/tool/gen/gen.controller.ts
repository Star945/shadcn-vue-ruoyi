import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, StreamableFile } from '@nestjs/common'

import { GenService } from './gen.service'

@Controller('tool/gen')
export class GenController {
  constructor(private readonly genService: GenService) {}

  @Get('list')
  list(@Query() query: Record<string, unknown>) {
    return this.genService.list(query)
  }

  @Get('db/list')
  listDb(@Query() query: Record<string, unknown>) {
    return this.genService.listDb(query)
  }

  @Post('importTable')
  importTable(@Query() query: Record<string, unknown>, @Body() body: Record<string, unknown>) {
    return this.genService.importTable(Object.keys(query).length > 0 ? query : body)
  }

  @Post('createTable')
  createTable(@Query() query: Record<string, unknown>, @Body() body: Record<string, unknown>) {
    return this.genService.createTable(Object.keys(query).length > 0 ? query : body)
  }

  @Get('preview/:tableId')
  preview(@Param('tableId') tableId: string) {
    return this.genService.preview(Number(tableId))
  }

  @Get('genCode/:tableName')
  genCode(@Param('tableName') tableName: string) {
    return this.genService.genCode(tableName)
  }

  @Get('batchGenCode')
  async batchGenCode(@Query('tables') tables: string, @Res({ passthrough: true }) response: any) {
    const file = await this.genService.batchGenCode(tables)
    response.setHeader('Content-Type', 'application/zip')
    response.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`)
    return new StreamableFile(file.buffer)
  }

  @Get('synchDb/:tableName')
  synchDb(@Param('tableName') tableName: string) {
    return this.genService.synchDb(tableName)
  }

  @Get(':tableId')
  get(@Param('tableId') tableId: string) {
    return this.genService.get(Number(tableId))
  }

  @Put()
  update(@Body() payload: Record<string, unknown>) {
    return this.genService.update(payload)
  }

  @Delete(':tableId')
  remove(@Param('tableId') tableId: string) {
    return this.genService.remove(tableId)
  }
}