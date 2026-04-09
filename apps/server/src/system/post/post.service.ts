import { Injectable } from '@nestjs/common'

import { createCsvBuffer } from '../../common/export/csv.util'
import { success, table } from '../../common/http/ruoyi-response'
import { PrismaService } from '../../infra/prisma/prisma.service'
import { findPostById, mockPosts } from '../../mock/ruoyi.mock'

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: Record<string, unknown>) {
    const paginate = query.pageNum !== undefined || query.pageSize !== undefined
    const pageNum = this.parsePositiveNumber(query.pageNum, 1)
    const pageSize = this.parsePositiveNumber(query.pageSize, 10)
    const where = {
      ...(query.postName ? { postName: { contains: String(query.postName) } } : {}),
      ...(query.postCode ? { postCode: { contains: String(query.postCode) } } : {}),
      ...(query.status ? { status: String(query.status) } : {}),
    }

    const dbRows = await this.prisma.safeCall(async () => {
      const total = await this.prisma.sysPost.count({ where })
      const items = await this.prisma.sysPost.findMany({
        where,
        orderBy: [
          { postSort: 'asc' },
          { postId: 'asc' },
        ],
        ...(paginate ? { skip: (pageNum - 1) * pageSize, take: pageSize } : {}),
      })
      return { total, rows: items }
    })

    if (dbRows) {
      return table(dbRows.rows, dbRows.total)
    }

    const rows = mockPosts
      .filter((post) => {
        const matchesName = !query.postName || post.postName.includes(String(query.postName))
        const matchesCode = !query.postCode || post.postCode.includes(String(query.postCode))
        const matchesStatus = !query.status || post.status === String(query.status)
        return matchesName && matchesCode && matchesStatus
      })
      .slice()
      .sort((a, b) => (a.postSort ?? 0) - (b.postSort ?? 0) || a.postId - b.postId)

    return table(paginate ? this.slicePage(rows, pageNum, pageSize) : rows, rows.length)
  }

  async get(postId: number) {
    const dbPost = await this.prisma.safeCall(() => this.prisma.sysPost.findUnique({ where: { postId } }))
    if (dbPost !== undefined) {
      return success(dbPost)
    }

    return success(findPostById(postId))
  }

  async optionselect() {
    const dbRows = await this.prisma.safeCall(() => this.prisma.sysPost.findMany({
      where: { status: '0' },
      orderBy: [
        { postSort: 'asc' },
        { postId: 'asc' },
      ],
    }))

    if (dbRows !== undefined) {
      return success(dbRows)
    }

    return success(
      mockPosts
        .filter(item => item.status === '0')
        .slice()
        .sort((a, b) => (a.postSort ?? 0) - (b.postSort ?? 0) || a.postId - b.postId),
    )
  }

  async export(query: Record<string, unknown>) {
    const exportQuery = { ...query }
    delete exportQuery.pageNum
    delete exportQuery.pageSize
    const result = await this.list(exportQuery) as Record<string, any>
    const rows = Array.isArray(result.rows) ? result.rows : []
    return {
      fileName: 'system-post.csv',
      buffer: createCsvBuffer(rows, [
        { key: 'postId', title: '岗位编号' },
        { key: 'postCode', title: '岗位编码' },
        { key: 'postName', title: '岗位名称' },
        { key: 'postSort', title: '显示顺序' },
        { key: 'status', title: '状态' },
        { key: 'createTime', title: '创建时间' },
      ]),
    }
  }

  async create(payload: Record<string, unknown>) {
    const created = await this.prisma.safeCall(async () => {
      await this.prisma.sysPost.create({
        data: {
          postCode: String(payload.postCode ?? ''),
          postName: String(payload.postName ?? ''),
          postSort: this.parseNumber(payload.postSort, 0),
          status: String(payload.status ?? '0'),
          remark: this.toOptionalString(payload.remark),
          createTime: new Date(),
        },
      })
      return true
    })

    if (created) {
      return success(undefined, '新增成功')
    }

    const nextPostId = mockPosts.reduce((max, item) => Math.max(max, item.postId), 0) + 1
    mockPosts.push({
      postId: nextPostId,
      postCode: String(payload.postCode ?? ''),
      postName: String(payload.postName ?? ''),
      postSort: this.parseNumber(payload.postSort, 0),
      status: String(payload.status ?? '0'),
      remark: this.toOptionalString(payload.remark) ?? undefined,
      createTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    return success(undefined, '新增成功')
  }

  async update(payload: Record<string, unknown>) {
    const updated = await this.prisma.safeCall(async () => {
      await this.prisma.sysPost.update({
        where: { postId: Number(payload.postId) },
        data: {
          postCode: String(payload.postCode ?? ''),
          postName: String(payload.postName ?? ''),
          postSort: this.parseNumber(payload.postSort, 0),
          status: String(payload.status ?? '0'),
          remark: this.toOptionalString(payload.remark),
          updateTime: new Date(),
        },
      })
      return true
    })

    if (updated) {
      return success(undefined, '修改成功')
    }

    const current = mockPosts.find(item => item.postId === Number(payload.postId))
    if (current) {
      current.postCode = String(payload.postCode ?? current.postCode)
      current.postName = String(payload.postName ?? current.postName)
      current.postSort = this.parseNumber(payload.postSort, current.postSort ?? 0)
      current.status = String(payload.status ?? current.status)
      current.remark = this.toOptionalString(payload.remark) ?? undefined
    }
    return success(undefined, '修改成功')
  }

  async remove(postId: number) {
    const removed = await this.prisma.safeCall(async () => {
      await this.prisma.sysUserPost.deleteMany({ where: { postId } })
      await this.prisma.sysPost.delete({ where: { postId } })
      return true
    })

    if (removed) {
      return success(undefined, '删除成功')
    }

    const index = mockPosts.findIndex(item => item.postId === postId)
    if (index >= 0) {
      mockPosts.splice(index, 1)
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

  private parsePositiveNumber(value: unknown, fallback: number) {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
  }

  private slicePage<T>(rows: T[], pageNum: number, pageSize: number) {
    const start = (pageNum - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }
}