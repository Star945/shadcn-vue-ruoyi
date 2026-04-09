import { Injectable } from '@nestjs/common'

import { createCsvBuffer } from '../../common/export/csv.util'
import { success, table } from '../../common/http/ruoyi-response'
import { PrismaService } from '../../infra/prisma/prisma.service'
import { mockDeptTree, mockRoles, mockUsers } from '../../mock/ruoyi.mock'

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: Record<string, unknown>) {
    const paginate = query.pageNum !== undefined || query.pageSize !== undefined
    const pageNum = this.parsePositiveNumber(query.pageNum, 1)
    const pageSize = this.parsePositiveNumber(query.pageSize, 10)
    const where = {
      delFlag: '0',
      ...(query.roleName ? { roleName: { contains: String(query.roleName) } } : {}),
      ...(query.roleKey ? { roleKey: { contains: String(query.roleKey) } } : {}),
      ...(query.status ? { status: String(query.status) } : {}),
    }

    const dbRows = await this.prisma.safeCall(async () => {
      const total = await this.prisma.sysRole.count({ where })
      const items = await this.prisma.sysRole.findMany({
        where,
        orderBy: [
          { roleSort: 'asc' },
          { roleId: 'asc' },
        ],
        ...(paginate ? { skip: (pageNum - 1) * pageSize, take: pageSize } : {}),
      })
      return { total, rows: items }
    })

    if (dbRows) {
      return table(dbRows.rows, dbRows.total)
    }

    const rows = mockRoles.filter((role) => {
      const matchesName = !query.roleName || role.roleName.includes(String(query.roleName))
      const matchesKey = !query.roleKey || role.roleKey.includes(String(query.roleKey))
      const matchesStatus = !query.status || role.status === String(query.status)
      return matchesName && matchesKey && matchesStatus
    })

    return table(paginate ? this.slicePage(rows, pageNum, pageSize) : rows, rows.length)
  }

  async get(roleId: number) {
    const dbRole = await this.prisma.safeCall(async () => {
      const role = await this.prisma.sysRole.findFirst({
        where: { roleId, delFlag: '0' },
        include: {
          roleMenus: true,
          roleDepts: true,
        },
      })

      if (!role) {
        return undefined
      }

      return {
        ...role,
        menuIds: role.roleMenus.map(item => item.menuId),
        deptIds: role.roleDepts.map(item => item.deptId),
      }
    })

    if (dbRole) {
      return success(dbRole)
    }

    return success(mockRoles.find(item => item.roleId === roleId))
  }

  async export(query: Record<string, unknown>) {
    const exportQuery = { ...query }
    delete exportQuery.pageNum
    delete exportQuery.pageSize
    const result = await this.list(exportQuery) as Record<string, any>
    const rows = Array.isArray(result.rows) ? result.rows : []
    return {
      fileName: 'system-role.csv',
      buffer: createCsvBuffer(rows, [
        { key: 'roleId', title: '角色编号' },
        { key: 'roleName', title: '角色名称' },
        { key: 'roleKey', title: '权限字符' },
        { key: 'roleSort', title: '显示顺序' },
        { key: 'status', title: '状态' },
        { key: 'dataScope', title: '数据范围' },
        { key: 'createTime', title: '创建时间' },
      ]),
    }
  }

  async create(payload: Record<string, unknown>) {
    const created = await this.prisma.safeCall(async () => {
      const menuIds = this.parseIdList(payload.menuIds)
      const deptIds = this.parseIdList(payload.deptIds)

      const role = await this.prisma.sysRole.create({
        data: {
          roleName: String(payload.roleName ?? ''),
          roleKey: String(payload.roleKey ?? ''),
          roleSort: this.parseNumber(payload.roleSort, 1),
          dataScope: String(payload.dataScope ?? '1'),
          menuCheckStrictly: this.parseBoolean(payload.menuCheckStrictly, true),
          deptCheckStrictly: this.parseBoolean(payload.deptCheckStrictly, true),
          status: String(payload.status ?? '0'),
          delFlag: '0',
          remark: this.toOptionalString(payload.remark),
          createTime: new Date(),
        },
      })

      if (menuIds.length > 0) {
        await this.prisma.sysRoleMenu.createMany({
          data: menuIds.map(menuId => ({ roleId: role.roleId, menuId })),
          skipDuplicates: true,
        })
      }

      if (String(payload.dataScope ?? '1') === '2' && deptIds.length > 0) {
        await this.prisma.sysRoleDept.createMany({
          data: deptIds.map(deptId => ({ roleId: role.roleId, deptId })),
          skipDuplicates: true,
        })
      }

      return true
    })

    if (created) {
      return success(undefined, '新增成功')
    }

    const nextRoleId = mockRoles.reduce((max, item) => Math.max(max, item.roleId), 0) + 1
    mockRoles.push({
      roleId: nextRoleId,
      roleName: String(payload.roleName ?? ''),
      roleKey: String(payload.roleKey ?? ''),
      roleSort: this.parseNumber(payload.roleSort, 1),
      status: String(payload.status ?? '0'),
      dataScope: String(payload.dataScope ?? '1'),
      menuIds: this.parseIdList(payload.menuIds),
      deptIds: this.parseIdList(payload.deptIds),
      createTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
      remark: this.toOptionalString(payload.remark) ?? undefined,
    })

    return success(undefined, '新增成功')
  }

  async update(payload: Record<string, unknown>) {
    const updated = await this.prisma.safeCall(async () => {
      const roleId = Number(payload.roleId)
      const menuIds = this.parseIdList(payload.menuIds)
      const deptIds = this.parseIdList(payload.deptIds)
      const dataScope = String(payload.dataScope ?? '1')

      await this.prisma.sysRole.update({
        where: { roleId },
        data: {
          roleName: String(payload.roleName ?? ''),
          roleKey: String(payload.roleKey ?? ''),
          roleSort: this.parseNumber(payload.roleSort, 1),
          dataScope,
          menuCheckStrictly: this.parseBoolean(payload.menuCheckStrictly, true),
          deptCheckStrictly: this.parseBoolean(payload.deptCheckStrictly, true),
          status: String(payload.status ?? '0'),
          remark: this.toOptionalString(payload.remark),
          updateTime: new Date(),
        },
      })

      await this.prisma.sysRoleMenu.deleteMany({ where: { roleId } })
      await this.prisma.sysRoleDept.deleteMany({ where: { roleId } })

      if (menuIds.length > 0) {
        await this.prisma.sysRoleMenu.createMany({
          data: menuIds.map(menuId => ({ roleId, menuId })),
          skipDuplicates: true,
        })
      }

      if (dataScope === '2' && deptIds.length > 0) {
        await this.prisma.sysRoleDept.createMany({
          data: deptIds.map(deptId => ({ roleId, deptId })),
          skipDuplicates: true,
        })
      }

      return true
    })

    if (updated) {
      return success(undefined, '修改成功')
    }

    const roleId = Number(payload.roleId)
    const current = mockRoles.find(item => item.roleId === roleId)
    if (current) {
      current.roleName = String(payload.roleName ?? current.roleName)
      current.roleKey = String(payload.roleKey ?? current.roleKey)
      current.roleSort = this.parseNumber(payload.roleSort, current.roleSort)
      current.status = String(payload.status ?? current.status)
      current.dataScope = String(payload.dataScope ?? current.dataScope)
      current.menuIds = this.parseIdList(payload.menuIds)
      current.deptIds = this.parseIdList(payload.deptIds)
      current.remark = this.toOptionalString(payload.remark) ?? undefined
    }

    return success(undefined, '修改成功')
  }

  async remove(roleId: number) {
    const removed = await this.prisma.safeCall(async () => {
      await this.prisma.sysRoleMenu.deleteMany({ where: { roleId } })
      await this.prisma.sysRoleDept.deleteMany({ where: { roleId } })
      await this.prisma.sysUserRole.deleteMany({ where: { roleId } })
      await this.prisma.sysRole.update({
        where: { roleId },
        data: {
          delFlag: '2',
          updateTime: new Date(),
        },
      })
      return true
    })

    if (removed) {
      return success(undefined, '删除成功')
    }

    const index = mockRoles.findIndex(item => item.roleId === roleId)
    if (index >= 0) {
      mockRoles.splice(index, 1)
    }
    for (const user of mockUsers) {
      user.roleIds = user.roleIds.filter(item => item !== roleId)
    }

    return success(undefined, '删除成功')
  }

  async changeStatus(payload: Record<string, unknown>) {
    const updated = await this.prisma.safeCall(async () => {
      await this.prisma.sysRole.update({
        where: { roleId: Number(payload.roleId) },
        data: {
          status: String(payload.status ?? '0'),
          updateTime: new Date(),
        },
      })
      return true
    })

    if (updated) {
      return success(undefined, '状态更新成功')
    }

    const current = mockRoles.find(item => item.roleId === Number(payload.roleId))
    if (current) {
      current.status = String(payload.status ?? current.status)
    }

    return success(undefined, '状态更新成功')
  }

  async dataScope(payload: Record<string, unknown>) {
    const updated = await this.prisma.safeCall(async () => {
      const roleId = Number(payload.roleId)
      const deptIds = this.parseIdList(payload.deptIds)
      const dataScope = String(payload.dataScope ?? '1')

      await this.prisma.sysRole.update({
        where: { roleId },
        data: {
          dataScope,
          deptCheckStrictly: this.parseBoolean(payload.deptCheckStrictly, true),
          updateTime: new Date(),
        },
      })

      await this.prisma.sysRoleDept.deleteMany({ where: { roleId } })
      if (dataScope === '2' && deptIds.length > 0) {
        await this.prisma.sysRoleDept.createMany({
          data: deptIds.map(deptId => ({ roleId, deptId })),
          skipDuplicates: true,
        })
      }

      return true
    })

    if (updated) {
      return success(undefined, '数据权限更新成功')
    }

    const current = mockRoles.find(item => item.roleId === Number(payload.roleId))
    if (current) {
      current.dataScope = String(payload.dataScope ?? current.dataScope)
      current.deptIds = this.parseIdList(payload.deptIds)
    }

    return success(undefined, '数据权限更新成功')
  }

  async deptTree(roleId: number) {
    const dbDetail = await this.prisma.safeCall(async () => {
      const [depts, role] = await Promise.all([
        this.prisma.sysDept.findMany({
          where: { delFlag: '0' },
          orderBy: [
            { parentId: 'asc' },
            { orderNum: 'asc' },
            { deptId: 'asc' },
          ],
        }),
        this.prisma.sysRole.findFirst({
          where: { roleId, delFlag: '0' },
          include: { roleDepts: true },
        }),
      ])

      return {
        depts,
        checkedKeys: role?.roleDepts.map(item => item.deptId) ?? [],
      }
    })

    if (dbDetail) {
      return {
        code: 200,
        msg: '操作成功',
        depts: dbDetail.depts,
        checkedKeys: dbDetail.checkedKeys,
      }
    }

    const role = mockRoles.find(item => item.roleId === roleId)
    return {
      code: 200,
      msg: '操作成功',
      depts: mockDeptTree,
      checkedKeys: role?.deptIds ?? [],
    }
  }
  async allocatedList(query: Record<string, unknown>) {
    const roleId = Number(query.roleId ?? 0)
    const paginate = query.pageNum !== undefined || query.pageSize !== undefined
    const pageNum = this.parsePositiveNumber(query.pageNum, 1)
    const pageSize = this.parsePositiveNumber(query.pageSize, 10)
    const where = {
      delFlag: '0',
      ...(query.userName ? { userName: { contains: String(query.userName) } } : {}),
      ...(query.phonenumber ? { phonenumber: { contains: String(query.phonenumber) } } : {}),
      userRoles: {
        some: {
          roleId,
        },
      },
    }

    const dbRows = await this.prisma.safeCall(async () => {
      const total = await this.prisma.sysUser.count({ where })
      const items = await this.prisma.sysUser.findMany({
        where,
        include: {
          dept: true,
        },
        orderBy: [
          { userId: 'asc' },
        ],
        ...(paginate ? { skip: (pageNum - 1) * pageSize, take: pageSize } : {}),
      })

      return {
        total,
        rows: items.map(user => ({
          ...user,
          deptName: user.dept?.deptName ?? '--',
          dept: user.dept,
        })),
      }
    })

    if (dbRows) {
      return table(dbRows.rows, dbRows.total)
    }

    const rows = mockUsers.filter((user) => {
      const matchesRole = user.roleIds.includes(roleId)
      const matchesName = !query.userName || user.userName.includes(String(query.userName))
      const matchesPhone = !query.phonenumber || user.phonenumber.includes(String(query.phonenumber))
      return matchesRole && matchesName && matchesPhone
    })
    return table(paginate ? this.slicePage(rows, pageNum, pageSize) : rows, rows.length)
  }

  async unallocatedList(query: Record<string, unknown>) {
    const roleId = Number(query.roleId ?? 0)
    const paginate = query.pageNum !== undefined || query.pageSize !== undefined
    const pageNum = this.parsePositiveNumber(query.pageNum, 1)
    const pageSize = this.parsePositiveNumber(query.pageSize, 10)
    const where = {
      delFlag: '0',
      ...(query.userName ? { userName: { contains: String(query.userName) } } : {}),
      ...(query.phonenumber ? { phonenumber: { contains: String(query.phonenumber) } } : {}),
      userRoles: {
        none: {
          roleId,
        },
      },
    }

    const dbRows = await this.prisma.safeCall(async () => {
      const total = await this.prisma.sysUser.count({ where })
      const items = await this.prisma.sysUser.findMany({
        where,
        include: {
          dept: true,
        },
        orderBy: [
          { userId: 'asc' },
        ],
        ...(paginate ? { skip: (pageNum - 1) * pageSize, take: pageSize } : {}),
      })

      return {
        total,
        rows: items.map(user => ({
          ...user,
          deptName: user.dept?.deptName ?? '--',
          dept: user.dept,
        })),
      }
    })

    if (dbRows) {
      return table(dbRows.rows, dbRows.total)
    }

    const rows = mockUsers.filter((user) => {
      const matchesRole = !user.roleIds.includes(roleId)
      const matchesName = !query.userName || user.userName.includes(String(query.userName))
      const matchesPhone = !query.phonenumber || user.phonenumber.includes(String(query.phonenumber))
      return matchesRole && matchesName && matchesPhone
    })
    return table(paginate ? this.slicePage(rows, pageNum, pageSize) : rows, rows.length)
  }

  async cancel(payload: Record<string, unknown>) {
    const roleId = Number(payload.roleId ?? 0)
    const userId = Number(payload.userId ?? 0)

    const updated = await this.prisma.safeCall(async () => {
      await this.prisma.sysUserRole.deleteMany({ where: { roleId, userId } })
      return true
    })

    if (updated) {
      return success(undefined, '取消授权成功')
    }

    const user = mockUsers.find(item => item.userId === userId)
    if (user) {
      user.roleIds = user.roleIds.filter(item => item !== roleId)
    }

    return success(undefined, '取消授权成功')
  }

  async cancelAll(query: Record<string, unknown>) {
    const roleId = Number(query.roleId ?? 0)
    const userIds = this.parseIdList(query.userIds)

    const updated = await this.prisma.safeCall(async () => {
      await this.prisma.sysUserRole.deleteMany({ where: { roleId, userId: { in: userIds } } })
      return true
    })

    if (updated) {
      return success(undefined, '批量取消授权成功')
    }

    for (const user of mockUsers) {
      if (userIds.includes(user.userId)) {
        user.roleIds = user.roleIds.filter(item => item !== roleId)
      }
    }

    return success(undefined, '批量取消授权成功')
  }

  async selectAll(query: Record<string, unknown>) {
    const roleId = Number(query.roleId ?? 0)
    const userIds = this.parseIdList(query.userIds)

    const updated = await this.prisma.safeCall(async () => {
      if (userIds.length > 0) {
        await this.prisma.sysUserRole.createMany({
          data: userIds.map(userId => ({ userId, roleId })),
          skipDuplicates: true,
        })
      }
      return true
    })

    if (updated) {
      return success(undefined, '批量授权成功')
    }

    for (const user of mockUsers) {
      if (userIds.includes(user.userId) && !user.roleIds.includes(roleId)) {
        user.roleIds = [...user.roleIds, roleId]
      }
    }

    return success(undefined, '批量授权成功')
  }

  private toOptionalString(value: unknown) {
    const text = String(value ?? '').trim()
    return text ? text : null
  }

  private parseIdList(value: unknown) {
    if (Array.isArray(value)) {
      return value
        .map(item => Number(item))
        .filter(item => Number.isFinite(item) && item > 0)
    }

    const text = String(value ?? '').trim()
    if (!text) {
      return []
    }

    return text
      .split(',')
      .map(item => Number(item.trim()))
      .filter(item => Number.isFinite(item) && item > 0)
  }

  private parseBoolean(value: unknown, fallback: boolean) {
    if (value === undefined || value === null || value === '') {
      return fallback
    }
    if (typeof value === 'boolean') {
      return value
    }
    return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase())
  }

  private parseNumber(value: unknown, fallback: number) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  private parsePositiveNumber(value: unknown, fallback: number) {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
  }

  private slicePage<T>(rows: T[], pageNum: number, pageSize: number) {
    const start = (pageNum - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }
}