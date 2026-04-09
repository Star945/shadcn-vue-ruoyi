import { Injectable } from '@nestjs/common'

import { createCsvBuffer } from '../../common/export/csv.util'
import { table, success } from '../../common/http/ruoyi-response'
import { PrismaService } from '../../infra/prisma/prisma.service'
import { mockJobLogs, mockJobs } from '../../mock/monitor.mock'

@Injectable()
export class JobService {
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
        this.prisma.sysJob.count({ where }),
        this.prisma.sysJob.findMany({
          where,
          orderBy: [
            { jobId: 'asc' },
          ],
          skip: (pageNum - 1) * pageSize,
          take: pageSize,
        }),
      ])

      return {
        total,
        rows: items.map(item => this.mapJob(item)),
      }
    })

    if (dbRows) {
      return table(dbRows.rows, dbRows.total)
    }

    const rows = mockJobs
      .filter((item) => {
        const matchesName = !query.jobName || item.jobName.includes(String(query.jobName))
        const matchesGroup = !query.jobGroup || item.jobGroup.includes(String(query.jobGroup))
        const matchesStatus = !query.status || item.status === String(query.status)
        return matchesName && matchesGroup && matchesStatus
      })
      .slice()
      .sort((left, right) => left.jobId - right.jobId)

    return table(this.slicePage(rows, pageNum, pageSize), rows.length)
  }

  async get(jobId: number) {
    const dbJob = await this.prisma.safeCall(() => this.prisma.sysJob.findUnique({ where: { jobId } }))
    if (dbJob) {
      return success(this.mapJob(dbJob))
    }
    return success(mockJobs.find(item => item.jobId === jobId))
  }

  async create(payload: Record<string, unknown>) {
    const created = await this.prisma.safeCall(async () => {
      await this.prisma.sysJob.create({
        data: {
          jobName: String(payload.jobName ?? ''),
          jobGroup: String(payload.jobGroup ?? 'DEFAULT'),
          invokeTarget: String(payload.invokeTarget ?? ''),
          cronExpression: String(payload.cronExpression ?? ''),
          misfirePolicy: String(payload.misfirePolicy ?? '3'),
          concurrent: String(payload.concurrent ?? '1'),
          status: String(payload.status ?? '0'),
          nextValidTime: this.resolveNextValidTime(payload.nextValidTime),
          createBy: this.toOptionalString(payload.createBy) ?? 'admin',
          createTime: new Date(),
          remark: this.toOptionalString(payload.remark),
        },
      })
      return true
    })

    if (!created) {
      const now = new Date()
      const nextId = Math.max(0, ...mockJobs.map(item => item.jobId)) + 1
      mockJobs.push(this.buildMemoryJob(payload, nextId, undefined, now))
    }

    return success(undefined, '新增成功')
  }

  async update(payload: Record<string, unknown>) {
    const updated = await this.prisma.safeCall(async () => {
      await this.prisma.sysJob.update({
        where: { jobId: Number(payload.jobId) },
        data: {
          jobName: String(payload.jobName ?? ''),
          jobGroup: String(payload.jobGroup ?? 'DEFAULT'),
          invokeTarget: String(payload.invokeTarget ?? ''),
          cronExpression: String(payload.cronExpression ?? ''),
          misfirePolicy: String(payload.misfirePolicy ?? '3'),
          concurrent: String(payload.concurrent ?? '1'),
          status: String(payload.status ?? '0'),
          nextValidTime: this.resolveNextValidTime(payload.nextValidTime),
          updateBy: this.toOptionalString(payload.updateBy) ?? 'admin',
          updateTime: new Date(),
          remark: this.toOptionalString(payload.remark),
        },
      })
      return true
    })

    if (!updated) {
      const target = mockJobs.find(item => item.jobId === Number(payload.jobId))
      if (target) {
        const now = new Date()
        Object.assign(target, this.buildMemoryJob(payload, target.jobId, target, now))
      }
    }

    return success(undefined, '修改成功')
  }

  async remove(jobId: string | number) {
    const ids = this.parseIdList(jobId)
    const removed = await this.prisma.safeCall(async () => {
      await this.prisma.sysJob.deleteMany({
        where: { jobId: { in: ids } },
      })
      return true
    })

    if (!removed) {
      for (const id of ids) {
        const index = mockJobs.findIndex(item => item.jobId === id)
        if (index >= 0) {
          mockJobs.splice(index, 1)
        }
      }
    }

    return success(undefined, '删除成功')
  }

  async changeStatus(payload: Record<string, unknown>) {
    const updated = await this.prisma.safeCall(async () => {
      await this.prisma.sysJob.update({
        where: { jobId: Number(payload.jobId) },
        data: {
          status: String(payload.status ?? '0'),
          updateTime: new Date(),
        },
      })
      return true
    })

    if (!updated) {
      const target = mockJobs.find(item => item.jobId === Number(payload.jobId))
      if (target) {
        target.status = String(payload.status ?? '0')
        target.updateTime = this.formatDateTime(new Date())
      }
    }

    return success(undefined, '状态更新成功')
  }

  async run(payload: Record<string, unknown>) {
    const jobId = Number(payload.jobId)
    const executed = await this.prisma.safeCall(async () => {
      const job = await this.prisma.sysJob.findUnique({
        where: { jobId },
      })

      if (!job) {
        return false
      }

      await this.prisma.sysJobLog.create({
        data: {
          jobName: job.jobName,
          jobGroup: job.jobGroup,
          invokeTarget: job.invokeTarget,
          jobMessage: '执行成功',
          status: '0',
          exceptionInfo: '',
          createTime: new Date(),
        },
      })

      await this.prisma.sysJob.update({
        where: { jobId: job.jobId },
        data: {
          nextValidTime: this.resolveNextValidTime(undefined),
          updateTime: new Date(),
        },
      })

      return true
    })

    if (!executed) {
      const target = mockJobs.find(item => item.jobId === jobId)
      if (target) {
        const now = new Date()
        target.nextValidTime = this.formatDateTime(this.resolveNextValidTime(undefined))
        target.updateTime = this.formatDateTime(now)

        const nextLogId = Math.max(0, ...mockJobLogs.map(item => item.jobLogId)) + 1
        mockJobLogs.unshift({
          jobLogId: nextLogId,
          jobName: target.jobName,
          jobGroup: target.jobGroup,
          invokeTarget: target.invokeTarget,
          jobMessage: '执行成功',
          status: '0',
          exceptionInfo: '',
          createTime: this.formatDateTime(now),
        })
      }
    }

    return success(undefined, '执行成功')
  }

  async export(query: Record<string, unknown>) {
    const result = await this.list({ ...query, pageNum: 1, pageSize: 100000 }) as Record<string, any>
    const rows = Array.isArray(result.rows) ? result.rows : []
    return {
      fileName: 'monitor-job.csv',
      buffer: createCsvBuffer(rows, [
        { key: 'jobId', title: '任务编号' },
        { key: 'jobName', title: '任务名称' },
        { key: 'jobGroup', title: '任务组名' },
        { key: 'invokeTarget', title: '调用目标' },
        { key: 'cronExpression', title: 'Cron 表达式' },
        { key: 'status', title: '状态' },
        { key: 'nextValidTime', title: '下次执行时间' },
      ]),
    }
  }

  private buildMemoryJob(payload: Record<string, unknown>, jobId: number, existing?: any, now = new Date()) {
    return {
      jobId,
      jobName: String(payload.jobName ?? existing?.jobName ?? ''),
      jobGroup: String(payload.jobGroup ?? existing?.jobGroup ?? 'DEFAULT'),
      invokeTarget: String(payload.invokeTarget ?? existing?.invokeTarget ?? ''),
      cronExpression: String(payload.cronExpression ?? existing?.cronExpression ?? ''),
      misfirePolicy: String(payload.misfirePolicy ?? existing?.misfirePolicy ?? '3'),
      concurrent: String(payload.concurrent ?? existing?.concurrent ?? '1'),
      status: String(payload.status ?? existing?.status ?? '0'),
      nextValidTime: this.formatDateTime(this.resolveNextValidTime(payload.nextValidTime ?? existing?.nextValidTime)),
      createBy: String(payload.createBy ?? existing?.createBy ?? 'admin'),
      createTime: String(existing?.createTime ?? this.formatDateTime(now)),
      updateBy: String(payload.updateBy ?? existing?.updateBy ?? 'admin'),
      updateTime: this.formatDateTime(now),
      remark: String(payload.remark ?? existing?.remark ?? ''),
    }
  }

  private mapJob(job: any) {
    return {
      ...job,
      nextValidTime: this.formatDateTime(job.nextValidTime),
      createTime: this.formatDateTime(job.createTime),
      updateTime: this.formatDateTime(job.updateTime),
    }
  }

  private resolveNextValidTime(value: unknown) {
    if (value) {
      const parsed = value instanceof Date ? value : new Date(String(value))
      if (!Number.isNaN(parsed.getTime())) {
        return parsed
      }
    }
    return new Date(Date.now() + 60 * 60 * 1000)
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
