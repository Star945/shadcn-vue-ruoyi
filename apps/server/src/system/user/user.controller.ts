import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Query, Res, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'

import { UserService } from './user.service'

@Controller('system/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('list')
  list(@Query() query: Record<string, unknown>) {
    return this.userService.list(query)
  }

  @Get('export')
  async export(@Query() query: Record<string, unknown>, @Res({ passthrough: true }) response: any) {
    const file = await this.userService.export(query)
    response.setHeader('Content-Type', 'text/csv; charset=utf-8')
    response.setHeader('Content-Disposition', 'attachment; filename=' + file.fileName)
    return new StreamableFile(file.buffer)
  }

  @Get('profile')
  profile(@Headers('authorization') authorization?: string) {
    return this.userService.profile(authorization)
  }

  @Put('profile')
  updateProfile(@Headers('authorization') authorization: string | undefined, @Body() payload: Record<string, unknown>) {
    return this.userService.updateProfile(authorization, payload)
  }

  @Put('profile/updatePwd')
  updatePassword(@Headers('authorization') authorization: string | undefined, @Body() payload: Record<string, unknown>) {
    return this.userService.updatePassword(authorization, payload)
  }

  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('avatarfile', { limits: { fileSize: 10 * 1024 * 1024 } }))
  updateAvatar(@Headers('authorization') authorization: string | undefined, @UploadedFile() file: any) {
    return this.userService.updateAvatar(authorization, file)
  }

  @Get('authRole/:userId')
  authRole(@Param('userId') userId: string) {
    return this.userService.authRole(Number(userId))
  }

  @Put('authRole')
  updateAuthRole(@Query() query: Record<string, unknown>, @Body() body: Record<string, unknown>) {
    return this.userService.updateAuthRole(Object.keys(query).length > 0 ? query : body)
  }

  @Put('resetPwd')
  resetPwd(@Body() payload: Record<string, unknown>) {
    return this.userService.resetPassword(payload)
  }

  @Put('changeStatus')
  changeStatus(@Body() payload: Record<string, unknown>) {
    return this.userService.changeStatus(payload)
  }

  @Get('deptTree')
  deptTree() {
    return this.userService.deptTree()
  }

  @Get()
  emptyDetail() {
    return this.userService.get()
  }

  @Get(':userId')
  get(@Param('userId') userId: string) {
    return this.userService.get(Number(userId))
  }

  @Post()
  create(@Body() payload: Record<string, unknown>) {
    return this.userService.create(payload)
  }

  @Put()
  update(@Body() payload: Record<string, unknown>) {
    return this.userService.update(payload)
  }

  @Delete(':userId')
  remove(@Param('userId') userId: string) {
    return this.userService.remove(Number(userId))
  }
}