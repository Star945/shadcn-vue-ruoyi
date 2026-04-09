import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Query } from '@nestjs/common'

import { NoticeService } from './notice.service'

@Controller('system/notice')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @Get('list')
  list(@Query() query: Record<string, unknown>) {
    return this.noticeService.list(query)
  }

  @Get('listTop')
  listTop(@Headers('authorization') authorization?: string) {
    return this.noticeService.listTop(authorization)
  }

  @Post('markRead')
  markRead(@Headers('authorization') authorization: string | undefined, @Query() query: Record<string, unknown>) {
    return this.noticeService.markRead(Number(query.noticeId), authorization)
  }

  @Post('markReadAll')
  markReadAll(@Headers('authorization') authorization: string | undefined, @Query() query: Record<string, unknown>) {
    return this.noticeService.markReadAll(String(query.ids ?? ''), authorization)
  }

  @Get(':noticeId')
  get(@Param('noticeId') noticeId: string) {
    return this.noticeService.get(Number(noticeId))
  }

  @Post()
  create(@Body() payload: Record<string, unknown>) {
    return this.noticeService.create(payload)
  }

  @Put()
  update(@Body() payload: Record<string, unknown>) {
    return this.noticeService.update(payload)
  }

  @Delete(':noticeId')
  remove(@Param('noticeId') noticeId: string) {
    return this.noticeService.remove(Number(noticeId))
  }
}