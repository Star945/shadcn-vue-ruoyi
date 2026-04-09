import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'

import { MenuService } from './menu.service'

@Controller('system/menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('list')
  list(@Query() query: Record<string, unknown>) {
    return this.menuService.list(query)
  }

  @Get('treeselect')
  treeselect() {
    return this.menuService.treeselect()
  }

  @Get('roleMenuTreeselect/:roleId')
  roleMenuTreeselect(@Param('roleId') roleId: string) {
    return this.menuService.roleMenuTreeselect(Number(roleId))
  }

  @Get(':menuId')
  get(@Param('menuId') menuId: string) {
    return this.menuService.get(Number(menuId))
  }

  @Post()
  create(@Body() payload: Record<string, unknown>) {
    return this.menuService.create(payload)
  }

  @Put()
  update(@Body() payload: Record<string, unknown>) {
    return this.menuService.update(payload)
  }

  @Put('updateSort')
  updateSort(@Body() payload: Record<string, unknown>) {
    return this.menuService.updateSort(payload)
  }

  @Delete(':menuId')
  remove(@Param('menuId') menuId: string) {
    return this.menuService.remove(Number(menuId))
  }
}