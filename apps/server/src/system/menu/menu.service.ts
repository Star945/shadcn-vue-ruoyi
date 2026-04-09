import { Injectable } from '@nestjs/common'

import { success } from '../../common/http/ruoyi-response'
import { PrismaService } from '../../infra/prisma/prisma.service'
import { findMenuById, flattenMenus, mockMenuEntities, mockRoles, type MenuEntity } from '../../mock/ruoyi.mock'

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: Record<string, unknown>) {
    const dbRows = await this.prisma.safeCall(() => this.prisma.sysMenu.findMany({
      where: {
        ...(query.menuName ? { menuName: { contains: String(query.menuName) } } : {}),
        ...(query.status ? { status: String(query.status) } : {}),
      },
      orderBy: [
        { parentId: 'asc' },
        { orderNum: 'asc' },
        { menuId: 'asc' },
      ],
    }))

    if (dbRows !== undefined) {
      return success(dbRows)
    }

    const rows = flattenMenus()
      .filter((item) => {
        const matchesName = !query.menuName || item.menuName.includes(String(query.menuName))
        const matchesStatus = !query.status || item.status === String(query.status)
        return matchesName && matchesStatus
      })
      .slice()
      .sort((a, b) => a.parentId - b.parentId || a.orderNum - b.orderNum || a.menuId - b.menuId)

    return success(rows)
  }

  async get(menuId: number) {
    const dbMenu = await this.prisma.safeCall(() => this.prisma.sysMenu.findUnique({ where: { menuId } }))
    if (dbMenu !== undefined) {
      return success(dbMenu)
    }

    return success(findMenuById(menuId))
  }

  async treeselect() {
    const dbRows = await this.prisma.safeCall(() => this.prisma.sysMenu.findMany({
      orderBy: [
        { parentId: 'asc' },
        { orderNum: 'asc' },
        { menuId: 'asc' },
      ],
    }))

    if (dbRows !== undefined) {
      return success(dbRows)
    }

    return success(mockMenuEntities)
  }

  async roleMenuTreeselect(roleId: number) {
    const dbDetail = await this.prisma.safeCall(async () => {
      const [menus, role] = await Promise.all([
        this.prisma.sysMenu.findMany({
          orderBy: [
            { parentId: 'asc' },
            { orderNum: 'asc' },
            { menuId: 'asc' },
          ],
        }),
        this.prisma.sysRole.findFirst({
          where: { roleId, delFlag: '0' },
          include: { roleMenus: true },
        }),
      ])

      return {
        menus,
        checkedKeys: role?.roleMenus.map(item => item.menuId) ?? [],
      }
    })

    if (dbDetail) {
      return {
        code: 200,
        msg: '操作成功',
        menus: dbDetail.menus,
        checkedKeys: dbDetail.checkedKeys,
      }
    }

    const role = mockRoles.find(item => item.roleId === roleId)
    return {
      code: 200,
      msg: '操作成功',
      menus: mockMenuEntities,
      checkedKeys: role?.menuIds ?? [],
    }
  }

  async create(payload: Record<string, unknown>) {
    const created = await this.prisma.safeCall(async () => {
      await this.prisma.sysMenu.create({
        data: {
          menuName: String(payload.menuName ?? ''),
          parentId: this.parseNumber(payload.parentId, 0),
          orderNum: this.parseNumber(payload.orderNum, 0),
          path: String(payload.path ?? ''),
          component: this.toOptionalString(payload.component),
          query: this.toOptionalString(payload.query),
          routeName: this.toOptionalString(payload.routeName),
          isFrame: this.parseNumber(payload.isFrame, 1),
          isCache: this.parseNumber(payload.isCache, 0),
          menuType: String(payload.menuType ?? 'C'),
          visible: String(payload.visible ?? '0'),
          status: String(payload.status ?? '0'),
          perms: this.toOptionalString(payload.perms),
          icon: this.toOptionalString(payload.icon),
          remark: this.toOptionalString(payload.remark),
          createTime: new Date(),
        },
      })
      return true
    })

    if (created) {
      return success(undefined, '新增成功')
    }

    const nextMenuId = flattenMenus().reduce((max, item) => Math.max(max, item.menuId), 0) + 1
    const node: MenuEntity = {
      menuId: nextMenuId,
      parentId: this.parseNumber(payload.parentId, 0),
      menuName: String(payload.menuName ?? ''),
      path: String(payload.path ?? ''),
      component: String(payload.component ?? ''),
      menuType: String(payload.menuType ?? 'C') as 'M' | 'C' | 'F',
      visible: String(payload.visible ?? '0'),
      status: String(payload.status ?? '0'),
      perms: String(payload.perms ?? ''),
      icon: String(payload.icon ?? ''),
      orderNum: this.parseNumber(payload.orderNum, 0),
      isFrame: this.parseNumber(payload.isFrame, 1),
      isCache: this.parseNumber(payload.isCache, 0),
    }
    this.insertMenuNode(node, node.parentId)
    this.sortMenuTree(mockMenuEntities)
    return success(undefined, '新增成功')
  }

  async update(payload: Record<string, unknown>) {
    const updated = await this.prisma.safeCall(async () => {
      await this.prisma.sysMenu.update({
        where: { menuId: Number(payload.menuId) },
        data: {
          menuName: String(payload.menuName ?? ''),
          parentId: this.parseNumber(payload.parentId, 0),
          orderNum: this.parseNumber(payload.orderNum, 0),
          path: String(payload.path ?? ''),
          component: this.toOptionalString(payload.component),
          query: this.toOptionalString(payload.query),
          routeName: this.toOptionalString(payload.routeName),
          isFrame: this.parseNumber(payload.isFrame, 1),
          isCache: this.parseNumber(payload.isCache, 0),
          menuType: String(payload.menuType ?? 'C'),
          visible: String(payload.visible ?? '0'),
          status: String(payload.status ?? '0'),
          perms: this.toOptionalString(payload.perms),
          icon: this.toOptionalString(payload.icon),
          remark: this.toOptionalString(payload.remark),
          updateTime: new Date(),
        },
      })
      return true
    })

    if (updated) {
      return success(undefined, '修改成功')
    }

    const menuId = Number(payload.menuId)
    const found = this.findMenuNode(menuId)
    if (!found) {
      return success(undefined, '修改成功')
    }

    const candidateParentId = this.parseNumber(payload.parentId, found.node.parentId)
    const descendantIds = new Set(this.collectDescendantIds(menuId, flattenMenus().map(item => ({ menuId: item.menuId, parentId: item.parentId }))))
    const safeParentId = candidateParentId === menuId || descendantIds.has(candidateParentId) ? found.node.parentId : candidateParentId

    if (safeParentId !== found.node.parentId) {
      this.detachMenuNode(menuId)
      found.node.parentId = safeParentId
      this.insertMenuNode(found.node, safeParentId)
    }

    found.node.menuName = String(payload.menuName ?? found.node.menuName)
    found.node.path = String(payload.path ?? found.node.path)
    found.node.component = String(payload.component ?? found.node.component)
    found.node.menuType = String(payload.menuType ?? found.node.menuType) as 'M' | 'C' | 'F'
    found.node.visible = String(payload.visible ?? found.node.visible)
    found.node.status = String(payload.status ?? found.node.status)
    found.node.perms = String(payload.perms ?? found.node.perms)
    found.node.icon = String(payload.icon ?? found.node.icon)
    found.node.orderNum = this.parseNumber(payload.orderNum, found.node.orderNum)
    found.node.isFrame = this.parseNumber(payload.isFrame, found.node.isFrame)
    found.node.isCache = this.parseNumber(payload.isCache, found.node.isCache)

    this.sortMenuTree(mockMenuEntities)
    return success(undefined, '修改成功')
  }

  async updateSort(payload: Record<string, unknown>) {
    const updated = await this.prisma.safeCall(async () => {
      await this.prisma.sysMenu.update({
        where: { menuId: Number(payload.menuId) },
        data: {
          orderNum: this.parseNumber(payload.orderNum, 0),
          updateTime: new Date(),
        },
      })
      return true
    })

    if (updated) {
      return success(undefined, '排序更新成功')
    }

    const current = this.findMenuNode(Number(payload.menuId))?.node
    if (current) {
      current.orderNum = this.parseNumber(payload.orderNum, current.orderNum)
      this.sortMenuTree(mockMenuEntities)
    }

    return success(undefined, '排序更新成功')
  }

  async remove(menuId: number) {
    const removed = await this.prisma.safeCall(async () => {
      const allMenus = await this.prisma.sysMenu.findMany({
        select: { menuId: true, parentId: true },
      })
      const targetIds = this.collectDescendantIds(menuId, allMenus)
      await this.prisma.sysRoleMenu.deleteMany({ where: { menuId: { in: targetIds } } })
      await this.prisma.sysMenu.deleteMany({ where: { menuId: { in: targetIds } } })
      return true
    })

    if (removed) {
      return success(undefined, '删除成功')
    }

    const targetIds = this.collectDescendantIds(menuId, flattenMenus().map(item => ({ menuId: item.menuId, parentId: item.parentId })))
    this.detachMenuNode(menuId)
    for (const role of mockRoles) {
      role.menuIds = role.menuIds.filter(item => !targetIds.includes(item))
    }

    return success(undefined, '删除成功')
  }

  private toOptionalString(value: unknown) {
    const text = String(value ?? '').trim()
    return text ? text : null
  }

  private parseNumber(value: unknown, fallback: number) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  private collectDescendantIds(menuId: number, rows: Array<{ menuId: number, parentId: number }>) {
    const queue = [menuId]
    const visited = new Set<number>()

    while (queue.length > 0) {
      const current = queue.shift()
      if (!current || visited.has(current)) {
        continue
      }
      visited.add(current)

      for (const row of rows) {
        if (row.parentId === current && !visited.has(row.menuId)) {
          queue.push(row.menuId)
        }
      }
    }

    return [...visited]
  }

  private findMenuNode(menuId: number, nodes: MenuEntity[] = mockMenuEntities, parent: MenuEntity | null = null): { node: MenuEntity, parent: MenuEntity | null, index: number, container: MenuEntity[] } | null {
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index]
      if (node.menuId === menuId) {
        return { node, parent, index, container: nodes }
      }
      if (node.children?.length) {
        const found = this.findMenuNode(menuId, node.children, node)
        if (found) {
          return found
        }
      }
    }
    return null
  }

  private detachMenuNode(menuId: number) {
    const found = this.findMenuNode(menuId)
    if (!found) {
      return null
    }
    found.container.splice(found.index, 1)
    if (found.parent && found.parent.children?.length === 0) {
      delete found.parent.children
    }
    return found.node
  }

  private insertMenuNode(node: MenuEntity, parentId: number) {
    if (parentId <= 0) {
      mockMenuEntities.push(node)
      return
    }

    const parent = this.findMenuNode(parentId)?.node
    if (!parent) {
      mockMenuEntities.push(node)
      return
    }

    if (!Array.isArray(parent.children)) {
      parent.children = []
    }
    parent.children.push(node)
  }

  private sortMenuTree(nodes: MenuEntity[]) {
    nodes.sort((a, b) => a.orderNum - b.orderNum || a.menuId - b.menuId)
    for (const node of nodes) {
      if (node.children?.length) {
        this.sortMenuTree(node.children)
      }
    }
  }
}