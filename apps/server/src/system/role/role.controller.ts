import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, StreamableFile } from '@nestjs/common'

import { RoleService } from './role.service'

@Controller('system/role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get('list')
  list(@Query() query: Record<string, unknown>) {
    return this.roleService.list(query)
  }

  @Get('export')
  async export(@Query() query: Record<string, unknown>, @Res({ passthrough: true }) response: any) {
    const file = await this.roleService.export(query)
    response.setHeader('Content-Type', 'text/csv; charset=utf-8')
    response.setHeader('Content-Disposition', 'attachment; filename=' + file.fileName)
    return new StreamableFile(file.buffer)
  }

  @Get('authUser/allocatedList')
  allocatedList(@Query() query: Record<string, unknown>) {
    return this.roleService.allocatedList(query)
  }

  @Get('authUser/unallocatedList')
  unallocatedList(@Query() query: Record<string, unknown>) {
    return this.roleService.unallocatedList(query)
  }

  @Put('authUser/cancel')
  cancel(@Body() payload: Record<string, unknown>) {
    return this.roleService.cancel(payload)
  }

  @Put('authUser/cancelAll')
  cancelAll(@Query() query: Record<string, unknown>) {
    return this.roleService.cancelAll(query)
  }

  @Put('authUser/selectAll')
  selectAll(@Query() query: Record<string, unknown>) {
    return this.roleService.selectAll(query)
  }

  @Put('dataScope')
  dataScope(@Body() payload: Record<string, unknown>) {
    return this.roleService.dataScope(payload)
  }

  @Put('changeStatus')
  changeStatus(@Body() payload: Record<string, unknown>) {
    return this.roleService.changeStatus(payload)
  }

  @Get('deptTree/:roleId')
  deptTree(@Param('roleId') roleId: string) {
    return this.roleService.deptTree(Number(roleId))
  }

  @Get(':roleId')
  get(@Param('roleId') roleId: string) {
    return this.roleService.get(Number(roleId))
  }

  @Post()
  create(@Body() payload: Record<string, unknown>) {
    return this.roleService.create(payload)
  }

  @Put()
  update(@Body() payload: Record<string, unknown>) {
    return this.roleService.update(payload)
  }

  @Delete(':roleId')
  remove(@Param('roleId') roleId: string) {
    return this.roleService.remove(Number(roleId))
  }
}