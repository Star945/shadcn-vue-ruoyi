import { Injectable } from '@nestjs/common'

import { success } from '../../common/http/ruoyi-response'
import { PrismaService } from '../../infra/prisma/prisma.service'
import { findDeptById, findRoleById, flattenDepts, mockDeptTree, mockUsers, type MockDeptNode } from '../../mock/ruoyi.mock'

@Injectable()
export class DeptService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: Record<string, unknown>) {
    const dbRows = await this.prisma.safeCall(() => this.prisma.sysDept.findMany({
      where: {
        delFlag: '0',
        ...(query.deptName ? { deptName: { contains: String(query.deptName) } } : {}),
        ...(query.status ? { status: String(query.status) } : {}),
      },
      orderBy: [
        { parentId: 'asc' },
        { orderNum: 'asc' },
        { deptId: 'asc' },
      ],
    }))

    if (dbRows !== undefined) {
      return success(dbRows)
    }

    const rows = flattenDepts()
      .filter((dept) => {
        const matchesName = !query.deptName || dept.deptName.includes(String(query.deptName))
        const matchesStatus = !query.status || dept.status === String(query.status)
        return matchesName && matchesStatus
      })
      .slice()
      .sort((a, b) => a.parentId - b.parentId || a.orderNum - b.orderNum || a.deptId - b.deptId)

    return success(rows)
  }

  async get(deptId: number) {
    const dbDept = await this.prisma.safeCall(() => this.prisma.sysDept.findUnique({ where: { deptId } }))
    if (dbDept !== undefined) {
      return success(dbDept)
    }

    return success(findDeptById(deptId))
  }

  async listExclude(deptId: number) {
    const dbRows = await this.prisma.safeCall(async () => {
      const rows = await this.prisma.sysDept.findMany({
        where: { delFlag: '0' },
        orderBy: [
          { parentId: 'asc' },
          { orderNum: 'asc' },
          { deptId: 'asc' },
        ],
      })
      const excludedIds = this.collectDescendantIds(deptId, rows.map(item => ({ deptId: item.deptId, parentId: item.parentId })))
      return rows.filter(item => !excludedIds.has(item.deptId))
    })

    if (dbRows !== undefined) {
      return success(dbRows)
    }

    const rows = flattenDepts()
    const excludedIds = this.collectDescendantIds(deptId, rows.map(item => ({ deptId: item.deptId, parentId: item.parentId })))
    return success(rows.filter(item => !excludedIds.has(item.deptId)))
  }

  async treeselect() {
    const dbRows = await this.prisma.safeCall(() => this.prisma.sysDept.findMany({
      where: { delFlag: '0' },
      orderBy: [
        { parentId: 'asc' },
        { orderNum: 'asc' },
        { deptId: 'asc' },
      ],
    }))

    if (dbRows !== undefined) {
      return success(dbRows)
    }

    return success(mockDeptTree)
  }

  async roleDeptTreeselect(roleId: number) {
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
        checkedKeys: role?.roleDepts.map(item => item.deptId) ?? [],
        depts,
      }
    })

    if (dbDetail) {
      return {
        code: 200,
        msg: '操作成功',
        checkedKeys: dbDetail.checkedKeys,
        depts: dbDetail.depts,
      }
    }

    const role = findRoleById(roleId)
    return {
      code: 200,
      msg: '操作成功',
      checkedKeys: role?.deptIds ?? [],
      depts: mockDeptTree,
    }
  }

  async create(payload: Record<string, unknown>) {
    const created = await this.prisma.safeCall(async () => {
      const parentId = this.parseNumber(payload.parentId, 0)
      const parent = parentId > 0
        ? await this.prisma.sysDept.findUnique({ where: { deptId: parentId } })
        : null

      await this.prisma.sysDept.create({
        data: {
          parentId,
          ancestors: this.buildAncestors(parent),
          deptName: String(payload.deptName ?? ''),
          orderNum: this.parseNumber(payload.orderNum, 0),
          leader: this.toOptionalString(payload.leader),
          phone: this.toOptionalString(payload.phone),
          email: this.toOptionalString(payload.email),
          status: String(payload.status ?? '0'),
          delFlag: '0',
          createTime: new Date(),
        },
      })

      return true
    })

    if (created) {
      return success(undefined, '新增成功')
    }

    const nextDeptId = flattenDepts().reduce((max, item) => Math.max(max, item.deptId), 0) + 1
    const parentId = this.parseNumber(payload.parentId, 0)
    const node: MockDeptNode = {
      deptId: nextDeptId,
      parentId,
      deptName: String(payload.deptName ?? ''),
      orderNum: this.parseNumber(payload.orderNum, 0),
      leader: String(payload.leader ?? ''),
      phone: String(payload.phone ?? ''),
      email: String(payload.email ?? ''),
      status: String(payload.status ?? '0'),
    }
    this.insertDeptNode(node, parentId)
    this.sortDeptTree(mockDeptTree)
    this.syncMockUserDeptNames()

    return success(undefined, '新增成功')
  }

  async update(payload: Record<string, unknown>) {
    const updated = await this.prisma.safeCall(async () => {
      const deptId = Number(payload.deptId)
      const parentId = this.parseNumber(payload.parentId, 0)
      const rows = await this.prisma.sysDept.findMany({
        where: { delFlag: '0' },
        orderBy: [
          { parentId: 'asc' },
          { orderNum: 'asc' },
          { deptId: 'asc' },
        ],
      })
      const current = rows.find(item => item.deptId === deptId)
      const parent = parentId > 0 ? rows.find(item => item.deptId === parentId) ?? null : null
      const ancestors = this.buildAncestors(parent)

      await this.prisma.sysDept.update({
        where: { deptId },
        data: {
          parentId,
          ancestors,
          deptName: String(payload.deptName ?? ''),
          orderNum: this.parseNumber(payload.orderNum, 0),
          leader: this.toOptionalString(payload.leader),
          phone: this.toOptionalString(payload.phone),
          email: this.toOptionalString(payload.email),
          status: String(payload.status ?? '0'),
          updateTime: new Date(),
        },
      })

      if (current && (current.parentId !== parentId || current.ancestors !== ancestors)) {
        const descendantIds = [...this.collectDescendantIds(deptId, rows.map(item => ({ deptId: item.deptId, parentId: item.parentId })))].filter(id => id !== deptId)
        for (const childId of descendantIds) {
          const childAncestors = [ancestors, String(deptId)].filter(Boolean).join(',')
          await this.prisma.sysDept.update({
            where: { deptId: childId },
            data: {
              ancestors: childAncestors,
              updateTime: new Date(),
            },
          })
        }
      }

      return true
    })

    if (updated) {
      return success(undefined, '修改成功')
    }

    const deptId = Number(payload.deptId)
    const found = this.findDeptNode(deptId)
    if (!found) {
      return success(undefined, '修改成功')
    }

    const candidateParentId = this.parseNumber(payload.parentId, found.node.parentId)
    const descendantIds = this.collectDescendantIds(deptId, flattenDepts().map(item => ({ deptId: item.deptId, parentId: item.parentId })))
    const safeParentId = candidateParentId === deptId || descendantIds.has(candidateParentId) ? found.node.parentId : candidateParentId

    if (safeParentId !== found.node.parentId) {
      this.detachDeptNode(deptId)
      found.node.parentId = safeParentId
      this.insertDeptNode(found.node, safeParentId)
    }

    found.node.deptName = String(payload.deptName ?? found.node.deptName)
    found.node.orderNum = this.parseNumber(payload.orderNum, found.node.orderNum)
    found.node.leader = String(payload.leader ?? found.node.leader)
    found.node.phone = String(payload.phone ?? found.node.phone)
    found.node.email = String(payload.email ?? found.node.email)
    found.node.status = String(payload.status ?? found.node.status)

    this.sortDeptTree(mockDeptTree)
    this.syncMockUserDeptNames()

    return success(undefined, '修改成功')
  }

  async remove(deptId: number) {
    const removed = await this.prisma.safeCall(async () => {
      const rows = await this.prisma.sysDept.findMany({
        where: { delFlag: '0' },
        select: { deptId: true, parentId: true },
      })
      const ids = [...this.collectDescendantIds(deptId, rows)]
      await this.prisma.sysDept.updateMany({
        where: { deptId: { in: ids } },
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

    const ids = this.collectDescendantIds(deptId, flattenDepts().map(item => ({ deptId: item.deptId, parentId: item.parentId })))
    this.detachDeptNode(deptId)
    for (const user of mockUsers) {
      if (ids.has(user.deptId)) {
        user.deptId = 0
        user.deptName = '--'
      }
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

  private buildAncestors(parent: { deptId: number, ancestors: string | null } | null | undefined) {
    if (!parent) {
      return '0'
    }
    return [parent.ancestors || '0', String(parent.deptId)].filter(Boolean).join(',')
  }

  private collectDescendantIds(rootId: number, rows: Array<{ deptId: number, parentId: number }>) {
    const visited = new Set<number>()
    const queue = [rootId]

    while (queue.length > 0) {
      const current = queue.shift()
      if (!current || visited.has(current)) {
        continue
      }
      visited.add(current)
      for (const row of rows) {
        if (row.parentId === current && !visited.has(row.deptId)) {
          queue.push(row.deptId)
        }
      }
    }

    return visited
  }

  private findDeptNode(deptId: number, nodes: MockDeptNode[] = mockDeptTree, parent: MockDeptNode | null = null): { node: MockDeptNode, parent: MockDeptNode | null, index: number, container: MockDeptNode[] } | null {
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index]
      if (node.deptId === deptId) {
        return { node, parent, index, container: nodes }
      }
      if (node.children?.length) {
        const found = this.findDeptNode(deptId, node.children, node)
        if (found) {
          return found
        }
      }
    }
    return null
  }

  private detachDeptNode(deptId: number) {
    const found = this.findDeptNode(deptId)
    if (!found) {
      return null
    }
    found.container.splice(found.index, 1)
    if (found.parent && found.parent.children?.length === 0) {
      delete found.parent.children
    }
    return found.node
  }

  private insertDeptNode(node: MockDeptNode, parentId: number) {
    if (parentId <= 0) {
      mockDeptTree.push(node)
      return
    }

    const parent = this.findDeptNode(parentId)?.node
    if (!parent) {
      mockDeptTree.push(node)
      return
    }

    if (!Array.isArray(parent.children)) {
      parent.children = []
    }
    parent.children.push(node)
  }

  private sortDeptTree(nodes: MockDeptNode[]) {
    nodes.sort((a, b) => a.orderNum - b.orderNum || a.deptId - b.deptId)
    for (const node of nodes) {
      if (node.children?.length) {
        this.sortDeptTree(node.children)
      }
    }
  }

  private syncMockUserDeptNames() {
    for (const user of mockUsers) {
      const dept = user.deptId ? findDeptById(user.deptId) : undefined
      user.deptName = dept?.deptName ?? '--'
    }
  }
}