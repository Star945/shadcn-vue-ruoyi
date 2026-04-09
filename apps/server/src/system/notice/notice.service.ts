import { Injectable } from '@nestjs/common'

import { TokenStoreService } from '../../auth/token-store.service'
import { success, table } from '../../common/http/ruoyi-response'
import { PrismaService } from '../../infra/prisma/prisma.service'
import { findNoticeById, mockNotices } from '../../mock/ruoyi.mock'

@Injectable()
export class NoticeService {
  private readonly mockReadState = new Map<number, Set<number>>()

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenStore: TokenStoreService,
  ) {}

  async list(query: Record<string, unknown>) {
    const paginate = query.pageNum !== undefined || query.pageSize !== undefined
    const pageNum = this.parsePositiveNumber(query.pageNum, 1)
    const pageSize = this.parsePositiveNumber(query.pageSize, 10)
    const where = {
      ...(query.noticeTitle ? { noticeTitle: { contains: String(query.noticeTitle) } } : {}),
      ...(query.noticeType ? { noticeType: String(query.noticeType) } : {}),
      ...(query.status ? { status: String(query.status) } : {}),
    }

    const dbRows = await this.prisma.safeCall(async () => {
      const total = await this.prisma.sysNotice.count({ where })
      const items = await this.prisma.sysNotice.findMany({
        where,
        orderBy: [{ noticeId: 'desc' }],
        ...(paginate ? { skip: (pageNum - 1) * pageSize, take: pageSize } : {}),
      })
      return { total, rows: items }
    })

    if (dbRows) {
      return table(dbRows.rows, dbRows.total)
    }

    const rows = mockNotices.filter((item) => {
      const matchesTitle = !query.noticeTitle || item.noticeTitle.includes(String(query.noticeTitle))
      const matchesType = !query.noticeType || item.noticeType === String(query.noticeType)
      const matchesStatus = !query.status || item.status === String(query.status)
      return matchesTitle && matchesType && matchesStatus
    })

    const sortedRows = rows.slice().sort((a, b) => b.noticeId - a.noticeId)
    return table(paginate ? this.slicePage(sortedRows, pageNum, pageSize) : sortedRows, sortedRows.length)
  }

  async get(noticeId: number) {
    const dbRow = await this.prisma.safeCall(() => this.prisma.sysNotice.findUnique({ where: { noticeId } }))
    if (dbRow !== undefined) {
      return success(dbRow)
    }
    return success(findNoticeById(noticeId))
  }

  async listTop(authorization?: string) {
    const userId = this.tokenStore.resolveUserId(authorization)

    const dbDetail = await this.prisma.safeCall(async () => {
      const notices = await this.prisma.sysNotice.findMany({
        where: { status: '0' },
        orderBy: [{ noticeId: 'desc' }],
        take: 8,
      })

      const activeNotices = await this.prisma.sysNotice.findMany({
        where: { status: '0' },
        select: { noticeId: true },
      })

      const readRows = userId
        ? await this.prisma.sysNoticeRead.findMany({ where: { userId } })
        : []
      const readSet = new Set(readRows.map(item => item.noticeId))

      return {
        data: notices.map(item => ({
          ...item,
          isRead: userId ? readSet.has(item.noticeId) : false,
        })),
        unreadCount: userId ? activeNotices.filter(item => !readSet.has(item.noticeId)).length : notices.length,
      }
    })

    if (dbDetail) {
      return {
        code: 200,
        msg: '操作成功',
        data: dbDetail.data,
        unreadCount: dbDetail.unreadCount,
      }
    }

    const readSet = userId ? this.getMockReadSet(userId) : new Set<number>()
    const data = mockNotices
      .filter(item => item.status === '0')
      .slice()
      .sort((a, b) => b.noticeId - a.noticeId)
      .slice(0, 8)
      .map(item => ({
        ...item,
        isRead: userId ? readSet.has(item.noticeId) : false,
      }))

    return {
      code: 200,
      msg: '操作成功',
      data,
      unreadCount: userId ? mockNotices.filter(item => item.status === '0' && !readSet.has(item.noticeId)).length : data.length,
    }
  }

  async markRead(noticeId: number, authorization?: string) {
    const userId = this.tokenStore.resolveUserId(authorization)
    if (!userId || !noticeId) {
      return success(undefined, '已标记为已读')
    }

    const updated = await this.prisma.safeCall(async () => {
      await this.prisma.sysNoticeRead.upsert({
        where: {
          noticeId_userId: {
            noticeId,
            userId,
          },
        },
        create: {
          noticeId,
          userId,
          readTime: new Date(),
        },
        update: {
          readTime: new Date(),
        },
      })
      return true
    })

    if (updated) {
      return success(undefined, '已标记为已读')
    }

    this.getMockReadSet(userId).add(noticeId)
    return success(undefined, '已标记为已读')
  }

  async markReadAll(ids: string, authorization?: string) {
    const userId = this.tokenStore.resolveUserId(authorization)
    if (!userId) {
      return success(undefined, '已全部标记为已读')
    }

    const noticeIds = this.parseIds(ids)

    const updated = await this.prisma.safeCall(async () => {
      let targetIds = noticeIds
      if (!targetIds.length) {
        const active = await this.prisma.sysNotice.findMany({ where: { status: '0' }, select: { noticeId: true } })
        targetIds = active.map(item => item.noticeId)
      }
      if (targetIds.length > 0) {
        await this.prisma.sysNoticeRead.createMany({
          data: targetIds.map(noticeId => ({ noticeId, userId, readTime: new Date() })),
          skipDuplicates: true,
        })
      }
      return true
    })

    if (updated) {
      return success(undefined, '已全部标记为已读')
    }

    const readSet = this.getMockReadSet(userId)
    const targetIds = noticeIds.length > 0 ? noticeIds : mockNotices.filter(item => item.status === '0').map(item => item.noticeId)
    for (const id of targetIds) {
      readSet.add(id)
    }
    return success(undefined, '已全部标记为已读')
  }

  async create(payload: Record<string, unknown>) {
    const created = await this.prisma.safeCall(async () => {
      await this.prisma.sysNotice.create({
        data: {
          noticeTitle: String(payload.noticeTitle ?? ''),
          noticeType: String(payload.noticeType ?? '1'),
          noticeContent: String(payload.noticeContent ?? ''),
          status: String(payload.status ?? '0'),
          createBy: 'admin',
          createTime: new Date(),
        },
      })
      return true
    })

    if (created) {
      return success(undefined, '新增成功')
    }

    const nextNoticeId = mockNotices.reduce((max, item) => Math.max(max, item.noticeId), 0) + 1
    mockNotices.unshift({
      noticeId: nextNoticeId,
      noticeTitle: String(payload.noticeTitle ?? ''),
      noticeType: String(payload.noticeType ?? '1'),
      noticeContent: String(payload.noticeContent ?? ''),
      status: String(payload.status ?? '0'),
      createBy: 'admin',
      createTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
      remark: undefined,
    })
    return success(undefined, '新增成功')
  }

  async update(payload: Record<string, unknown>) {
    const updated = await this.prisma.safeCall(async () => {
      await this.prisma.sysNotice.update({
        where: { noticeId: Number(payload.noticeId) },
        data: {
          noticeTitle: String(payload.noticeTitle ?? ''),
          noticeType: String(payload.noticeType ?? '1'),
          noticeContent: String(payload.noticeContent ?? ''),
          status: String(payload.status ?? '0'),
          updateBy: 'admin',
          updateTime: new Date(),
        },
      })
      return true
    })

    if (updated) {
      return success(undefined, '修改成功')
    }

    const noticeId = Number(payload.noticeId)
    const current = mockNotices.find(item => item.noticeId === noticeId)
    if (current) {
      current.noticeTitle = String(payload.noticeTitle ?? current.noticeTitle)
      current.noticeType = String(payload.noticeType ?? current.noticeType)
      current.noticeContent = String(payload.noticeContent ?? current.noticeContent)
      current.status = String(payload.status ?? current.status)
    }
    return success(undefined, '修改成功')
  }

  async remove(noticeId: number) {
    const removed = await this.prisma.safeCall(async () => {
      await this.prisma.sysNoticeRead.deleteMany({ where: { noticeId } })
      await this.prisma.sysNotice.delete({ where: { noticeId } })
      return true
    })

    if (removed) {
      return success(undefined, '删除成功')
    }

    const index = mockNotices.findIndex(item => item.noticeId === noticeId)
    if (index >= 0) {
      mockNotices.splice(index, 1)
    }
    return success(undefined, '删除成功')
  }

  private parseIds(value: string) {
    return String(value ?? '')
      .split(',')
      .map(item => Number(item.trim()))
      .filter(item => Number.isFinite(item) && item > 0)
  }

  private parsePositiveNumber(value: unknown, fallback: number) {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
  }

  private slicePage<T>(rows: T[], pageNum: number, pageSize: number) {
    const start = (pageNum - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }

  private getMockReadSet(userId: number) {
    let set = this.mockReadState.get(userId)
    if (!set) {
      set = new Set<number>()
      this.mockReadState.set(userId, set)
    }
    return set
  }
}