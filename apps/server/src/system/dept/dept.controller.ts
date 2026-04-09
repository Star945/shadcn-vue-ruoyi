import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'

import { DeptService } from './dept.service'

@Controller('system/dept')
export class DeptController {
  constructor(private readonly deptService: DeptService) {}

  @Get('list')
  list(@Query() query: Record<string, unknown>) {
    return this.deptService.list(query)
  }

  @Get('list/exclude/:deptId')
  listExclude(@Param('deptId') deptId: string) {
    return this.deptService.listExclude(Number(deptId))
  }

  @Get('treeselect')
  treeselect() {
    return this.deptService.treeselect()
  }

  @Get('roleDeptTreeselect/:roleId')
  roleDeptTreeselect(@Param('roleId') roleId: string) {
    return this.deptService.roleDeptTreeselect(Number(roleId))
  }

  @Get(':deptId')
  get(@Param('deptId') deptId: string) {
    return this.deptService.get(Number(deptId))
  }

  @Post()
  create(@Body() payload: Record<string, unknown>) {
    return this.deptService.create(payload)
  }

  @Put()
  update(@Body() payload: Record<string, unknown>) {
    return this.deptService.update(payload)
  }

  @Delete(':deptId')
  remove(@Param('deptId') deptId: string) {
    return this.deptService.remove(Number(deptId))
  }
}