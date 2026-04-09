import { Injectable } from '@nestjs/common'

import { createCsvBuffer } from '../../common/export/csv.util'
import { table, success } from '../../common/http/ruoyi-response'
import { PrismaService } from '../../infra/prisma/prisma.service'
import { mockJobLogs } from '../../mock/monitor.mock'

@Injectable()
export class JobLogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: Record<string, unknown>) {
    const pageNum = this.parseNumber(query.pageNum, 1)
    const pageSize = this.parseNumber(query.pageSize, 10)
    const where = {
      ...(query.jobName ? { jobName: { contains: String(query.jobName) } } : {}),
      ...(query.jobGroup ? { jobGroup: { contains: String(query.jobGroup) } } : {}),
      ...(query.status ? { status: String(query.status) } : {}),
    }

    const dbRows = await this.prisma.safeCall(async () => {
      const [total, items] = await Promise.all([
        this.prisma.sysJobLog.count({ where }),
        this.prisma.sysJobLog.findMany({
          where,
          orderBy: [
            { createTime: 'desc' },
            { jobLogId: 'desc' },
          ],
          skip: (pageNum - 1) * pageSize,
          take: pageSize,
        }),
      ])

      return {
        total,
        rows: items.map(item => ({
          ...item,
          createTime: this.formatDateTime(item.createTime),
        })),
      }
    })

    if (dbRows) {
      return table(dbRows.rows, dbRows.total)
    }

    const rows = mockJobLogs
      .filter((item) => {
        const matchesName = !query.jobName || item.jobName.includes(String(query.jobName))
        const matchesGroup = !query.jobGroup || item.jobGroup.includes(String(query.jobGroup))
        const matchesStatus = !query.status || item.status === String(query.status)
        return matchesName && matchesGroup && matchesStatus
      })
      .slice()
      .sort((left, right) => new Date(right.createTime).getTime() - new Date(left.createTime).getTime())

    return table(this.slicePage(rows, pageNum, pageSize), rows.length)
  }

  async remove(jobLogId: string | number) {
    const ids = this.parseIdList(jobLogId)
    const removed = await this.prisma.safeCall(async () => {
      await this.prisma.sysJobLog.deleteMany({
        where: { jobLogId: { in: ids } },
      })
      return true
    })

    if (!removed) {
      for (const id of ids) {
        const index = mockJobLogs.findIndex(item => item.jobLogId === id)
        if (index >= 0) {
          mockJobLogs.splice(index, 1)
        }
      }
    }

    return success(undefined, '删除成功')
  }

  async clean() {
    const cleaned = await this.prisma.safeCall(async () => {
      await this.prisma.sysJobLog.deleteMany()
      return true
    })

    if (!cleaned) {
      mockJobLogs.splice(0, mockJobLogs.length)
    }

    return success(undefined, '清空成功')
  }

  async export(query: Record<string, unknown>) {
    const result = await this.list({ ...query, pageNum: 1, pageSize: 100000 }) as Record<string, any>
    const rows = Array.isArray(result.rows) ? result.rows : []
    return {
      fileName: 'monitor-job-log.csv',
      buffer: createCsvBuffer(rows, [
        { key: 'jobLogId', title: '日志编号' },
        { key: 'jobName', title: '任务名称' },
        { key: 'jobGroup', title: '任务组名' },
        { key: 'invokeTarget', title: '调用目标' },
        { key: 'jobMessage', title: '日志信息' },
        { key: 'status', title: '状态' },
        { key: 'createTime', title: '创建时间' },
      ]),
    }
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
