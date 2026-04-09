import { Injectable } from '@nestjs/common'

import { createCsvBuffer } from '../../common/export/csv.util'
import { table, success } from '../../common/http/ruoyi-response'
import { PrismaService } from '../../infra/prisma/prisma.service'
import { mockOperLogs } from '../../mock/monitor.mock'

@Injectable()
export class OperlogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: Record<string, unknown>) {
    const pageNum = this.parseNumber(query.pageNum, 1)
    const pageSize = this.parseNumber(query.pageSize, 10)
    const where = this.buildWhere(query)

    const dbRows = await this.prisma.safeCall(async () => {
      const [total, items] = await Promise.all([
        this.prisma.sysOperLog.count({ where }),
        this.prisma.sysOperLog.findMany({
          where,
          orderBy: [
            { operTime: 'desc' },
            { operId: 'desc' },
          ],
          skip: (pageNum - 1) * pageSize,
          take: pageSize,
        }),
      ])

      return {
        total,
        rows: items.map(item => ({
          ...item,
          operTime: this.formatDateTime(item.operTime),
        })),
      }
    })

    if (dbRows) {
      return table(dbRows.rows, dbRows.total)
    }

    const rows = mockOperLogs.filter((item) => {
      const matchesTitle = !query.title || item.title.includes(String(query.title))
      const matchesOperName = !query.operName || item.operName.includes(String(query.operName))
      const matchesOperIp = !query.operIp || item.operIp.includes(String(query.operIp))
      const matchesBusinessType = !query.businessType || String(item.businessType) === String(query.businessType)
      const matchesStatus = !query.status || String(item.status) === String(query.status)
      return matchesTitle && matchesOperName && matchesOperIp && matchesBusinessType && matchesStatus
    })

    return table(this.slicePage(rows, pageNum, pageSize), rows.length)
  }

  async record(payload: Record<string, unknown>) {
    const created = await this.prisma.safeCall(async () => {
      await this.prisma.sysOperLog.create({
        data: {
          title: this.toOptionalString(payload.title),
          businessType: this.parseNumber(payload.businessType, 0),
          method: this.toOptionalString(payload.method),
          requestMethod: this.toOptionalString(payload.requestMethod),
          operName: this.toOptionalString(payload.operName),
          deptName: this.toOptionalString(payload.deptName),
          operUrl: this.toOptionalString(payload.operUrl),
          operIp: this.toOptionalString(payload.operIp),
          operLocation: this.toOptionalString(payload.operLocation),
          operParam: this.toOptionalString(payload.operParam),
          jsonResult: this.toOptionalString(payload.jsonResult),
          status: this.parseNumber(payload.status, 0),
          errorMsg: this.toOptionalString(payload.errorMsg),
          operTime: this.parseDate(payload.operTime) ?? new Date(),
          costTime: this.parseNumber(payload.costTime, 0),
        },
      })
      return true
    })

    if (created) {
      return success(undefined)
    }

    const nextId = Math.max(0, ...mockOperLogs.map(item => item.operId)) + 1
    mockOperLogs.unshift({
      operId: nextId,
      title: String(payload.title ?? '系统操作'),
      businessType: this.parseNumber(payload.businessType, 0),
      businessTypeName: '',
      operName: String(payload.operName ?? 'anonymous'),
      operIp: String(payload.operIp ?? ''),
      operLocation: String(payload.operLocation ?? '内网'),
      status: this.parseNumber(payload.status, 0),
      costTime: this.parseNumber(payload.costTime, 0),
      operTime: this.formatDateTime(payload.operTime),
      method: this.toOptionalString(payload.method) ?? '',
      operParam: this.toOptionalString(payload.operParam) ?? '',
      jsonResult: this.toOptionalString(payload.jsonResult) ?? this.toOptionalString(payload.errorMsg) ?? '',
    })
    return success(undefined)
  }

  async remove(operId: string | number) {
    const ids = this.parseIdList(operId)
    const removed = await this.prisma.safeCall(async () => {
      await this.prisma.sysOperLog.deleteMany({
        where: { operId: { in: ids } },
      })
      return true
    })

    if (!removed) {
      for (const id of ids) {
        const index = mockOperLogs.findIndex(item => item.operId === id)
        if (index >= 0) {
          mockOperLogs.splice(index, 1)
        }
      }
    }

    return success(undefined, '删除成功')
  }

  async clean() {
    const cleaned = await this.prisma.safeCall(async () => {
      await this.prisma.sysOperLog.deleteMany()
      return true
    })

    if (!cleaned) {
      mockOperLogs.splice(0, mockOperLogs.length)
    }

    return success(undefined, '清空成功')
  }

  async export(query: Record<string, unknown>) {
    const result = await this.list({ ...query, pageNum: 1, pageSize: 100000 }) as Record<string, any>
    const rows = Array.isArray(result.rows) ? result.rows : []
    return {
      fileName: 'monitor-operlog.csv',
      buffer: createCsvBuffer(rows, [
        { key: 'operId', title: '日志编号' },
        { key: 'title', title: '系统模块' },
        { key: 'businessType', title: '业务类型' },
        { key: 'operName', title: '操作人员' },
        { key: 'operIp', title: '操作地址' },
        { key: 'status', title: '状态' },
        { key: 'costTime', title: '耗时' },
        { key: 'operTime', title: '操作时间' },
      ]),
    }
  }

  private buildWhere(query: Record<string, unknown>) {
    const operTime = this.buildDateRange(query)
    return {
      ...(query.title ? { title: { contains: String(query.title) } } : {}),
      ...(query.operName ? { operName: { contains: String(query.operName) } } : {}),
      ...(query.operIp ? { operIp: { contains: String(query.operIp) } } : {}),
      ...(query.businessType ? { businessType: Number(query.businessType) } : {}),
      ...(query.status ? { status: Number(query.status) } : {}),
      ...(operTime ? { operTime } : {}),
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
    const date = value instanceof Date ? value : new Date(String(value))
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
    return Number.isFinite(parsed) ? parsed : fallback
  }

  private toOptionalString(value: unknown) {
    const text = String(value ?? '').trim()
    return text ? text : null
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