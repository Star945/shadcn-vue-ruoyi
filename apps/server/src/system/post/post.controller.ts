import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, StreamableFile } from '@nestjs/common'

import { PostService } from './post.service'

@Controller('system/post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get('list')
  list(@Query() query: Record<string, unknown>) {
    return this.postService.list(query)
  }

  @Get('export')
  async export(@Query() query: Record<string, unknown>, @Res({ passthrough: true }) response: any) {
    const file = await this.postService.export(query)
    response.setHeader('Content-Type', 'text/csv; charset=utf-8')
    response.setHeader('Content-Disposition', 'attachment; filename=' + file.fileName)
    return new StreamableFile(file.buffer)
  }

  @Get('optionselect')
  optionselect() {
    return this.postService.optionselect()
  }

  @Get(':postId')
  get(@Param('postId') postId: string) {
    return this.postService.get(Number(postId))
  }

  @Post()
  create(@Body() payload: Record<string, unknown>) {
    return this.postService.create(payload)
  }

  @Put()
  update(@Body() payload: Record<string, unknown>) {
    return this.postService.update(payload)
  }

  @Delete(':postId')
  remove(@Param('postId') postId: string) {
    return this.postService.remove(Number(postId))
  }
}