import { Injectable } from '@nestjs/common'

import { createCsvBuffer } from '../../common/export/csv.util'
import { success, table } from '../../common/http/ruoyi-response'
import { PrismaService } from '../../infra/prisma/prisma.service'
import { findConfigById, mockConfigs } from '../../mock/ruoyi.mock'

@Injectable()
export class ConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: Record<string, unknown>) {
    const paginate = query.pageNum !== undefined || query.pageSize !== undefined
    const pageNum = this.parsePositiveNumber(query.pageNum, 1)
    const pageSize = this.parsePositiveNumber(query.pageSize, 10)
    const where = {
      ...(query.configName ? { configName: { contains: String(query.configName) } } : {}),
      ...(query.configKey ? { configKey: { contains: String(query.configKey) } } : {}),
    }

    const dbRows = await this.prisma.safeCall(async () => {
      const total = await this.prisma.sysConfig.count({ where })
      const items = await this.prisma.sysConfig.findMany({
        where,
        orderBy: [{ configId: 'asc' }],
        ...(paginate ? { skip: (pageNum - 1) * pageSize, take: pageSize } : {}),
      })
      return { total, rows: items }
    })

    if (dbRows) {
      return table(dbRows.rows, dbRows.total)
    }

    const rows = mockConfigs
      .filter((item) => {
        const matchesName = !query.configName || item.configName.includes(String(query.configName))
        const matchesKey = !query.configKey || item.configKey.includes(String(query.configKey))
        return matchesName && matchesKey
      })
      .slice()
      .sort((a, b) => a.configId - b.configId)

    return table(paginate ? this.slicePage(rows, pageNum, pageSize) : rows, rows.length)
  }

  async get(configId: number) {
    const dbRow = await this.prisma.safeCall(() => this.prisma.sysConfig.findUnique({ where: { configId } }))
    if (dbRow !== undefined) {
      return success(dbRow)
    }
    return success(findConfigById(configId))
  }

  async export(query: Record<string, unknown>) {
    const exportQuery = { ...query }
    delete exportQuery.pageNum
    delete exportQuery.pageSize
    const result = await this.list(exportQuery) as Record<string, any>
    const rows = Array.isArray(result.rows) ? result.rows : []
    return {
      fileName: 'system-config.csv',
      buffer: createCsvBuffer(rows, [
        { key: 'configId', title: '参数编号' },
        { key: 'configName', title: '参数名称' },
        { key: 'configKey', title: '参数键名' },
        { key: 'configValue', title: '参数键值' },
        { key: 'configType', title: '系统内置' },
        { key: 'createTime', title: '创建时间' },
      ]),
    }
  }

  refreshCache() {
    return success(undefined, '参数缓存刷新成功')
  }

  async create(payload: Record<string, unknown>) {
    const created = await this.prisma.safeCall(async () => {
      await this.prisma.sysConfig.create({
        data: {
          configName: String(payload.configName ?? ''),
          configKey: String(payload.configKey ?? ''),
          configValue: String(payload.configValue ?? ''),
          configType: String(payload.configType ?? 'N'),
          remark: this.toOptionalString(payload.remark),
          createTime: new Date(),
        },
      })
      return true
    })

    if (created) {
      return success(undefined, '新增成功')
    }

    const nextConfigId = mockConfigs.reduce((max, item) => Math.max(max, item.configId), 0) + 1
    mockConfigs.push({
      configId: nextConfigId,
      configName: String(payload.configName ?? ''),
      configKey: String(payload.configKey ?? ''),
      configValue: String(payload.configValue ?? ''),
      configType: String(payload.configType ?? 'N'),
      createTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
      remark: this.toOptionalString(payload.remark) ?? undefined,
    })
    return success(undefined, '新增成功')
  }

  async update(payload: Record<string, unknown>) {
    const updated = await this.prisma.safeCall(async () => {
      await this.prisma.sysConfig.update({
        where: { configId: Number(payload.configId) },
        data: {
          configName: String(payload.configName ?? ''),
          configKey: String(payload.configKey ?? ''),
          configValue: String(payload.configValue ?? ''),
          configType: String(payload.configType ?? 'N'),
          remark: this.toOptionalString(payload.remark),
          updateTime: new Date(),
        },
      })
      return true
    })

    if (updated) {
      return success(undefined, '修改成功')
    }

    const current = mockConfigs.find(item => item.configId === Number(payload.configId))
    if (current) {
      current.configName = String(payload.configName ?? current.configName)
      current.configKey = String(payload.configKey ?? current.configKey)
      current.configValue = String(payload.configValue ?? current.configValue)
      current.configType = String(payload.configType ?? current.configType)
      current.remark = this.toOptionalString(payload.remark) ?? undefined
    }
    return success(undefined, '修改成功')
  }

  async remove(configId: number) {
    const removed = await this.prisma.safeCall(async () => {
      await this.prisma.sysConfig.delete({ where: { configId } })
      return true
    })

    if (removed) {
      return success(undefined, '删除成功')
    }

    const index = mockConfigs.findIndex(item => item.configId === configId)
    if (index >= 0) {
      mockConfigs.splice(index, 1)
    }
    return success(undefined, '删除成功')
  }

  private toOptionalString(value: unknown) {
    const text = String(value ?? '').trim()
    return text ? text : null
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