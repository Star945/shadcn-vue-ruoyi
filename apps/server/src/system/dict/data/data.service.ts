import { Injectable } from '@nestjs/common'

import { createCsvBuffer } from '../../../common/export/csv.util'
import { success, table } from '../../../common/http/ruoyi-response'
import { PrismaService } from '../../../infra/prisma/prisma.service'
import { findDictDataByCode, mockDictData } from '../../../mock/ruoyi.mock'

@Injectable()
export class DictDataService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: Record<string, unknown>) {
    const paginate = query.pageNum !== undefined || query.pageSize !== undefined
    const pageNum = this.parsePositiveNumber(query.pageNum, 1)
    const pageSize = this.parsePositiveNumber(query.pageSize, 10)
    const where = {
      ...(query.dictType ? { dictType: String(query.dictType) } : {}),
      ...(query.dictLabel ? { dictLabel: { contains: String(query.dictLabel) } } : {}),
      ...(query.dictValue ? { dictValue: { contains: String(query.dictValue) } } : {}),
      ...(query.status ? { status: String(query.status) } : {}),
    }

    const dbRows = await this.prisma.safeCall(async () => {
      const total = await this.prisma.sysDictData.count({ where })
      const items = await this.prisma.sysDictData.findMany({
        where,
        orderBy: [{ dictSort: 'asc' }, { dictCode: 'asc' }],
        ...(paginate ? { skip: (pageNum - 1) * pageSize, take: pageSize } : {}),
      })
      return { total, rows: items }
    })

    if (dbRows) {
      return table(dbRows.rows, dbRows.total)
    }

    const rows = mockDictData
      .filter((item) => {
        const matchesType = !query.dictType || item.dictType === String(query.dictType)
        const matchesLabel = !query.dictLabel || item.dictLabel.includes(String(query.dictLabel))
        const matchesValue = !query.dictValue || item.dictValue.includes(String(query.dictValue))
        const matchesStatus = !query.status || item.status === String(query.status)
        return matchesType && matchesLabel && matchesValue && matchesStatus
      })
      .slice()
      .sort((a, b) => a.dictSort - b.dictSort || a.dictCode - b.dictCode)

    return table(paginate ? this.slicePage(rows, pageNum, pageSize) : rows, rows.length)
  }

  async get(dictCode: number) {
    const dbRow = await this.prisma.safeCall(() => this.prisma.sysDictData.findUnique({ where: { dictCode } }))
    if (dbRow !== undefined) {
      return success(dbRow)
    }
    return success(findDictDataByCode(dictCode))
  }

  async export(query: Record<string, unknown>) {
    const exportQuery = { ...query }
    delete exportQuery.pageNum
    delete exportQuery.pageSize
    const result = await this.list(exportQuery) as Record<string, any>
    const rows = Array.isArray(result.rows) ? result.rows : []
    return {
      fileName: 'system-dict-data.csv',
      buffer: createCsvBuffer(rows, [
        { key: 'dictCode', title: '字典编码' },
        { key: 'dictLabel', title: '字典标签' },
        { key: 'dictValue', title: '字典键值' },
        { key: 'dictType', title: '字典类型' },
        { key: 'status', title: '状态' },
        { key: 'createTime', title: '创建时间' },
      ]),
    }
  }

  async create(payload: Record<string, unknown>) {
    const created = await this.prisma.safeCall(async () => {
      await this.prisma.sysDictData.create({
        data: {
          dictSort: this.parseNumber(payload.dictSort, 0),
          dictLabel: String(payload.dictLabel ?? ''),
          dictValue: String(payload.dictValue ?? ''),
          dictType: String(payload.dictType ?? ''),
          cssClass: this.toOptionalString(payload.cssClass),
          listClass: this.toOptionalString(payload.listClass),
          isDefault: String(payload.isDefault ?? 'N'),
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

    const nextDictCode = mockDictData.reduce((max, item) => Math.max(max, item.dictCode), 0) + 1
    mockDictData.push({
      dictCode: nextDictCode,
      dictSort: this.parseNumber(payload.dictSort, 0),
      dictLabel: String(payload.dictLabel ?? ''),
      dictValue: String(payload.dictValue ?? ''),
      dictType: String(payload.dictType ?? ''),
      cssClass: this.toOptionalString(payload.cssClass) ?? undefined,
      listClass: this.toOptionalString(payload.listClass) ?? undefined,
      isDefault: String(payload.isDefault ?? 'N'),
      status: String(payload.status ?? '0'),
      createTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
      remark: this.toOptionalString(payload.remark) ?? undefined,
    })
    return success(undefined, '新增成功')
  }

  async update(payload: Record<string, unknown>) {
    const updated = await this.prisma.safeCall(async () => {
      await this.prisma.sysDictData.update({
        where: { dictCode: Number(payload.dictCode) },
        data: {
          dictSort: this.parseNumber(payload.dictSort, 0),
          dictLabel: String(payload.dictLabel ?? ''),
          dictValue: String(payload.dictValue ?? ''),
          dictType: String(payload.dictType ?? ''),
          cssClass: this.toOptionalString(payload.cssClass),
          listClass: this.toOptionalString(payload.listClass),
          isDefault: String(payload.isDefault ?? 'N'),
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

    const current = mockDictData.find(item => item.dictCode === Number(payload.dictCode))
    if (current) {
      current.dictSort = this.parseNumber(payload.dictSort, current.dictSort)
      current.dictLabel = String(payload.dictLabel ?? current.dictLabel)
      current.dictValue = String(payload.dictValue ?? current.dictValue)
      current.dictType = String(payload.dictType ?? current.dictType)
      current.cssClass = this.toOptionalString(payload.cssClass) ?? undefined
      current.listClass = this.toOptionalString(payload.listClass) ?? undefined
      current.isDefault = String(payload.isDefault ?? current.isDefault)
      current.status = String(payload.status ?? current.status)
      current.remark = this.toOptionalString(payload.remark) ?? undefined
    }
    return success(undefined, '修改成功')
  }

  async remove(dictCode: number) {
    const removed = await this.prisma.safeCall(async () => {
      await this.prisma.sysDictData.delete({ where: { dictCode } })
      return true
    })

    if (removed) {
      return success(undefined, '删除成功')
    }

    const index = mockDictData.findIndex(item => item.dictCode === dictCode)
    if (index >= 0) {
      mockDictData.splice(index, 1)
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