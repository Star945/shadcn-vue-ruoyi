import { Injectable } from '@nestjs/common'

import { createCsvBuffer } from '../../../common/export/csv.util'
import { success, table } from '../../../common/http/ruoyi-response'
import { PrismaService } from '../../../infra/prisma/prisma.service'
import { findDictTypeById, mockDictData, mockDictTypes } from '../../../mock/ruoyi.mock'

@Injectable()
export class DictTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: Record<string, unknown>) {
    const paginate = query.pageNum !== undefined || query.pageSize !== undefined
    const pageNum = this.parsePositiveNumber(query.pageNum, 1)
    const pageSize = this.parsePositiveNumber(query.pageSize, 10)
    const where = {
      ...(query.dictName ? { dictName: { contains: String(query.dictName) } } : {}),
      ...(query.dictType ? { dictType: { contains: String(query.dictType) } } : {}),
      ...(query.status ? { status: String(query.status) } : {}),
    }

    const dbRows = await this.prisma.safeCall(async () => {
      const total = await this.prisma.sysDictType.count({ where })
      const items = await this.prisma.sysDictType.findMany({
        where,
        orderBy: [{ dictId: 'asc' }],
        ...(paginate ? { skip: (pageNum - 1) * pageSize, take: pageSize } : {}),
      })
      return { total, rows: items }
    })

    if (dbRows) {
      return table(dbRows.rows, dbRows.total)
    }

    const rows = mockDictTypes
      .filter((item) => {
        const matchesName = !query.dictName || item.dictName.includes(String(query.dictName))
        const matchesType = !query.dictType || item.dictType.includes(String(query.dictType))
        const matchesStatus = !query.status || item.status === String(query.status)
        return matchesName && matchesType && matchesStatus
      })
      .slice()
      .sort((a, b) => a.dictId - b.dictId)

    return table(paginate ? this.slicePage(rows, pageNum, pageSize) : rows, rows.length)
  }

  async get(dictId: number) {
    const dbRow = await this.prisma.safeCall(() => this.prisma.sysDictType.findUnique({ where: { dictId } }))
    if (dbRow !== undefined) {
      return success(dbRow)
    }
    return success(findDictTypeById(dictId))
  }

  async optionselect() {
    const dbRows = await this.prisma.safeCall(() => this.prisma.sysDictType.findMany({
      where: { status: '0' },
      orderBy: [{ dictId: 'asc' }],
    }))
    if (dbRows !== undefined) {
      return success(dbRows)
    }
    return success(mockDictTypes.filter(item => item.status === '0').slice().sort((a, b) => a.dictId - b.dictId))
  }

  async export(query: Record<string, unknown>) {
    const exportQuery = { ...query }
    delete exportQuery.pageNum
    delete exportQuery.pageSize
    const result = await this.list(exportQuery) as Record<string, any>
    const rows = Array.isArray(result.rows) ? result.rows : []
    return {
      fileName: 'system-dict-type.csv',
      buffer: createCsvBuffer(rows, [
        { key: 'dictId', title: '字典编号' },
        { key: 'dictName', title: '字典名称' },
        { key: 'dictType', title: '字典类型' },
        { key: 'status', title: '状态' },
        { key: 'createTime', title: '创建时间' },
      ]),
    }
  }

  refreshCache() {
    return success(undefined, '字典缓存刷新成功')
  }

  async create(payload: Record<string, unknown>) {
    const created = await this.prisma.safeCall(async () => {
      await this.prisma.sysDictType.create({
        data: {
          dictName: String(payload.dictName ?? ''),
          dictType: String(payload.dictType ?? ''),
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

    const nextDictId = mockDictTypes.reduce((max, item) => Math.max(max, item.dictId), 0) + 1
    mockDictTypes.push({
      dictId: nextDictId,
      dictName: String(payload.dictName ?? ''),
      dictType: String(payload.dictType ?? ''),
      status: String(payload.status ?? '0'),
      createTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
      remark: this.toOptionalString(payload.remark) ?? undefined,
    })
    return success(undefined, '新增成功')
  }

  async update(payload: Record<string, unknown>) {
    const updated = await this.prisma.safeCall(async () => {
      const dictId = Number(payload.dictId)
      const current = await this.prisma.sysDictType.findUnique({ where: { dictId } })
      const nextDictType = String(payload.dictType ?? '')

      await this.prisma.sysDictType.update({
        where: { dictId },
        data: {
          dictName: String(payload.dictName ?? ''),
          dictType: nextDictType,
          status: String(payload.status ?? '0'),
          remark: this.toOptionalString(payload.remark),
          updateTime: new Date(),
        },
      })

      if (current && current.dictType !== nextDictType) {
        await this.prisma.sysDictData.updateMany({
          where: { dictType: current.dictType },
          data: {
            dictType: nextDictType,
            updateTime: new Date(),
          },
        })
      }

      return true
    })

    if (updated) {
      return success(undefined, '修改成功')
    }

    const dictId = Number(payload.dictId)
    const current = mockDictTypes.find(item => item.dictId === dictId)
    const nextDictType = String(payload.dictType ?? current?.dictType ?? '')
    if (current) {
      const previousDictType = current.dictType
      current.dictName = String(payload.dictName ?? current.dictName)
      current.dictType = nextDictType
      current.status = String(payload.status ?? current.status)
      current.remark = this.toOptionalString(payload.remark) ?? undefined
      if (previousDictType !== nextDictType) {
        for (const item of mockDictData) {
          if (item.dictType === previousDictType) {
            item.dictType = nextDictType
          }
        }
      }
    }
    return success(undefined, '修改成功')
  }

  async remove(dictId: number) {
    const removed = await this.prisma.safeCall(async () => {
      const current = await this.prisma.sysDictType.findUnique({ where: { dictId } })
      if (current) {
        await this.prisma.sysDictData.deleteMany({ where: { dictType: current.dictType } })
      }
      await this.prisma.sysDictType.delete({ where: { dictId } })
      return true
    })

    if (removed) {
      return success(undefined, '删除成功')
    }

    const index = mockDictTypes.findIndex(item => item.dictId === dictId)
    if (index >= 0) {
      const current = mockDictTypes[index]
      mockDictTypes.splice(index, 1)
      for (let i = mockDictData.length - 1; i >= 0; i -= 1) {
        if (mockDictData[i].dictType === current.dictType) {
          mockDictData.splice(i, 1)
        }
      }
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