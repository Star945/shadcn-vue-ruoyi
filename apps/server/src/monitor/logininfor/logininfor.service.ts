import { Injectable } from '@nestjs/common'

import { createCsvBuffer } from '../../common/export/csv.util'
import { table, success } from '../../common/http/ruoyi-response'
import { PrismaService } from '../../infra/prisma/prisma.service'
import { mockLoginLogs } from '../../mock/monitor.mock'

@Injectable()
export class LogininforService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: Record<string, unknown>) {
    const pageNum = this.parseNumber(query.pageNum, 1)
    const pageSize = this.parseNumber(query.pageSize, 10)
    const where = this.buildWhere(query)

    const dbRows = await this.prisma.safeCall(async () => {
      const [total, items] = await Promise.all([
        this.prisma.sysLogininfor.count({ where }),
        this.prisma.sysLogininfor.findMany({
          where,
          orderBy: [
            { loginTime: 'desc' },
            { infoId: 'desc' },
          ],
          skip: (pageNum - 1) * pageSize,
          take: pageSize,
        }),
      ])

      return {
        total,
        rows: items.map(item => ({
          ...item,
          loginTime: this.formatDateTime(item.loginTime),
        })),
      }
    })

    if (dbRows) {
      return table(dbRows.rows, dbRows.total)
    }

    const rows = mockLoginLogs
      .filter((item) => {
        const matchesUser = !query.userName || item.userName.includes(String(query.userName))
        const matchesStatus = !query.status || item.status === String(query.status)
        const matchesIp = !query.ipaddr || item.ipaddr.includes(String(query.ipaddr))
        return matchesUser && matchesStatus && matchesIp
      })
      .slice()
      .sort((left, right) => new Date(right.loginTime).getTime() - new Date(left.loginTime).getTime())

    return table(this.slicePage(rows, pageNum, pageSize), rows.length)
  }

  unlock(_userName: string) {
    return success(undefined, '解锁成功')
  }

  async remove(infoId: string | number) {
    const ids = this.parseIdList(infoId)
    const removed = await this.prisma.safeCall(async () => {
      await this.prisma.sysLogininfor.deleteMany({
        where: { infoId: { in: ids } },
      })
      return true
    })

    if (!removed) {
      for (const id of ids) {
        const index = mockLoginLogs.findIndex(item => item.infoId === id)
        if (index >= 0) {
          mockLoginLogs.splice(index, 1)
        }
      }
    }

    return success(undefined, '删除成功')
  }

  async clean() {
    const cleaned = await this.prisma.safeCall(async () => {
      await this.prisma.sysLogininfor.deleteMany()
      return true
    })

    if (!cleaned) {
      mockLoginLogs.splice(0, mockLoginLogs.length)
    }

    return success(undefined, '清空成功')
  }

  async export(query: Record<string, unknown>) {
    const result = await this.list({ ...query, pageNum: 1, pageSize: 100000 }) as Record<string, any>
    const rows = Array.isArray(result.rows) ? result.rows : []
    return {
      fileName: 'monitor-logininfor.csv',
      buffer: createCsvBuffer(rows, [
        { key: 'infoId', title: '日志编号' },
        { key: 'userName', title: '用户名称' },
        { key: 'ipaddr', title: '登录地址' },
        { key: 'loginLocation', title: '登录地点' },
        { key: 'browser', title: '浏览器' },
        { key: 'os', title: '操作系统' },
        { key: 'status', title: '状态' },
        { key: 'msg', title: '消息' },
        { key: 'loginTime', title: '登录时间' },
      ]),
    }
  }

  private buildWhere(query: Record<string, unknown>) {
    const loginTime = this.buildDateRange(query)
    return {
      ...(query.userName ? { userName: { contains: String(query.userName) } } : {}),
      ...(query.status ? { status: String(query.status) } : {}),
      ...(query.ipaddr ? { ipaddr: { contains: String(query.ipaddr) } } : {}),
      ...(loginTime ? { loginTime } : {}),
    }
  }

  private buildDateRange(query: Record<string, unknown>) {
    const begin = this.parseDate(query['params[beginTime]'])
    const end = this.parseDate(query['params[endTime]'])
    if (!begin && !end) {
      return undefined
    }
    return {
      ...(begin ? { gte: begin } : {}),
      ...(end ? { lte: end } : {}),
    }
  }

  private parseDate(value: unknown) {
    if (!value) {
      return undefined
    }
    const date = new Date(String(value))
    return Number.isNaN(date.getTime()) ? undefined : date
  }

  private parseIdList(value: unknown) {
    return String(value ?? '')
      .split(',')
      .map(item => Number(item.trim()))
      .filter(item => Number.isFinite(item) && item > 0)
  }

  private parseNumber(value: unknown, fallback: number) {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
  }

  private slicePage(rows: any[], pageNum: number, pageSize: number) {
    const start = (pageNum - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }

  private formatDateTime(value: unknown) {
    if (!value) {
      return ''
    }
    const date = value instanceof Date ? value : new Date(String(value))
    if (Number.isNaN(date.getTime())) {
      return String(value)
    }
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
}
